## 2025-05-18 - Avoid synchronous disk reads on polling and API authorization routes
**Learning:** In single-node Node.js applications with local JSON file persistence (`data/keys.json`, `data/logs.json`), calling `fs.readFileSync` synchronously on every API request and frontend telemetry poll interval introduces avoidable main-thread blocking disk I/O.
**Action:** Maintain an in-memory cache initialized on first read and kept synchronized during writes to eliminate blocking disk reads.
