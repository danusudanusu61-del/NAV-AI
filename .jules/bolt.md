## 2025-05-20 - Non-blocking In-Memory Caching for Local Storage
**Learning:** Synchronous file I/O operations (`readFileSync` / `writeFileSync`) on every incoming API request block the Node.js single-threaded event loop, adding significant latency overhead and bottlenecking throughput under high request concurrency.
**Action:** Use in-memory caches for frequently accessed JSON datasets (`keys`, `logs`) and perform disk persistence asynchronously (`fs.writeFile`), keeping API request pathways completely non-blocking.
