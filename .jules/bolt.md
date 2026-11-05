# Bolt's Journal - Critical Learnings Only

## 2025-05-18 - Module-Scoped Intl.DateTimeFormat in Server-Side Aggregations
**Learning:** `Date.prototype.toLocaleDateString()` constructs and initializes a new ICU locale formatter under the hood on every invocation. When processing request log history in server aggregation endpoints (such as `/api/developer/stats`), calling `toLocaleDateString()` inside loops introduces substantial synchronous CPU overhead (~530ms vs ~6.5ms for 5,000 iterations, an ~80x difference) that blocks the Node.js single-threaded event loop.
**Action:** Always pre-instantiate `Intl.DateTimeFormat` at module scope for repeated formatting in loops or high-throughput API endpoints instead of calling `Date.prototype.toLocaleDateString()`.
