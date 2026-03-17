# DatabaseManager v2 — Design Document

A design specification for evolving the IndexedDB-Manager into a robust, drop-in library that exposes the full power of IndexedDB while remaining approachable for simple use cases.

---

## 1. Vision & Goals

### Vision
A zero-dependency, browser-first IndexedDB wrapper that developers can drop into any web app—from a simple key-value cache to a full offline-first data layer—without fighting the raw API.

### Goals
- **Progressive complexity**: Simple API for 80% of use cases; escape hatches for the rest
- **Production-ready**: Handles edge cases (multi-tab, quota, private mode, migrations)
- **Modern DX**: ESM-first, TypeScript, tree-shakeable, testable
- **Backward compatible**: Existing `DatabaseManager` usage continues to work

### Non-Goals
- Polyfills for unsupported browsers
- Node.js IndexedDB emulation (browser-only)
- ORM-style abstractions (relations, joins)

---

## 2. Architecture Overview

### 2.1 Layered API

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 3: Query API (indexes, ranges, cursors, iteration)   │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: Store API (multi-store, per-store operations)     │
├─────────────────────────────────────────────────────────────┤
│  Layer 1: Simple KV API (get/set/delete — current behavior) │
├─────────────────────────────────────────────────────────────┤
│  Core: Connection, transactions, schema, migrations          │
└─────────────────────────────────────────────────────────────┘
```

**Layer 1** — Preserved for existing users. Single store, key-value semantics.  
**Layer 2** — Store-centric operations. Multiple stores, explicit store selection.  
**Layer 3** — Index queries, key ranges, cursor iteration, count.

### 2.2 Module Structure

```
DatabaseManager.js (or /src/)
├── core/
│   ├── connection.js      # Connection lifecycle, version change
│   ├── schema.js          # Schema definition, validation
│   └── migrations.js      # Migration runner
├── operations/
│   ├── kv.js              # Simple get/set/delete
│   ├── store.js           # Store-scoped operations
│   └── query.js           # Indexes, ranges, cursors
├── utils/
│   ├── errors.js          # Error types, codes
│   └── retry.js           # Retry logic (optional)
└── index.js               # Public API, factory
```

Internal structure is an implementation detail; the public API is what matters.

---

## 3. Schema & Configuration

### 3.1 Schema Definition

Stores and indexes are declared up front. Schema changes require a version bump and migration.

```javascript
// Conceptual schema shape
const schema = {
  version: 2,
  stores: [
    {
      name: 'cache',
      keyPath: 'key',
      autoIncrement: false,
      indexes: [
        { name: 'expiresAt', keyPath: 'expiresAt', unique: false },
        { name: 'tag', keyPath: 'tag', unique: false }
      ]
    },
    {
      name: 'users',
      keyPath: 'id',
      autoIncrement: true,
      indexes: [
        { name: 'email', keyPath: 'email', unique: true },
        { name: 'createdAt', keyPath: 'createdAt', unique: false }
      ]
    }
  ]
};
```

### 3.2 Configuration Object

```javascript
{
  databaseName: string,        // Required
  version: number,             // Required; bump on schema change
  schema: SchemaDefinition,    // Stores + indexes
  migrations?: Migration[],    // Optional migration functions
  retries?: {                  // Optional retry config
    maxAttempts: number,
    backoffMs: number
  },
  debug?: boolean              // Log operations, timings
}
```

### 3.3 Migration API

```javascript
// Migration function signature
function migrate(db, transaction, { fromVersion, toVersion }) {
  if (fromVersion < 2) {
    const store = transaction.objectStore('users');
    store.createIndex('email', 'email', { unique: true });
  }
  if (fromVersion < 3) {
    const store = db.createObjectStore('sessions', { keyPath: 'id' });
    store.createIndex('userId', 'userId', { unique: false });
  }
}
```

Migrations run inside `onupgradeneeded`. They receive the raw `IDBDatabase` and `IDBTransaction` for full control.

---

## 4. Connection Lifecycle

### 4.1 Connection Management

- **Single connection per database** — Reuse one `IDBDatabase` instance
- **Lazy open** — Connect on first operation (or explicit `init()`)
- **No connection pooling** — IndexedDB handles concurrency via transactions

### 4.2 Version Change Handling

When another tab calls `open()` with a higher version:

1. Current connection receives `versionchange` event
2. Library closes the connection gracefully
3. Library emits/callbacks an event: `onVersionChange` or `connectionClosed`
4. App can: show "Please reload" UI, retry operations, etc.

### 4.3 Blocked Upgrades

When we call `open()` with a higher version but another tab has the DB open:

1. Our `open()` request is blocked until others close
2. Library can expose `onBlocked` callback
3. Document: "Close other tabs using this app to upgrade"

### 4.4 Init Flow

```
init()
  → open(databaseName, version)
  → onupgradeneeded? run migrations
  → onsuccess: store db ref, resolve
  → versionchange listener attached
```

---

## 5. API Specification

### 5.1 Simple KV API (Layer 1) — Backward Compatible

Preserves current behavior for `get`, `set`, `delete`, `list`, `getAll`, `clear`, `setAll`.

**Constructor (simple mode):**
```javascript
new DatabaseManager('myDb', 1, 'myStore', 'key')
// or
new DatabaseManager({ databaseName: 'myDb', version: 1, storeName: 'myStore', keyPath: 'key' })
```

**Methods:** Same as current. Internal implementation uses shared connection layer.

**Data shape:** `{ [keyPath]: key, v: value }` — unchanged for compatibility.

### 5.2 Store API (Layer 2)

**Store selector:**
```javascript
db.store('users')   // Returns store-scoped API
db.store('cache')
```

**Store-scoped methods:**
```javascript
store.get(key)           // Get by primary key
store.set(key, value)    // Put (upsert)
store.put(value)         // Put with auto key (if autoIncrement)
store.delete(key)        // Delete by primary key
store.count()            // Total count
store.clear()            // Clear store
store.getAll()           // All records
store.getKeys()          // All keys (getAllKeys)
```

### 5.3 Query API (Layer 3)

**Key ranges:**
```javascript
store.getRange({ from: 'a', to: 'm' })           // bound
store.getRange({ from: 'a', to: 'm', inclusive: [true, false] })
store.getRange({ from: 'a' })                    // lowerBound
store.getRange({ to: 'z' })                      // upperBound
store.getRange({ only: 'exact-key' })            // only
```

**Index queries:**
```javascript
store.index('email').get('user@example.com')
store.index('createdAt').getAll(range?)
store.index('tag').getKeys(range?)
store.index('expiresAt').count(range?)
```

**Cursor iteration:**
```javascript
for await (const [key, value] of store.iterate({ range?, direction: 'next'|'prev' })) {
  // ...
}
// or
store.iterate(options, (key, value) => { ... })
```

**Count with range:**
```javascript
store.count()
store.count({ from: 1, to: 100 })
store.index('status').count({ only: 'active' })
```

### 5.4 Transactions

**Auto transaction (default):** Each operation uses its own short-lived transaction.

**Explicit transaction (batch):**
```javascript
await db.transaction(['users', 'sessions'], 'readwrite', async (tx) => {
  await tx.store('users').set(user);
  await tx.store('sessions').set(session);
});
// Commits when callback resolves; aborts on throw
```

### 5.5 Utility Methods

```javascript
DatabaseManager.isSupported()           // Static; IndexedDB available?
db.close()                              // Close connection
db.getStorageEstimate()                 // navigator.storage.estimate() if available
db.requestPersistence()                 // navigator.storage.persist() if available
```

---

## 6. Error Handling

### 6.1 Error Types

| Code | Condition | Suggested Action |
|------|-----------|------------------|
| `QUOTA_EXCEEDED` | Storage full | Clear old data, request persistence |
| `CONSTRAINT_ERR` | Unique index violation, etc. | Fix input or handle conflict |
| `VERSION_ERR` | DB opened with wrong version | Reload page |
| `BLOCKED` | Upgrade blocked by other tab | Ask user to close other tabs |
| `NOT_FOUND` | Store/index doesn't exist | Check schema |
| `UNKNOWN` | Corruption, unknown | Log, possibly clear DB |

### 6.2 Error Object Shape

```javascript
{
  name: 'DatabaseManagerError',
  code: 'QUOTA_EXCEEDED',
  message: string,
  cause?: DOMException | Error
}
```

### 6.3 Retry Strategy (Optional)

Configurable for transient failures:
- `maxAttempts`: 3
- `backoffMs`: 100
- Retry on: `UnknownError`, `QuotaExceededError` (with backoff)
- No retry on: `ConstraintError`, `VersionError`, `NotFoundError`

---

## 7. Data & Serialization

### 7.1 Structured Clone

IndexedDB uses the structured clone algorithm. Supported out of the box:
- Primitives, Date, RegExp
- Map, Set
- Array, Object
- ArrayBuffer, Blob, File
- Typed arrays

### 7.2 No Custom Serialization by Default

Library does not JSON.stringify/parse. Use native types. Document limitations (e.g., functions, symbols, circular refs).

### 7.3 Optional Serializer Hook (Future)

For apps that need custom types:
```javascript
{ serialize: (v) => ..., deserialize: (v) => ... }
```
Not in v2 scope; document as extension point.

---

## 8. Distribution & Build

### 8.1 Output Formats

| Format | Use Case |
|-------|----------|
| ESM | Modern bundlers, `<script type="module">` |
| CJS | Node tooling, legacy bundlers |
| UMD/IIFE | `<script>` tag, no bundler |

### 8.2 Entry Points

```
DatabaseManager        # Full API
DatabaseManager/simple # Layer 1 only (smaller bundle)
```

### 8.3 TypeScript

- Provide `.d.ts` or ship TypeScript source
- Generic types for store schemas where possible

### 8.4 Package.json Exports

```json
{
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    },
    "./simple": {
      "import": "./dist/simple.mjs",
      "require": "./dist/simple.cjs",
      "types": "./dist/simple.d.ts"
    }
  }
}
```

---

## 9. Developer Experience

### 9.1 Debug Mode

When `debug: true`:
- Log each operation (store, method, key)
- Log transaction start/complete
- Log errors with stack
- Optional timing for slow operations

### 9.2 Testing

- Document use of `fake-indexeddb` for unit tests
- Optional `db.destroy()` or `db.clearAllStores()` for test teardown (dev only)

### 9.3 Documentation

- README: quick start, simple API, migration from v1
- API reference: all methods, params, return types
- Guides: schema design, migrations, multi-tab, quota handling

---

## 10. Backward Compatibility

### 10.1 Guarantees

- Constructor `(databaseName, version, storeName, keyPath)` continues to work
- All existing methods: `init`, `get`, `set`, `delete`, `list`, `getAll`, `clear`, `setAll`
- Data shape `{ [keyPath]: key, v: value }` unchanged
- `window.databaseManager` and `module.exports` behavior preserved (configurable)

### 10.2 Changes (Non-Breaking)

- `init()`: Fix double-resolve, proper `onupgradeneeded` handling
- `_waitForDB()`: Replace polling with proper connection readiness
- Errors: Wrap in `DatabaseManagerError` with `cause` for original error
- `setAll()`: Remove "untested" status; add tests

### 10.3 Deprecations (If Any)

None in v2. New APIs are additive.

---

## 11. Implementation Phases

### Phase 1: Foundation
- [x] Connection lifecycle (single connection, version change, blocked)
- [x] Error types and wrapping
- [x] Fix init() and _waitForDB() in simple mode
- [x] Tests for current API

### Phase 2: Schema & Migrations
- [x] Schema definition format
- [x] Migration runner
- [x] Multi-store support in core

### Phase 3: Store & Query API
- [x] `store(name)` selector
- [x] Index queries
- [x] Key ranges
- [x] Cursor iteration
- [x] Explicit transactions

### Phase 4: Robustness
- [x] Retry logic (optional)
- [x] Storage estimate / persist helpers
- [x] Debug mode
- [x] Quota exceeded handling

### Phase 5: Distribution
- [x] ESM/CJS build
- [x] TypeScript definitions
- [x] Documentation

---

## 12. Design Decisions (Resolved)

1. **Naming** → **Keep `DatabaseManager`**  
   Already established, backward compatible, and used in docs/examples. A rebrand would add migration friction for no real gain.

2. **Default store** → **Simple mode: require `storeName`; schema mode: default to first store**  
   Simple constructor `(dbName, version, storeName, keyPath)` keeps `storeName` required for backward compat. When using the config object with a schema, defaulting to the first store is a sensible convenience.

3. **Iteration** → **Async iterator as primary**  
   `for await` is idiomatic, composable, and supports early exit. `iterate()` returns an async iterable. Optional callback overload `iterate(options, callback)` for those who prefer it.

4. **Bundler** → **tsup**  
   Zero-config ESM + CJS + UMD, built-in TypeScript and `.d.ts`, wraps esbuild for speed. Pragmatic choice for a library of this size.

---

## Appendix A: Current vs. Proposed

| Aspect | Current | Proposed |
|--------|---------|----------|
| Stores | 1 | 1+ (schema-driven) |
| Indexes | 0 | Declarative in schema |
| Migrations | None | Explicit migration functions |
| Version change | Ignored | Handled, connection closed |
| Errors | Generic | Typed, with codes |
| Transactions | Implicit per-op | Implicit + explicit batch |
| Query | Key only | Key + index + range |
| Iteration | getAll | getAll + cursor |
| Build | Single file | ESM, CJS, UMD |
| Types | None | TypeScript |

---

## Appendix B: References

- [IndexedDB API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [IDBDatabase](https://developer.mozilla.org/en-US/docs/Web/API/IDBDatabase)
- [IDBKeyRange](https://developer.mozilla.org/en-US/docs/Web/API/IDBKeyRange)
- [Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API)
- [fake-indexeddb](https://github.com/dumbmatter/fakeIndexedDB) (testing)
