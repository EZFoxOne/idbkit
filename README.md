# idbkit

A robust, drop-in IndexedDB wrapper for web apps. Use it for simple key-value storage or full offline-first data layers with indexes, migrations, and transactions.

## Features

- **Simple KV API** — get, set, delete, list, getAll, clear, setAll
- **Schema & migrations** — Declarative stores, indexes, version upgrades
- **Store API** — Multi-store, index queries, key ranges, cursor iteration
- **Transactions** — Batch operations across multiple stores
- **Robust** — Version change handling, retry, storage helpers, typed errors
- **Zero dependencies** — Browser-only, ESM + CJS builds

## Installation

```bash
npm install @projectcarey/idbkit
```

## Quick Start

### Simple mode (backward compatible)

```javascript
import { DatabaseManager } from '@projectcarey/idbkit';

const db = new DatabaseManager('myDatabase', 1, 'myStore', 'id');
await db.init();

await db.set('username', 'johnDoe');
const value = await db.get('username'); // 'johnDoe'
```

### Config object

```javascript
const db = new DatabaseManager({
  databaseName: 'myApp',
  version: 1,
  storeName: 'cache',
  keyPath: 'key',
});
await db.init();
```

## Schema & Migrations

Define stores and indexes, then bump the version when the schema changes:

```javascript
const db = new DatabaseManager({
  databaseName: 'myApp',
  version: 2,
  schema: {
    version: 2,
    stores: [
      {
        name: 'users',
        keyPath: 'id',
        autoIncrement: true,
        indexes: [
          { name: 'email', keyPath: 'email', unique: true },
          { name: 'createdAt', keyPath: 'createdAt', unique: false },
        ],
      },
      {
        name: 'cache',
        keyPath: 'key',
        indexes: [{ name: 'expiresAt', keyPath: 'expiresAt', unique: false }],
      },
    ],
  },
  migrations: [
    (db, transaction, { fromVersion, toVersion }) => {
      if (fromVersion < 2) {
        const store = transaction.objectStore('users');
        store.createIndex('email', 'email', { unique: true });
      }
    },
  ],
});
await db.init();
```

## Store API

Access any store with full CRUD, indexes, and iteration:

```javascript
const store = db.store('users');

await store.set('u1', { name: 'Alice', email: 'alice@example.com' });
const user = await store.get('u1');

await store.index('email').get('alice@example.com');
const recent = await store.index('createdAt').getAll({ from: startDate, to: endDate });

for await (const [key, value] of store.iterate({ direction: 'prev' })) {
  console.log(key, value);
}
```

## Transactions

Batch operations in a single transaction:

```javascript
await db.transaction(['users', 'sessions'], 'readwrite', async (tx) => {
  await tx.store('users').set('u1', { name: 'Alice' });
  await tx.store('sessions').set('s1', { userId: 'u1', token: 'abc' });
});
```

## Utility Methods

```javascript
DatabaseManager.isSupported();  // true if IndexedDB available
db.close();                     // Close connection
db.getStorageEstimate();        // { usage, quota } or null
db.requestPersistence();        // Request persistent storage
```

## Multi-tab Handling

```javascript
db.onVersionChange(() => {
  console.log('Another tab upgraded the database. Please reload.');
});
db.onBlocked(() => {
  console.log('Close other tabs to upgrade.');
});
```

## Options

| Option | Type | Description |
|--------|------|-------------|
| `retries` | `{ maxAttempts, backoffMs }` | Retry init on transient failures |
| `debug` | `boolean` | Log operations to console |

## Error Handling

Errors are `DatabaseManagerError` with a `code` property:

- `QUOTA_EXCEEDED` — Storage full
- `CONSTRAINT_ERR` — Unique index violation
- `VERSION_ERR` — Wrong DB version
- `BLOCKED` — Upgrade blocked by other tabs
- `NOT_FOUND` — Store/index doesn't exist
- `UNKNOWN` — Other errors

```javascript
import { DatabaseManager, DatabaseManagerError, ErrorCodes } from '@projectcarey/idbkit';

try {
  await db.set('key', value);
} catch (err) {
  if (err.code === ErrorCodes.QUOTA_EXCEEDED) {
    await db.clear();
  }
}
```

## API Reference

### Simple KV (Layer 1)

- `get(key)` — Get value by key
- `set(key, value)` — Set key-value pair
- `delete(key)` — Delete by key
- `list()` — All keys
- `getAll()` — All records
- `clear()` — Clear store
- `setAll(entries)` — Bulk set `[{ key, value }, ...]`

### Store API (Layer 2)

- `store(name)` — Get store-scoped API
- `store.get(key)` — Get by primary key
- `store.set(key, value)` — Put (upsert)
- `store.put(value)` — Put with auto key
- `store.delete(key)` — Delete
- `store.count(range?)` — Count
- `store.clear()` — Clear
- `store.getAll(range?)` — All records
- `store.getKeys(range?)` — All keys
- `store.getRange(options)` — Get by key range
- `store.index(name)` — Index API
- `store.iterate(options?)` — Async iterator

### Key Range Options

```javascript
{ from: 'a', to: 'z' }                    // bound
{ from: 'a', to: 'z', inclusive: [true, false] }
{ from: 'a' }                              // lowerBound
{ to: 'z' }                                // upperBound
{ only: 'exact-key' }                      // only
```

## Testing

```bash
npm test          # Run tests
npm run test:coverage  # Run with coverage report
```

75 tests cover the Simple KV API, Store API, index queries, transactions, schema, migrations, error handling, data types, edge cases, and key ranges.

## Example

Run the interactive demo:

```bash
npm run example
```

Then open http://localhost:3000/example/ in your browser. The demo exercises all features: Simple KV, Store API, index queries, transactions, cursor iteration, and storage utilities.

## License

MIT
