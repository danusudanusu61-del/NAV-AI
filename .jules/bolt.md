# Bolt's Journal

## 2025-05-18 - Avoid synchronous file I/O in Express request handlers
**Learning:** In express backends reading persistence files synchronously (`readFileSync` / `writeFileSync` / `JSON.parse`) on every request blocks the Node.js event loop and creates heavy disk I/O bottlenecks.
**Action:** Use in-memory caching for read operations on startup and sync writes asynchronously to disk.
