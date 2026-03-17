# idbkit — Feature Demo

Interactive demo of all library features.

## Run

From the project root:

```bash
npm run example
```

Then open **http://localhost:3000/example/** in your browser.

## Features Demonstrated

1. **Simple KV API** — get, set, delete, list, getAll, clear, setAll
2. **Store API** — Multi-store (users, cache), put, count, getKeys
3. **Index Queries** — Get by email index
4. **Transactions** — Atomic batch write to users + cache
5. **Cursor Iteration** — Async iterate over users store
6. **Utilities** — Storage estimate, request persistence

Debug mode is enabled — check the console for operation logs.
