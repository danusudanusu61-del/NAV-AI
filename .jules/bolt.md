## 2026-06-25 - Caching Intl.DateTimeFormat in Server-Side Aggregations
**Learning:** Calling `Date.prototype.toLocaleDateString` repeatedly inside server-side data processing loops creates and discards ICU formatters on every iteration, introducing significant CPU overhead (~535ms for 5,000 logs) that blocks the single-threaded Node.js event loop.
**Action:** Always instantiate `Intl.DateTimeFormat` at module scope when formatting repetitive date structures in API aggregation endpoints, reducing execution time to ~11ms (~48x speedup).
