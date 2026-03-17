/**
 * Applies schema definition to database during upgrade
 * Creates stores and indexes that don't exist
 * @param {IDBDatabase} db
 * @param {IDBTransaction} transaction
 * @param {object} schema - { version, stores: [{ name, keyPath, autoIncrement?, indexes? }] }
 */
export function applySchema(db, transaction, schema) {
  if (!schema?.stores || !Array.isArray(schema.stores)) {
    return;
  }

  for (const storeDef of schema.stores) {
    const { name, keyPath, autoIncrement = false, indexes = [] } = storeDef;

    if (!name || !keyPath) {
      continue;
    }

    let store;
    if (db.objectStoreNames.contains(name)) {
      store = transaction.objectStore(name);
    } else {
      store = db.createObjectStore(name, { keyPath, autoIncrement });
    }

    for (const idx of indexes) {
      const idxName = idx.name || idx.keyPath;
      const idxKeyPath = idx.keyPath || idx.name;
      const unique = !!idx.unique;

      if (idxName && idxKeyPath && !store.indexNames.contains(idxName)) {
        store.createIndex(idxName, idxKeyPath, { unique });
      }
    }
  }
}
