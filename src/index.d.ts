export declare const ErrorCodes: {
  QUOTA_EXCEEDED: string;
  CONSTRAINT_ERR: string;
  VERSION_ERR: string;
  BLOCKED: string;
  NOT_FOUND: string;
  UNKNOWN: string;
  NOT_SUPPORTED: string;
  INVALID_KEY: string;
  INVALID_VALUE: string;
};

export declare class DatabaseManagerError extends Error {
  code: string;
  cause?: Error | DOMException;
  constructor(message: string, code?: string, cause?: Error | DOMException);
}

export interface SchemaStore {
  name: string;
  keyPath: string;
  autoIncrement?: boolean;
  indexes?: Array<{ name?: string; keyPath: string; unique?: boolean }>;
}

export interface SchemaDefinition {
  version: number;
  stores: SchemaStore[];
}

export interface DatabaseManagerConfig {
  databaseName: string;
  version: number;
  storeName?: string;
  keyPath?: string;
  schema?: SchemaDefinition;
  migrations?: Array<(db: IDBDatabase, transaction: IDBTransaction, ctx: { fromVersion: number; toVersion: number }) => void>;
  retries?: { maxAttempts?: number; backoffMs?: number };
  debug?: boolean;
}

export interface KeyRangeOptions {
  from?: unknown;
  to?: unknown;
  only?: unknown;
  inclusive?: [boolean, boolean];
}

export interface StoreAPI {
  get(key: unknown): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  put(value: unknown): Promise<void>;
  delete(key: unknown): Promise<void>;
  count(rangeOptions?: KeyRangeOptions): Promise<number>;
  clear(): Promise<void>;
  getAll(rangeOptions?: KeyRangeOptions): Promise<unknown[]>;
  getKeys(rangeOptions?: KeyRangeOptions): Promise<unknown[]>;
  getRange(rangeOptions?: KeyRangeOptions): Promise<unknown[]>;
  index(name: string): {
    get(key: unknown): Promise<unknown>;
    getAll(rangeOptions?: KeyRangeOptions): Promise<unknown[]>;
    getKeys(rangeOptions?: KeyRangeOptions): Promise<unknown[]>;
    count(rangeOptions?: KeyRangeOptions): Promise<number>;
  };
  iterate(options?: { range?: KeyRangeOptions; direction?: 'next' | 'prev' }): AsyncIterable<[unknown, unknown]>;
  iterate(callback: (key: unknown, value: unknown) => void | Promise<void>): Promise<void>;
}

export interface TransactionContext {
  store(name: string): StoreAPI;
}

export declare class DatabaseManager {
  constructor(databaseName?: string, version?: number, storeName?: string, keyPath?: string);
  constructor(config: DatabaseManagerConfig);

  init(): Promise<void>;
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
  list(): Promise<string[]>;
  getAll(): Promise<unknown[]>;
  clear(): Promise<void>;
  setAll(entries: Array<{ key: string; value: unknown }>): Promise<void>;

  store(name: string): StoreAPI;
  transaction(storeNames: string[], mode: 'readonly' | 'readwrite', callback: (tx: TransactionContext) => Promise<unknown>): Promise<unknown>;

  onVersionChange(fn: () => void): void;
  onBlocked(fn: () => void): void;

  static isSupported(): boolean;
  close(): void;
  getStorageEstimate(): Promise<{ usage?: number; quota?: number } | null>;
  requestPersistence(): Promise<boolean>;
}
