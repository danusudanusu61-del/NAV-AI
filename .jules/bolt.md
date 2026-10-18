## 2025-05-18 - In-Memory Caching for Local JSON Storage & Single-Pass Metrics Aggregation
**Learning:** Synchronous file system reads/writes (`readFileSync` / `writeFileSync`) in Express request handlers block the single-threaded Node.js event loop on every request. Additionally, calling `toLocaleDateString` inside log processing loops creates huge CPU overhead due to ICU locale formatting initialization.
**Action:** Cache local JSON persistence files in-memory on server start, write updates asynchronously using `fs.promises.writeFile`, and pre-compute date format maps for log aggregation.
