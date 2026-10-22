## 2025-05-18 - Non-blocking In-Memory JSON Persistence & Single-Pass Stats Aggregation
**Learning:** Performing synchronous disk I/O (`readFileSync` and `writeFileSync`) in Express route handlers blocks the Node.js event loop on every API call. Furthermore, chain-calling array iteration methods (`filter`, `reduce`, `forEach`) over request logs duplicates work in hot routes.
**Action:** Use in-memory variables to cache JSON disk data and non-blocking `fs.promises.writeFile` for updates. Aggregate multi-property array metrics in a single O(N) loop pass.
