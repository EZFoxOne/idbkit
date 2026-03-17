import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseManager } from '../src/index.js';

describe('Store API - Extended', () => {
  let db;

  afterEach(() => {
    db?.close();
  });

  describe('index operations', () => {
    it('index.count returns correct count', async () => {
      db = new DatabaseManager({
        databaseName: 'idx-count-' + Date.now(),
        version: 1,
        schema: {
          version: 1,
          stores: [
            { name: 'items', keyPath: 'id', indexes: [{ name: 'status', keyPath: 'status', unique: false }] },
          ],
        },
      });
      await db.init();

      const store = db.store('items');
      await store.put({ id: '1', status: 'active' });
      await store.put({ id: '2', status: 'active' });
      await store.put({ id: '3', status: 'done' });

      expect(await store.index('status').count()).toBe(3);
      expect(await store.index('status').count({ only: 'active' })).toBe(2);
      expect(await store.index('status').count({ only: 'done' })).toBe(1);
    });

    it('index.getAll returns by index', async () => {
      db = new DatabaseManager({
        databaseName: 'idx-getall-' + Date.now(),
        version: 1,
        schema: {
          version: 1,
          stores: [
            { name: 'items', keyPath: 'id', indexes: [{ name: 'tag', keyPath: 'tag', unique: false }] },
          ],
        },
      });
      await db.init();

      const store = db.store('items');
      await store.put({ id: '1', tag: 'a' });
      await store.put({ id: '2', tag: 'a' });
      await store.put({ id: '3', tag: 'b' });

      const byTagA = await store.index('tag').getAll({ only: 'a' });
      expect(byTagA.length).toBe(2);
    });
  });

  describe('iterate', () => {
    it('iterate with direction prev', async () => {
      db = new DatabaseManager({
        databaseName: 'iter-prev-' + Date.now(),
        version: 1,
        schema: { version: 1, stores: [{ name: 'x', keyPath: 'k', indexes: [] }] },
      });
      await db.init();

      const store = db.store('x');
      await store.set('a', 1);
      await store.set('b', 2);
      await store.set('c', 3);

      const keys = [];
      for await (const [key] of store.iterate({ direction: 'prev' })) {
        keys.push(key);
      }
      expect(keys).toEqual(['c', 'b', 'a']);
    });

    it('iterate over empty store', async () => {
      db = new DatabaseManager({
        databaseName: 'iter-empty-' + Date.now(),
        version: 1,
        schema: { version: 1, stores: [{ name: 'x', keyPath: 'k', indexes: [] }] },
      });
      await db.init();

      const store = db.store('x');
      const items = [];
      for await (const item of store.iterate()) {
        items.push(item);
      }
      expect(items).toEqual([]);
    });

    it('iterate with callback form', async () => {
      db = new DatabaseManager({
        databaseName: 'iter-cb-' + Date.now(),
        version: 1,
        schema: { version: 1, stores: [{ name: 'x', keyPath: 'k', indexes: [] }] },
      });
      await db.init();

      const store = db.store('x');
      await store.set('a', 1);
      await store.set('b', 2);

      const collected = [];
      await store.iterate((key, value) => {
        collected.push([key, value]);
      });
      expect(collected.length).toBe(2);
    });
  });

  describe('store.put with primitive', () => {
    it('put stores value with keyPath', async () => {
      db = new DatabaseManager({
        databaseName: 'put-prim-' + Date.now(),
        version: 1,
        schema: { version: 1, stores: [{ name: 'x', keyPath: 'id', indexes: [] }] },
      });
      await db.init();

      const store = db.store('x');
      await store.set('k1', 42);
      const got = await store.get('k1');
      expect(got).toMatchObject({ id: 'k1', value: 42 });
    });
  });

  describe('getRange', () => {
    it('getRange with only', async () => {
      db = new DatabaseManager({
        databaseName: 'range-only-' + Date.now(),
        version: 1,
        schema: { version: 1, stores: [{ name: 'x', keyPath: 'k', indexes: [] }] },
      });
      await db.init();

      const store = db.store('x');
      await store.set('a', 1);
      await store.set('b', 2);

      const result = await store.getRange({ only: 'a' });
      expect(result.length).toBe(1);
      expect(result[0].k).toBe('a');
    });

    it('getRange with lowerBound (from only)', async () => {
      db = new DatabaseManager({
        databaseName: 'range-lower-' + Date.now(),
        version: 1,
        schema: { version: 1, stores: [{ name: 'x', keyPath: 'k', indexes: [] }] },
      });
      await db.init();

      const store = db.store('x');
      await store.set(1, 'a');
      await store.set(2, 'b');
      await store.set(3, 'c');

      const result = await store.getRange({ from: 2 });
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('getRange with upperBound (to only)', async () => {
      db = new DatabaseManager({
        databaseName: 'range-upper-' + Date.now(),
        version: 1,
        schema: { version: 1, stores: [{ name: 'x', keyPath: 'k', indexes: [] }] },
      });
      await db.init();

      const store = db.store('x');
      await store.set(1, 'a');
      await store.set(2, 'b');

      const result = await store.getRange({ to: 2 });
      expect(result.length).toBeGreaterThanOrEqual(1);
    });
  });
});
