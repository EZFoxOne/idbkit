import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseManager } from '../src/index.js';

describe('Data Types', () => {
  let db;

  beforeEach(() => {
    db = new DatabaseManager('types-db-' + Date.now(), 1, 's', 'k');
  });

  afterEach(() => {
    db?.close();
  });

  it('stores and retrieves null', async () => {
    await db.init();
    await db.set('null-key', null);
    expect(await db.get('null-key')).toBeNull();
  });

  it('stores and retrieves number', async () => {
    await db.init();
    await db.set('num', 42);
    expect(await db.get('num')).toBe(42);
  });

  it('stores and retrieves zero', async () => {
    await db.init();
    await db.set('zero', 0);
    expect(await db.get('zero')).toBe(0);
  });

  it('stores and retrieves boolean', async () => {
    await db.init();
    await db.set('bool', true);
    expect(await db.get('bool')).toBe(true);
  });

  it('stores and retrieves object', async () => {
    await db.init();
    const obj = { a: 1, b: [2, 3], nested: { x: 'y' } };
    await db.set('obj', obj);
    expect(await db.get('obj')).toEqual(obj);
  });

  it('stores and retrieves array', async () => {
    await db.init();
    const arr = [1, 'two', { three: 3 }];
    await db.set('arr', arr);
    expect(await db.get('arr')).toEqual(arr);
  });

  it('stores and retrieves Date', async () => {
    await db.init();
    const d = new Date('2024-01-15T12:00:00Z');
    await db.set('date', d);
    const got = await db.get('date');
    expect(got).toBeInstanceOf(Date);
    expect(got.getTime()).toBe(d.getTime());
  });

  it('stores and retrieves empty string', async () => {
    await db.init();
    await db.set('empty', '');
    expect(await db.get('empty')).toBe('');
  });

  it('stores and retrieves Map', async () => {
    await db.init();
    const m = new Map([['a', 1], ['b', 2]]);
    await db.set('map', m);
    const got = await db.get('map');
    expect(got).toBeInstanceOf(Map);
    expect(got.get('a')).toBe(1);
    expect(got.get('b')).toBe(2);
  });

  it('stores and retrieves Set', async () => {
    await db.init();
    const s = new Set([1, 2, 3]);
    await db.set('set', s);
    const got = await db.get('set');
    expect(got).toBeInstanceOf(Set);
    expect(got.has(1)).toBe(true);
    expect(got.size).toBe(3);
  });
});
