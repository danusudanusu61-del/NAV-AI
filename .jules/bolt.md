## 2025-05-18 - Local JSON Persistence In-Memory Caching & Serialized Async Writes
**Learning:** Synchronous file I/O (`fs.readFileSync` and `fs.writeFileSync`) in backend API endpoints blocks Node's single-threaded event loop and creates disk read overhead on every polling tick/request. In-memory caching provides O(1) reads while promise queue serialization prevents async disk write race conditions.
**Action:** When working with file-backed persistence in Express/Node.js, cache data in memory for reads and queue non-blocking async writes (`fs.promises.writeFile`) sequentially.
