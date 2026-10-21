## 2025-05-18 - In-memory caching for JSON file storage

**Learning:** When using local JSON files (`fs.readFileSync`) for server state, uncached sync reads block the Express event loop on every request and client polling cycle (10s intervals).
**Action:** Cache parsed JSON in memory and sync back on writes to maintain fast response times and zero disk I/O latency on reads.
