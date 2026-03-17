# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-03-17

### Added

- **Schema & migrations** — Declarative store and index definitions with version upgrade migrations
- **Store API** — Multi-store support with `db.store(name)` for get, set, put, delete, count, clear, getAll, getKeys
- **Index queries** — Query by index with `store.index(name).get()`, `getAll()`, `getKeys()`, `count()`
- **Key ranges** — `getRange({ from, to })`, `{ only }`, `{ from }`, `{ to }` with inclusive options
- **Cursor iteration** — Async iterator and callback-based `store.iterate()` with direction support
- **Transactions** — `db.transaction(storeNames, mode, callback)` for atomic multi-store operations
- **Error handling** — `DatabaseManagerError` with codes (QUOTA_EXCEEDED, CONSTRAINT_ERR, etc.)
- **Connection lifecycle** — Version change and blocked upgrade callbacks
- **Retry** — Optional retry config for init on transient failures
- **Storage helpers** — `getStorageEstimate()` and `requestPersistence()`
- **Debug mode** — Optional operation logging
- **TypeScript** — Type definitions included
- **75 tests** — Full test coverage

### Changed

- **Build** — ESM + CJS output via tsup (replaces single-file build)
- **Init** — Fixed double-resolve and upgrade handling; removed polling-based `_waitForDB()`

### Fixed

- `init()` double-resolve when `onupgradeneeded` fired
- `setAll()` validation and error handling

### Backward Compatible

- Constructor `(databaseName, version, storeName, keyPath)` unchanged
- Simple KV API (get, set, delete, list, getAll, clear, setAll) unchanged
- Data shape `{ [keyPath]: key, v: value }` unchanged

[2.0.0]: https://github.com/EZFoxOne/idbkit/releases/tag/v2.0.0
