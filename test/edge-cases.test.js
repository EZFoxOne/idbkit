import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseManager } from '../src/index.js';

describe('Edge Cases', () => {
  let db;

  afterEach(() => {
    db?.close();
  });

  describe('setAll', () => {
    it('handles empty array', async () => {
      db = new DatabaseManager('setall-empty-' + Date.now(), 1, 's', 'k');
      await db.init();
      await expect(db.setAll([])).resolves.toBeUndefined();
      expect(await db.list()).toEqual([]);
    });

    it('handles single entry', async () => {
      db = new DatabaseManager('setall-one-' + Date.now(), 1, 's', 'k');
      await db.init();
      await db.setAll([{ key: 'only', value: 1 }]);
      expect(await db.get('only')).toBe(1);
    });

    it('rejects non-array', async () => {
      db = new DatabaseManager('setall-err-' + Date.now(), 1, 's', 'k');
      await db.init();
      await expect(db.setAll(null)).rejects.toThrow();
      await expect(db.setAll({})).rejects.toThrow();
    });
  });

  describe('concurrent operations', () => {
    it('handles parallel get/set', async () => {
      db = new DatabaseManager('concurrent-' + Date.now(), 1, 's', 'k');
      await db.init();

      await Promise.all([
        db.set('a', 1),
        db.set('b', 2),
        db.set('c', 3),
      ]);

      const [a, b, c] = await Promise.all([
        db.get('a'),
        db.get('b'),
        db.get('c'),
      ]);
      expect(a).toBe(1);
      expect(b).toBe(2);
      expect(c).toBe(3);
    });
  });

  describe('key validation', () => {
    it('rejects non-string key', async () => {
      db = new DatabaseManager('key-err-' + Date.now(), 1, 's', 'k');
      await db.init();
      await expect(db.set(123, 'v')).rejects.toThrow();
      await expect(db.set(null, 'v')).rejects.toThrow();
    });
  });

  describe('store isolation', () => {
    it('keeps stores separate in schema mode', async () => {
      db = new DatabaseManager({
        databaseName: 'isolate-' + Date.now(),
        version: 1,
        schema: {
          version: 1,
          stores: [
            { name: 'store1', keyPath: 'k', indexes: [] },
            { name: 'store2', keyPath: 'k', indexes: [] },
          ],
        },
      });
      await db.init();

      await db.store('store1').set('x', 1);
      await db.store('store2').set('x', 2);

      expect(await db.store('store1').get('x')).toEqual(expect.objectContaining({ k: 'x', value: 1 }));
      expect(await db.store('store2').get('x')).toEqual(expect.objectContaining({ k: 'x', value: 2 }));
    });
  });

  describe('backward compatible constructor', () => {
    it('works with positional args and defaults', async () => {
      db = new DatabaseManager();
      await db.init();
      await db.set('default', 'works');
      expect(await db.get('default')).toBe('works');
    });

    it('works with 2 args', async () => {
      db = new DatabaseManager('minimal-db', 1);
      await db.init();
      await db.set('x', 1);
      expect(await db.get('x')).toBe(1);
    });
  });
});
