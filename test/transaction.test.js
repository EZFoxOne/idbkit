import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseManager } from '../src/index.js';

describe('Transactions', () => {
  let db;

  beforeEach(() => {
    db = new DatabaseManager({
      databaseName: 'tx-db-' + Date.now(),
      version: 1,
      schema: {
        version: 1,
        stores: [
          { name: 'users', keyPath: 'id', indexes: [] },
          { name: 'logs', keyPath: 'id', indexes: [] },
        ],
      },
    });
  });

  afterEach(() => {
    db?.close();
  });

  it('rolls back on callback throw', async () => {
    await db.init();

    await expect(
      db.transaction(['users', 'logs'], 'readwrite', async (tx) => {
        await tx.store('users').set('u1', { name: 'Before' });
        throw new Error('Intentional failure');
      })
    ).rejects.toThrow('Intentional failure');

    const user = await db.store('users').get('u1');
    expect(user).toBeNull();
  });

  it('returns callback result', async () => {
    await db.init();

    const result = await db.transaction(['users'], 'readwrite', async (tx) => {
      await tx.store('users').set('u1', { name: 'Test' });
      return { success: true };
    });

    expect(result).toEqual({ success: true });
  });

  it('readonly transaction works', async () => {
    await db.init();
    await db.store('users').set('u1', { name: 'Exists' });

    const result = await db.transaction(['users'], 'readonly', async (tx) => {
      return await tx.store('users').get('u1');
    });

    expect(result.name).toBe('Exists');
  });

  it('handles multiple sequential transactions', async () => {
    await db.init();

    await db.transaction(['users'], 'readwrite', async (tx) => {
      await tx.store('users').set('a', { n: 1 });
    });
    await db.transaction(['users'], 'readwrite', async (tx) => {
      await tx.store('users').set('b', { n: 2 });
    });

    expect(await db.store('users').count()).toBe(2);
  });
});
