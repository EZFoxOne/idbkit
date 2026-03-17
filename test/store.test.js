import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseManager } from '../src/index.js';

describe('DatabaseManager - Store & Query API', () => {
  let db;

  afterEach(() => {
    db?.close();
  });

  describe('store()', () => {
    it('returns store-scoped API', async () => {
      db = new DatabaseManager({
        databaseName: 'store-db-' + Date.now(),
        version: 1,
        schema: {
          version: 1,
          stores: [
            { name: 'items', keyPath: 'id', indexes: [{ name: 'category', keyPath: 'category', unique: false }] },
          ],
        },
      });
      await db.init();

      const store = db.store('items');
      await store.set('a', { name: 'Item A', category: 'x' });
      const got = await store.get('a');
      expect(got.id).toBe('a');
      expect(got.name).toBe('Item A');
    });

    it('supports getRange and getAll', async () => {
      db = new DatabaseManager({
        databaseName: 'store-db-range-' + Date.now(),
        version: 1,
        schema: {
          version: 1,
          stores: [{ name: 'data', keyPath: 'k', indexes: [] }],
        },
      });
      await db.init();

      const store = db.store('data');
      await store.set(1, 'one');
      await store.set(2, 'two');
      await store.set(3, 'three');
      await store.set(5, 'five');

      const all = await store.getAll();
      expect(all.length).toBe(4);

      const rangeResult = await store.getRange({ from: 1, to: 3 });
      expect(rangeResult.length).toBeGreaterThanOrEqual(1);
    });

    it('supports count', async () => {
      db = new DatabaseManager({
        databaseName: 'store-db-count-' + Date.now(),
        version: 1,
        schema: { version: 1, stores: [{ name: 'n', keyPath: 'k', indexes: [] }] },
      });
      await db.init();

      const store = db.store('n');
      await store.set('1', 1);
      await store.set('2', 2);
      expect(await store.count()).toBe(2);
    });

    it('supports index().get()', async () => {
      db = new DatabaseManager({
        databaseName: 'store-db-index-' + Date.now(),
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
      await store.put({ id: '1', email: 'alice@test.com', name: 'Alice' });

      const byEmail = await store.index('email').get('alice@test.com');
      expect(byEmail.email).toBe('alice@test.com');
      expect(byEmail.name).toBe('Alice');
    });

    it('supports async iteration', async () => {
      db = new DatabaseManager({
        databaseName: 'store-db-iter-' + Date.now(),
        version: 1,
        schema: { version: 1, stores: [{ name: 'x', keyPath: 'k', indexes: [] }] },
      });
      await db.init();

      const store = db.store('x');
      await store.set('a', 1);
      await store.set('b', 2);

      const pairs = [];
      for await (const [key, value] of store.iterate()) {
        pairs.push([key, value]);
      }
      expect(pairs.length).toBe(2);
      expect(pairs.map((p) => p[0]).sort()).toEqual(['a', 'b']);
    });
  });

  describe('transaction()', () => {
    it('runs multiple operations in one transaction', async () => {
      db = new DatabaseManager({
        databaseName: 'store-db-txn-' + Date.now(),
        version: 1,
        schema: {
          version: 1,
          stores: [
            { name: 'users', keyPath: 'id', indexes: [] },
            { name: 'sessions', keyPath: 'id', indexes: [] },
          ],
        },
      });
      await db.init();

      await db.transaction(['users', 'sessions'], 'readwrite', async (tx) => {
        await tx.store('users').set('u1', { name: 'User 1' });
        await tx.store('sessions').set('s1', { userId: 'u1', token: 'abc' });
      });

      const user = await db.store('users').get('u1');
      const session = await db.store('sessions').get('s1');
      expect(user.name).toBe('User 1');
      expect(session.userId).toBe('u1');
    });
  });
});
