## 2025-10-14 - In-Memory Write-Through Caching for File-Based Persistence
**Learning:** In applications using synchronous `fs.readFileSync` and `JSON.parse` for file-based persistence, high-frequency requests or client polling (e.g. 10s telemetry polling) cause repeated blocking disk I/O and CPU overhead.
**Action:** Implement an in-memory variable cache for read operations with write-through updates whenever write operations occur.
