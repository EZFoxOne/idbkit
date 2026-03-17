import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseManager } from '../src/index.js';

describe('DatabaseManager - Schema & Migrations', () => {
  const dbName = 'schema-db-' + Date.now();

  afterEach(() => {
    db?.close();
  });

  let db;

  describe('schema mode', () => {
    it('creates stores and indexes from schema', async () => {
      db = new DatabaseManager({
        databaseName: dbName + '-1',
        version: 1,
        schema: {
          version: 1,
          stores: [
            {
              name: 'users',
              keyPath: 'id',
              autoIncrement: true,
              indexes: [
                { name: 'email', keyPath: 'email', unique: true },
                { name: 'createdAt', keyPath: 'createdAt', unique: false },
              ],
            },
            {
              name: 'cache',
              keyPath: 'key',
              indexes: [{ name: 'expiresAt', keyPath: 'expiresAt', unique: false }],
            },
          ],
        },
      });

      await db.init();
      await db.set('test-key', 'test-value');
      expect(await db.get('test-key')).toBe('test-value');
    });

    it('defaults to first store when storeName not specified', async () => {
      db = new DatabaseManager({
        databaseName: dbName + '-2',
        version: 1,
        schema: {
          version: 1,
          stores: [
            { name: 'primary', keyPath: 'k', indexes: [] },
            { name: 'secondary', keyPath: 'k', indexes: [] },
          ],
        },
      });

      await db.init();
      // Should use 'primary' (first store)
      await db.set('x', 1);
      expect(await db.get('x')).toBe(1);
    });
  });

  describe('migrations', () => {
    it('runs migrations on version upgrade', async () => {
      const dbNameMig = dbName + '-mig';
      const db1 = new DatabaseManager({
        databaseName: dbNameMig,
        version: 1,
        schema: {
          version: 1,
          stores: [{ name: 'data', keyPath: 'id', indexes: [] }],
        },
      });
      await db1.init();
      await db1.set('v1', 'ok');
      db1.close();

      db = new DatabaseManager({
        databaseName: dbNameMig,
        version: 2,
        schema: {
          version: 2,
          stores: [
            { name: 'data', keyPath: 'id', indexes: [] },
            { name: 'sessions', keyPath: 'id', indexes: [] },
          ],
        },
        migrations: [
          (database, transaction, { fromVersion, toVersion }) => {
            if (fromVersion < 2 && !database.objectStoreNames.contains('sessions')) {
              database.createObjectStore('sessions', { keyPath: 'id' });
            }
          },
        ],
      });

      await db.init();
      expect(await db.get('v1')).toBe('ok');
    });
  });
});
