## 2025-05-18 - Synchronous JSON file I/O in API routes
**Learning:** `server.ts` uses local `data/*.json` files for persistence. Calling `fs.readFileSync` and `JSON.parse` on every request blocks Node's event loop.
**Action:** Use write-through in-memory caching for JSON-backed persistence in Express routes.
