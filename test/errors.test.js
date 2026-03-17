import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseManager, DatabaseManagerError, ErrorCodes } from '../src/index.js';

describe('Error Handling', () => {
  let db;

  beforeEach(() => {
    db = new DatabaseManager('error-db-' + Date.now(), 1, 's', 'k');
  });

  afterEach(() => {
    db?.close();
  });

  describe('DatabaseManagerError', () => {
    it('has correct name and code', async () => {
      await db.init();
      try {
        await db.set('', 'value');
      } catch (e) {
        expect(e).toBeInstanceOf(DatabaseManagerError);
        expect(e.name).toBe('DatabaseManagerError');
        expect(e.code).toBe(ErrorCodes.INVALID_KEY);
        expect(e.message).toContain('Invalid key');
      }
    });

    it('INVALID_VALUE for undefined', async () => {
      await db.init();
      try {
        await db.set('key', undefined);
      } catch (e) {
        expect(e.code).toBe(ErrorCodes.INVALID_VALUE);
      }
    });

    it('INVALID_VALUE for setAll non-array', async () => {
      await db.init();
      try {
        await db.setAll('not an array');
      } catch (e) {
        expect(e.code).toBe(ErrorCodes.INVALID_VALUE);
        expect(e.message).toContain('array');
      }
    });

    it('rejects operations after close', async () => {
      await db.init();
      db.close();
      await expect(db.get('x')).rejects.toThrow('closed');
      await expect(db.set('x', 1)).rejects.toThrow('closed');
      await expect(db.init()).rejects.toThrow('closed');
    });

    it('rejects init when already closed', async () => {
      await db.init();
      db.close();
      await expect(db.init()).rejects.toThrow();
    });
  });

  describe('transaction errors', () => {
    it('throws for invalid store name in transaction', async () => {
      db = new DatabaseManager({
        databaseName: 'tx-err-' + Date.now(),
        version: 1,
        schema: {
          version: 1,
          stores: [{ name: 'a', keyPath: 'id', indexes: [] }],
        },
      });
      await db.init();

      await expect(
        db.transaction(['a'], 'readwrite', async (tx) => {
          tx.store('nonexistent');
        })
      ).rejects.toThrow('not in transaction');
    });
  });

  describe('unique constraint', () => {
    it('rejects duplicate unique index value', async () => {
      db = new DatabaseManager({
        databaseName: 'constraint-db-' + Date.now(),
        version: 1,
        schema: {
          version: 1,
          stores: [
            { name: 'users', keyPath: 'id', indexes: [{ name: 'email', keyPath: 'email', unique: true }] },
          ],
        },
      });
      await db.init();

      const store = db.store('users');
      await store.put({ id: '1', email: 'same@test.com' });

      await expect(store.put({ id: '2', email: 'same@test.com' })).rejects.toThrow();
    });
  });
});
