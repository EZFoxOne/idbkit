import { describe, it, expect, afterEach } from 'vitest';
import { DatabaseManager } from '../src/index.js';

describe('Schema - Extended', () => {
  let db;

  afterEach(() => {
    db?.close();
  });

  it('migration adds index to existing store', async () => {
    const dbName = 'mig-index-' + Date.now();

    const db1 = new DatabaseManager({
      databaseName: dbName,
      version: 1,
      schema: {
        version: 1,
        stores: [{ name: 'items', keyPath: 'id', indexes: [] }],
      },
    });
    await db1.init();
    await db1.set('i1', 'v1');
    db1.close();

    db = new DatabaseManager({
      databaseName: dbName,
      version: 2,
      schema: {
        version: 2,
        stores: [
          { name: 'items', keyPath: 'id', indexes: [{ name: 'status', keyPath: 'status', unique: false }] },
        ],
      },
      migrations: [
        (database, transaction) => {
          const store = transaction.objectStore('items');
          if (!store.indexNames.contains('status')) {
            store.createIndex('status', 'status', { unique: false });
          }
        },
      ],
    });
    await db.init();
    expect(await db.get('i1')).toBe('v1');
  });

  it('handles schema with no indexes', async () => {
    db = new DatabaseManager({
      databaseName: 'no-idx-' + Date.now(),
      version: 1,
      schema: {
        version: 1,
        stores: [{ name: 'plain', keyPath: 'id', indexes: [] }],
      },
    });
    await db.init();
    await db.set('x', 1);
    expect(await db.get('x')).toBe(1);
  });
});
