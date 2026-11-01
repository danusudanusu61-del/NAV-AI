# Bolt's Performance Journal

## 2025-05-18 - Intl.DateTimeFormat Instantiation in Event-Loop Aggregations
**Learning:** `Date.prototype.toLocaleDateString` re-instantiates an internal `Intl.DateTimeFormat` instance and performs locale resolution on every call. Calling it inside synchronous loops (such as bucketing 10,000 request logs on the Express server) consumes hundreds of milliseconds and blocks the single Node.js event loop thread, creating significant tail latencies for all concurrent requests.
**Action:** Always pre-instantiate `Intl.DateTimeFormat` at module scope when formatting or bucketing dates in server endpoints or loops. A single reused instance yields a >20x speedup (~960ms down to ~42ms for 10k items) and avoids event loop blocking.
