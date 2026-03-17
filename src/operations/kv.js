import { wrapError, DatabaseManagerError, ErrorCodes } from '../utils/errors.js';

/**
 * Simple key-value operations for a single store
 * Data shape: { [keyPath]: key, v: value }
 */
export function createKVOperations(connection, storeName, keyPath) {
  return {
    async get(key) {
      const db = connection.getDB();
      return new Promise((resolve, reject) => {
        const txn = db.transaction(storeName, 'readonly');
        const request = txn.objectStore(storeName).get(key);

        request.onsuccess = () => {
          const result = request.result;
          resolve(result && result.v !== undefined ? result.v : null);
        };

        request.onerror = () => {
          reject(wrapError('Error getting value from IndexedDB', request.error));
        };
      });
    },

    async set(key, value) {
      if (typeof key !== 'string' || key.trim() === '') {
        throw new DatabaseManagerError('Invalid key: must be non-empty string', ErrorCodes.INVALID_KEY);
      }
      if (value === undefined) {
        throw new DatabaseManagerError('Value cannot be undefined', ErrorCodes.INVALID_VALUE);
      }

      const db = connection.getDB();
      return new Promise((resolve, reject) => {
        const txn = db.transaction(storeName, 'readwrite');
        txn.oncomplete = () => resolve();
        txn.onerror = () => reject(wrapError('Error setting value in IndexedDB', txn.error));

        txn.objectStore(storeName).put({ [keyPath]: key, v: value });
      });
    },

    async delete(key) {
      const db = connection.getDB();
      return new Promise((resolve, reject) => {
        const txn = db.transaction(storeName, 'readwrite');
        const request = txn.objectStore(storeName).delete(key);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(wrapError('Error deleting value from IndexedDB', request.error));
      });
    },

    async list() {
      const db = connection.getDB();
      return new Promise((resolve, reject) => {
        const request = db.transaction(storeName, 'readonly').objectStore(storeName).getAllKeys();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(wrapError('Error listing keys from IndexedDB', request.error));
      });
    },

    async getAll() {
      const db = connection.getDB();
      return new Promise((resolve, reject) => {
        const request = db.transaction(storeName, 'readonly').objectStore(storeName).getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(wrapError('Error getting all values from IndexedDB', request.error));
      });
    },

    async clear() {
      const db = connection.getDB();
      return new Promise((resolve, reject) => {
        const request = db.transaction(storeName, 'readwrite').objectStore(storeName).clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(wrapError('Error clearing object store in IndexedDB', request.error));
      });
    },

    async setAll(entries) {
      if (!Array.isArray(entries)) {
        throw new DatabaseManagerError('Entries must be an array', ErrorCodes.INVALID_VALUE);
      }

      const db = connection.getDB();
      return new Promise((resolve, reject) => {
        const txn = db.transaction(storeName, 'readwrite');
        txn.oncomplete = () => resolve();
        txn.onerror = () => reject(wrapError('Error setting values in IndexedDB', txn.error));

        const store = txn.objectStore(storeName);
        for (const { key, value } of entries) {
          if (typeof key !== 'string' || key.trim() === '') {
            reject(new DatabaseManagerError('Invalid key in entries', ErrorCodes.INVALID_KEY));
            return;
          }
          if (value === undefined) {
            reject(new DatabaseManagerError('Value cannot be undefined in entries', ErrorCodes.INVALID_VALUE));
            return;
          }
          store.put({ [keyPath]: key, v: value });
        }
      });
    },
  };
}
