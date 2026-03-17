import { describe, it, expect, afterEach, vi } from 'vitest';
import { DatabaseManager } from '../src/index.js';

describe('Utilities', () => {
  let db;

  afterEach(() => {
    db?.close();
  });

  describe('getStorageEstimate', () => {
    it('returns object or null', async () => {
      db = new DatabaseManager('util-db-' + Date.now(), 1, 's', 'k');
      await db.init();

      const est = await db.getStorageEstimate();
      // In Node/fake-indexeddb, navigator.storage may not exist
      if (est !== null) {
        expect(est).toHaveProperty('usage');
        expect(est).toHaveProperty('quota');
      }
    });
  });

  describe('requestPersistence', () => {
    it('returns boolean', async () => {
      db = new DatabaseManager('util-db2-' + Date.now(), 1, 's', 'k');
      await db.init();

      const result = await db.requestPersistence();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('retry config', () => {
    it('accepts retries config and init succeeds', async () => {
      db = new DatabaseManager({
        databaseName: 'retry-db-' + Date.now(),
        version: 1,
        storeName: 's',
        keyPath: 'k',
        retries: { maxAttempts: 3, backoffMs: 10 },
      });
      await db.init();
      await db.set('x', 1);
      expect(await db.get('x')).toBe(1);
    });
  });

  describe('debug config', () => {
    it('accepts debug config', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      db = new DatabaseManager({
        databaseName: 'debug-db-' + Date.now(),
        version: 1,
        storeName: 's',
        keyPath: 'k',
        debug: true,
      });
      await db.init();
      await db.set('x', 1);
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });
  });
});
