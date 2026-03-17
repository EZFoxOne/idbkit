import { wrapError } from '../utils/errors.js';
import { buildKeyRange } from '../utils/keyRange.js';

/**
 * Create a transaction context with store-scoped operations that use the given transaction
 */
export function createTransactionContext(transaction, storeNames) {
  const txn = transaction;

  function createTxStore(storeName) {
    if (!storeNames.includes(storeName)) {
      throw new Error(`Store '${storeName}' is not in transaction`);
    }

    const storeObj = txn.objectStore(storeName);
    const keyPath = storeObj.keyPath || 'id';

    return {
      async get(key) {
        return new Promise((resolve, reject) => {
          const request = storeObj.get(key);
          request.onsuccess = () => resolve(request.result ?? null);
          request.onerror = () => reject(wrapError('Error getting from store', request.error));
        });
      },

      async set(key, value) {
        return new Promise((resolve, reject) => {
          const record = typeof value === 'object' && value !== null && !Array.isArray(value)
            ? { [keyPath]: key, ...value }
            : { [keyPath]: key, value };
          const request = storeObj.put(record);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(wrapError('Error setting in store', request.error));
        });
      },

      async put(value) {
        return new Promise((resolve, reject) => {
          const request = storeObj.put(value);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(wrapError('Error putting in store', request.error));
        });
      },

      async delete(key) {
        return new Promise((resolve, reject) => {
          const request = storeObj.delete(key);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(wrapError('Error deleting from store', request.error));
        });
      },
    };
  }

  return {
    store(name) {
      return createTxStore(name);
    },
  };
}

/**
 * Run a transaction and wait for it to complete
 */
export function runTransaction(db, storeNames, mode, callback) {
  const txn = db.transaction(storeNames, mode);
  const tx = createTransactionContext(txn, storeNames);

  return new Promise((resolve, reject) => {
    const run = async () => {
      try {
        const result = await callback(tx);
        txn.oncomplete = () => resolve(result);
        txn.onerror = () => reject(wrapError('Transaction failed', txn.error));
      } catch (err) {
        txn.abort();
        reject(err);
      }
    };

    run();
  });
}
