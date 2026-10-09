## 2026-10-09 - In-memory Caching for Persistence Files
**Learning:** Synchronous JSON disk reads (`fs.readFileSync`) and JSON parsing on every request/polling cycle cause significant event-loop blocking and latency degradation as persistence files grow. Caching parsed JSON in memory and updating the cache during writes eliminates thousands of redundant synchronous I/O operations per minute.
**Action:** Always check if local JSON persistence helpers read files on every request, and replace with in-memory caching that writes through to disk.
