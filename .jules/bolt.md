# Bolt's Journal

## 2025-05-18 - Intl.DateTimeFormat Instantiation Overhead in Aggregation Loops
**Learning:** `Date.prototype.toLocaleDateString` re-instantiates an `Intl.DateTimeFormat` object on every call under V8/Node.js, crossing the ICU C++ boundary each time. In backend endpoints that aggregate logs (such as `/api/developer/stats`), formatting timestamps in tight loops degrades throughput (~970ms vs ~41ms per 10k items) and blocks the Node event loop.
**Action:** Always hoist `Intl.DateTimeFormat` instances to module scope or reuse a pre-allocated formatter when bucketing date ranges or processing collections.
