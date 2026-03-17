import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseManager } from '../src/index.js';

describe('DatabaseManager', () => {
  let db;

  beforeEach(() => {
    db = new DatabaseManager('test-db-' + Date.now(), 1, 'testStore', 'k');
  });

  afterEach(() => {
    db?.close();
  });

  describe('init', () => {
    it('initializes and creates store', async () => {
      await db.init();
      expect(db).toBeDefined();
    });

    it('is idempotent', async () => {
      await db.init();
      await db.init();
      await db.set('a', 1);
      expect(await db.get('a')).toBe(1);
    });
  });

  describe('get/set', () => {
    it('sets and gets a value', async () => {
      await db.init();
      await db.set('username', 'john');
      expect(await db.get('username')).toBe('john');
    });

    it('returns null for missing key', async () => {
      await db.init();
      expect(await db.get('nonexistent')).toBeNull();
    });

    it('overwrites existing value', async () => {
      await db.init();
      await db.set('x', 1);
      await db.set('x', 2);
      expect(await db.get('x')).toBe(2);
    });

    it('rejects undefined value', async () => {
      await db.init();
      await expect(db.set('key', undefined)).rejects.toThrow();
    });

    it('rejects invalid key', async () => {
      await db.init();
      await expect(db.set('', 'v')).rejects.toThrow();
      await expect(db.set('   ', 'v')).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('deletes a key', async () => {
      await db.init();
      await db.set('del', 'me');
      await db.delete('del');
      expect(await db.get('del')).toBeNull();
    });

    it('succeeds for non-existent key', async () => {
      await db.init();
      await expect(db.delete('nonexistent')).resolves.toBeUndefined();
    });
  });

  describe('list', () => {
    it('returns all keys', async () => {
      await db.init();
      await db.set('a', 1);
      await db.set('b', 2);
      const keys = await db.list();
      expect(keys).toContain('a');
      expect(keys).toContain('b');
      expect(keys.length).toBe(2);
    });

    it('returns empty array when store is empty', async () => {
      await db.init();
      expect(await db.list()).toEqual([]);
    });
  });

  describe('getAll', () => {
    it('returns all entries', async () => {
      await db.init();
      await db.set('a', 1);
      await db.set('b', 2);
      const entries = await db.getAll();
      expect(entries.length).toBe(2);
      const keys = entries.map((e) => e.k);
      expect(keys).toContain('a');
      expect(keys).toContain('b');
    });
  });

  describe('clear', () => {
    it('clears all entries', async () => {
      await db.init();
      await db.set('a', 1);
      await db.set('b', 2);
      await db.clear();
      expect(await db.list()).toEqual([]);
      expect(await db.get('a')).toBeNull();
    });
  });

  describe('setAll', () => {
    it('sets multiple entries', async () => {
      await db.init();
      await db.setAll([
        { key: 'name', value: 'Alice' },
        { key: 'age', value: 30 },
      ]);
      expect(await db.get('name')).toBe('Alice');
      expect(await db.get('age')).toBe(30);
    });

    it('rejects invalid entries', async () => {
      await db.init();
      await expect(db.setAll([{ key: '', value: 'x' }])).rejects.toThrow();
      await expect(db.setAll([{ key: 'k', value: undefined }])).rejects.toThrow();
    });
  });

  describe('config object constructor', () => {
    it('accepts config object', async () => {
      const db2 = new DatabaseManager({
        databaseName: 'config-db-' + Date.now(),
        version: 1,
        storeName: 's',
        keyPath: 'k',
      });
      await db2.init();
      await db2.set('test', 'ok');
      expect(await db2.get('test')).toBe('ok');
      db2.close();
    });
  });

  describe('isSupported', () => {
    it('returns true in environment with IndexedDB', () => {
      expect(DatabaseManager.isSupported()).toBe(true);
    });
  });

  describe('close', () => {
    it('closes connection', async () => {
      await db.init();
      db.close();
      await expect(db.get('x')).rejects.toThrow();
    });
  });
});
