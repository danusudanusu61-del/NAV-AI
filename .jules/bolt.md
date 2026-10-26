## 2025-05-18 - Avoid synchronous file I/O in Express API routes and polling handlers
**Learning:** In `server.ts`, data persistence for developer keys and request logs was performing synchronous `fs.readFileSync` and `fs.writeFileSync` on every request and client polling interval (e.g. `/api/developer/stats` polling every 10s). This blocked the Node.js event loop and caused latency spikes under concurrent requests.
**Action:** Use in-memory caching for reads (`keysCache` and `logsCache`) and non-blocking asynchronous disk writes (`fs.promises.writeFile`) for state updates.
