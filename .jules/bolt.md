## 2025-05-18 - [Avoid `toLocaleDateString` in Server Loops]
**Learning:** `Date.prototype.toLocaleDateString` re-instantiates locale formatting options on every call, taking ~1ms per call. In hot loops over telemetry/log records (e.g., 1,000–10,000 items), this creates up to a 1 second latency overhead.
**Action:** Always extract and reuse `Intl.DateTimeFormat` instances globally or at module level when formatting dates in server loops or array iterations.
