import { wrapError, ErrorCodes, DatabaseManagerError } from '../utils/errors.js';

/**
 * Get the IndexedDB implementation (browser or test environment)
 */
function getIndexedDB() {
  const win = typeof globalThis !== 'undefined' ? globalThis : {};
  return win.indexedDB || win.mozIndexedDB || win.webkitIndexedDB || win.msIndexedDB;
}

/**
 * Manages a single IndexedDB connection with version change and blocked handling
 */
export class Connection {
  /**
   * @param {string} databaseName
   * @param {number} version
   * @param {object} [callbacks]
   * @param {() => void} [callbacks.onVersionChange] - Called when another tab upgraded; connection will close
   * @param {() => void} [callbacks.onBlocked] - Called when our upgrade is blocked by other tabs
   */
  constructor(databaseName, version, callbacks = {}) {
    this.databaseName = databaseName;
    this.version = version;
    this.onVersionChange = callbacks.onVersionChange || (() => {});
    this.onBlocked = callbacks.onBlocked || (() => {});

    this._db = null;
    this._openPromise = null;
    this._closed = false;
  }

  /**
   * Open the database. Reuses existing connection if already open.
   * @returns {Promise<IDBDatabase>}
   */
  open() {
    if (this._db && !this._closed) {
      return Promise.resolve(this._db);
    }

    if (this._openPromise) {
      return this._openPromise;
    }

    const idb = getIndexedDB();
    if (!idb) {
      return Promise.reject(
        new DatabaseManagerError('IndexedDB is not supported', ErrorCodes.NOT_SUPPORTED)
      );
    }

    this._openPromise = new Promise((resolve, reject) => {
      const request = idb.open(this.databaseName, this.version);

      request.onsuccess = () => {
        this._db = request.result;
        this._closed = false;
        this._openPromise = null;

        this._db.onversionchange = () => {
          this._db.close();
          this._db = null;
          this._closed = true;
          this._openPromise = null;
          this.onVersionChange();
        };

        resolve(this._db);
      };

      request.onerror = () => {
        this._openPromise = null;
        reject(wrapError('Failed to open database', request.error));
      };

      request.onblocked = () => {
        this.onBlocked();
      };
    });

    return this._openPromise;
  }

  /**
   * Open with upgrade handler for creating stores/indexes
   * @param {(db: IDBDatabase, transaction: IDBTransaction) => void} onUpgrade
   * @returns {Promise<IDBDatabase>}
   */
  openWithUpgrade(onUpgrade) {
    if (this._db && !this._closed) {
      return Promise.resolve(this._db);
    }

    if (this._openPromise) {
      return this._openPromise;
    }

    const idb = getIndexedDB();
    if (!idb) {
      return Promise.reject(
        new DatabaseManagerError('IndexedDB is not supported', ErrorCodes.NOT_SUPPORTED)
      );
    }

    this._openPromise = new Promise((resolve, reject) => {
      const request = idb.open(this.databaseName, this.version);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        const transaction = event.target.transaction;
        const oldVersion = event.oldVersion;
        const newVersion = event.newVersion ?? db.version;
        onUpgrade(db, transaction, { oldVersion, newVersion });
      };

      request.onsuccess = () => {
        this._db = request.result;
        this._closed = false;
        this._openPromise = null;

        this._db.onversionchange = () => {
          this._db.close();
          this._db = null;
          this._closed = true;
          this._openPromise = null;
          this.onVersionChange();
        };

        resolve(this._db);
      };

      request.onerror = () => {
        this._openPromise = null;
        reject(wrapError('Failed to open database', request.error));
      };

      request.onblocked = () => {
        this.onBlocked();
      };
    });

    return this._openPromise;
  }

  /**
   * Get the current database instance. Throws if not connected.
   * @returns {IDBDatabase}
   */
  getDB() {
    if (!this._db || this._closed) {
      throw new DatabaseManagerError('Database not connected', ErrorCodes.UNKNOWN);
    }
    return this._db;
  }

  /**
   * Check if connection is open
   */
  isOpen() {
    return !!this._db && !this._closed;
  }

  /**
   * Close the connection
   */
  close() {
    if (this._db) {
      this._db.close();
      this._db = null;
    }
    this._closed = true;
    this._openPromise = null;
  }
}
