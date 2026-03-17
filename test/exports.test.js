import { describe, it, expect } from 'vitest';
import { DatabaseManager, DatabaseManagerError, ErrorCodes } from '../src/index.js';

describe('Module Exports', () => {
  it('exports DatabaseManager', () => {
    expect(DatabaseManager).toBeDefined();
    expect(typeof DatabaseManager).toBe('function');
  });

  it('exports DatabaseManagerError', () => {
    expect(DatabaseManagerError).toBeDefined();
    expect(typeof DatabaseManagerError).toBe('function');
  });

  it('exports ErrorCodes with expected keys', () => {
    expect(ErrorCodes.QUOTA_EXCEEDED).toBe('QUOTA_EXCEEDED');
    expect(ErrorCodes.CONSTRAINT_ERR).toBe('CONSTRAINT_ERR');
    expect(ErrorCodes.INVALID_KEY).toBe('INVALID_KEY');
    expect(ErrorCodes.INVALID_VALUE).toBe('INVALID_VALUE');
    expect(ErrorCodes.NOT_SUPPORTED).toBe('NOT_SUPPORTED');
  });

  it('DatabaseManagerError is instanceof Error', async () => {
    const db = new DatabaseManager('export-db-' + Date.now(), 1, 's', 'k');
    await db.init();
    try {
      await db.set('', 'x');
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
      expect(e).toBeInstanceOf(DatabaseManagerError);
    }
    db.close();
  });
});
