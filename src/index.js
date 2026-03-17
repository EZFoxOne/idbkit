import { Connection } from './core/connection.js';
import { applySchema } from './core/schema.js';
import { runMigrations } from './core/migrations.js';
import { createKVOperations } from './operations/kv.js';
import { createStoreAPI } from './operations/store.js';
import { runTransaction } from './operations/transaction.js';
import { DatabaseManagerError, ErrorCodes } from './utils/errors.js';
import { withRetry } from './utils/retry.js';

/**
 * DatabaseManager - A robust IndexedDB wrapper
 *
 * Simple mode (backward compatible):
 *   new DatabaseManager('myDb', 1, 'myStore', 'key')
 *   new DatabaseManager({ databaseName, version, storeName, keyPath })
 */
export class DatabaseManager {
  /**
   * @param {string|object} databaseNameOrConfig - Database name or full config object
   * @param {number} [version] - DB version (simple mode)
   * @param {string} [storeName] - Store name (simple mode)
   * @param {string} [keyPath] - Key path (simple mode)
   */
  constructor(databaseNameOrConfig = 'ldb', version = 1, storeName = 's', keyPath = 'k') {
    let databaseName, store, key;

    if (typeof databaseNameOrConfig === 'object') {
      const config = databaseNameOrConfig;
      databaseName = config.databaseName ?? 'ldb';
      version = config.version ?? 1;
      const schema = config.schema;
      const migrations = config.migrations;

      // Schema mode: default store to first store if not specified
      if (schema?.stores?.length) {
        store = config.storeName ?? schema.stores[0].name;
        key = config.keyPath ?? schema.stores[0].keyPath;
      } else {
        store = config.storeName ?? 's';
        key = config.keyPath ?? 'k';
      }

      this._schema = schema;
      this._migrations = migrations;
      this._retries = config.retries;
      this._debug = !!config.debug;
    } else {
      databaseName = databaseNameOrConfig;
      store = storeName;
      key = keyPath;
      this._schema = null;
      this._migrations = null;
      this._retries = null;
      this._debug = false;
    }

    this.databaseName = databaseName;
    this.version = version;
    this.storeName = store;
    this.keyPath = key;

    this._connection = new Connection(databaseName, version, {
      onVersionChange: () => this._handleVersionChange?.(),
      onBlocked: () => this._handleBlocked?.(),
    });

    this._kv = createKVOperations(this._connection, this.storeName, this.keyPath);
    this._initPromise = null;
    this._closed = false;
    this._storeKeyPaths = this._buildStoreKeyPaths();
  }

  _buildStoreKeyPaths() {
    const map = { [this.storeName]: this.keyPath };
    if (this._schema?.stores) {
      for (const s of this._schema.stores) {
        map[s.name] = s.keyPath;
      }
    }
    return map;
  }

  /**
   * Optional: Set callback when another tab upgrades the database
   * @param {() => void} fn
   */
  onVersionChange(fn) {
    this._handleVersionChange = fn;
  }

  /**
   * Optional: Set callback when our upgrade is blocked by other tabs
   * @param {() => void} fn
   */
  onBlocked(fn) {
    this._handleBlocked = fn;
  }

  _log(...args) {
    if (this._debug) {
      console.log('[DatabaseManager]', ...args);
    }
  }

  /**
   * Initialize the database. Creates store if needed. Idempotent.
   * @returns {Promise<void>}
   */
  init() {
    if (this._closed) {
      return Promise.reject(new DatabaseManagerError('Database is closed', ErrorCodes.UNKNOWN));
    }

    if (this._initPromise) {
      return this._initPromise;
    }

    const doInit = () => {
      this._log('init', this.databaseName, this.version);
      return this._connection.openWithUpgrade((db, transaction, { oldVersion, newVersion } = {}) => {
        if (this._schema) {
          applySchema(db, transaction, this._schema);
        }
        if (this._migrations?.length) {
          runMigrations(db, transaction, oldVersion ?? 0, newVersion ?? this.version, this._migrations);
        }
        if (!this._schema && !db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: this.keyPath });
        }
      });
    };

    this._initPromise = this._retries ? withRetry(doInit, this._retries) : doInit();
    return this._initPromise;
  }

  /**
   * Ensure DB is ready. Calls init() if not yet initialized.
   * @private
   */
  async _ensureReady() {
    await this.init();
  }

  // --- Simple KV API (Layer 1) ---

  async get(key) {
    await this._ensureReady();
    return this._kv.get(key);
  }

  async set(key, value) {
    await this._ensureReady();
    return this._kv.set(key, value);
  }

  async delete(key) {
    await this._ensureReady();
    return this._kv.delete(key);
  }

  async list() {
    await this._ensureReady();
    return this._kv.list();
  }

  async getAll() {
    await this._ensureReady();
    return this._kv.getAll();
  }

  async clear() {
    await this._ensureReady();
    return this._kv.clear();
  }

  async setAll(entries) {
    await this._ensureReady();
    return this._kv.setAll(entries);
  }

  // --- Store API (Layer 2) ---

  /**
   * Get store-scoped API for the given store name
   * @param {string} name - Store name
   * @returns {object} Store API with get, set, put, delete, count, clear, getAll, getKeys, getRange, index, iterate
   */
  store(name) {
    const keyPath = this._storeKeyPaths[name] ?? 'id';
    return createStoreAPI(this._connection, name, keyPath);
  }

  /**
   * Run multiple operations in a single transaction
   * @param {string[]} storeNames - Store names to include
   * @param {'readonly'|'readwrite'} mode
   * @param {(tx: { store: (name: string) => object }) => Promise<any>} callback
   * @returns {Promise<any>}
   */
  async transaction(storeNames, mode, callback) {
    await this._ensureReady();
    const db = this._connection.getDB();
    return runTransaction(db, storeNames, mode, callback);
  }

  // --- Utility ---

  static isSupported() {
    if (typeof globalThis === 'undefined') return false;
    const idb = globalThis.indexedDB || globalThis.mozIndexedDB || globalThis.webkitIndexedDB || globalThis.msIndexedDB;
    return !!idb;
  }

  close() {
    this._closed = true;
    this._connection.close();
    this._initPromise = null;
  }

  /**
   * Get storage usage estimate (if navigator.storage.estimate is available)
   * @returns {Promise<{ usage?: number, quota?: number } | null>}
   */
  async getStorageEstimate() {
    if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      return { usage: est.usage, quota: est.quota };
    }
    return null;
  }

  /**
   * Request persistent storage (if navigator.storage.persist is available)
   * @returns {Promise<boolean>}
   */
  async requestPersistence() {
    if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
      return navigator.storage.persist();
    }
    return false;
  }
}

// Re-export for consumers
export { DatabaseManagerError, ErrorCodes } from './utils/errors.js';

// Backward compatible: browser global (for script tag usage)
if (typeof window !== 'undefined') {
  window.DatabaseManager = DatabaseManager;
  window.databaseManager = new DatabaseManager();
}
