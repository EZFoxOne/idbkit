import { wrapError } from '../utils/errors.js';
import { buildKeyRange } from '../utils/keyRange.js';

/**
 * Create store-scoped API with get, set, put, delete, count, clear, getAll, getKeys, getRange, index, iterate
 */
export function createStoreAPI(connection, storeName, keyPath) {
  function getDB() {
    return connection.getDB();
  }

  const store = {
    async get(key) {
      const db = getDB();
      return new Promise((resolve, reject) => {
        const request = db.transaction(storeName, 'readonly').objectStore(storeName).get(key);
        request.onsuccess = () => resolve(request.result ?? null);
        request.onerror = () => reject(wrapError('Error getting from store', request.error));
      });
    },

    async set(key, value) {
      const db = getDB();
      const record = typeof value === 'object' && value !== null && !Array.isArray(value)
        ? { [keyPath]: key, ...value }
        : { [keyPath]: key, value };
      return new Promise((resolve, reject) => {
        const txn = db.transaction(storeName, 'readwrite');
        txn.oncomplete = () => resolve();
        txn.onerror = () => reject(wrapError('Error setting in store', txn.error));
        txn.objectStore(storeName).put(record);
      });
    },

    async put(value) {
      const db = getDB();
      return new Promise((resolve, reject) => {
        const txn = db.transaction(storeName, 'readwrite');
        txn.oncomplete = () => resolve();
        txn.onerror = () => reject(wrapError('Error putting in store', txn.error));
        txn.objectStore(storeName).put(value);
      });
    },

    async delete(key) {
      const db = getDB();
      return new Promise((resolve, reject) => {
        const request = db.transaction(storeName, 'readwrite').objectStore(storeName).delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(wrapError('Error deleting from store', request.error));
      });
    },

    async count(rangeOptions) {
      const db = getDB();
      const range = buildKeyRange(rangeOptions);
      return new Promise((resolve, reject) => {
        const storeObj = db.transaction(storeName, 'readonly').objectStore(storeName);
        const request = range ? storeObj.count(range) : storeObj.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(wrapError('Error counting store', request.error));
      });
    },

    async clear() {
      const db = getDB();
      return new Promise((resolve, reject) => {
        const request = db.transaction(storeName, 'readwrite').objectStore(storeName).clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(wrapError('Error clearing store', request.error));
      });
    },

    async getAll(rangeOptions) {
      const db = getDB();
      const range = buildKeyRange(rangeOptions);
      return new Promise((resolve, reject) => {
        const storeObj = db.transaction(storeName, 'readonly').objectStore(storeName);
        const request = range ? storeObj.getAll(range) : storeObj.getAll();
        request.onsuccess = () => resolve(request.result ?? []);
        request.onerror = () => reject(wrapError('Error getting all from store', request.error));
      });
    },

    async getKeys(rangeOptions) {
      const db = getDB();
      const range = buildKeyRange(rangeOptions);
      return new Promise((resolve, reject) => {
        const storeObj = db.transaction(storeName, 'readonly').objectStore(storeName);
        const request = range ? storeObj.getAllKeys(range) : storeObj.getAllKeys();
        request.onsuccess = () => resolve(request.result ?? []);
        request.onerror = () => reject(wrapError('Error getting keys from store', request.error));
      });
    },

    async getRange(rangeOptions) {
      return this.getAll(rangeOptions);
    },

    index(indexName) {
      return createIndexAPI(connection, storeName, indexName);
    },

    iterate(options = {}, callback) {
      if (typeof options === 'function') {
        callback = options;
        options = {};
      }
      return createStoreIterator(connection, storeName, options, callback);
    },
  };

  return store;
}

/**
 * Index-scoped API: get, getAll, getKeys, count
 */
function createIndexAPI(connection, storeName, indexName) {
  function getDB() {
    return connection.getDB();
  }

  return {
    async get(key) {
      const db = getDB();
      return new Promise((resolve, reject) => {
        const request = db
          .transaction(storeName, 'readonly')
          .objectStore(storeName)
          .index(indexName)
          .get(key);
        request.onsuccess = () => resolve(request.result ?? null);
        request.onerror = () => reject(wrapError('Error getting from index', request.error));
      });
    },

    async getAll(rangeOptions) {
      const db = getDB();
      const range = buildKeyRange(rangeOptions);
      return new Promise((resolve, reject) => {
        const indexObj = db.transaction(storeName, 'readonly').objectStore(storeName).index(indexName);
        const request = range ? indexObj.getAll(range) : indexObj.getAll();
        request.onsuccess = () => resolve(request.result ?? []);
        request.onerror = () => reject(wrapError('Error getting all from index', request.error));
      });
    },

    async getKeys(rangeOptions) {
      const db = getDB();
      const range = buildKeyRange(rangeOptions);
      return new Promise((resolve, reject) => {
        const indexObj = db.transaction(storeName, 'readonly').objectStore(storeName).index(indexName);
        const request = range ? indexObj.getAllKeys(range) : indexObj.getAllKeys();
        request.onsuccess = () => resolve(request.result ?? []);
        request.onerror = () => reject(wrapError('Error getting keys from index', request.error));
      });
    },

    async count(rangeOptions) {
      const db = getDB();
      const range = buildKeyRange(rangeOptions);
      return new Promise((resolve, reject) => {
        const indexObj = db.transaction(storeName, 'readonly').objectStore(storeName).index(indexName);
        const request = range ? indexObj.count(range) : indexObj.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(wrapError('Error counting index', request.error));
      });
    },
  };
}

/**
 * Async iterator or callback-based iteration over store
 */
function createStoreIterator(connection, storeName, options, callback) {
  const { range: rangeOptions, direction = 'next' } = options;

  if (callback) {
    return iterateWithCallback(connection, storeName, rangeOptions, direction, callback);
  }

  return {
    [Symbol.asyncIterator]() {
      return iterateAsync(connection, storeName, rangeOptions, direction);
    },
  };
}

function iterateWithCallback(connection, storeName, rangeOptions, direction, callback) {
  const db = connection.getDB();
  const range = buildKeyRange(rangeOptions);

  return new Promise((resolve, reject) => {
    const txn = db.transaction(storeName, 'readonly');
    const storeObj = txn.objectStore(storeName);
    const request = range
      ? storeObj.openCursor(range, direction)
      : storeObj.openCursor(null, direction);

    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        const result = callback(cursor.primaryKey, cursor.value);
        if (result && typeof result.then === 'function') {
          result.then(() => {
            cursor.continue();
          }).catch(reject);
        } else {
          cursor.continue();
        }
      } else {
        resolve();
      }
    };

    request.onerror = () => reject(wrapError('Error iterating store', request.error));
  });
}

async function* iterateAsync(connection, storeName, rangeOptions, direction) {
  const db = connection.getDB();
  const range = buildKeyRange(rangeOptions);

  const items = await new Promise((resolve, reject) => {
    const txn = db.transaction(storeName, 'readonly');
    const storeObj = txn.objectStore(storeName);
    const request = range
      ? storeObj.openCursor(range, direction)
      : storeObj.openCursor(null, direction);

    const collected = [];

    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        collected.push([cursor.primaryKey, cursor.value]);
        cursor.continue();
      } else {
        resolve(collected);
      }
    };

    request.onerror = () => reject(wrapError('Error iterating store', request.error));
  });

  for (const item of items) {
    yield item;
  }
}
