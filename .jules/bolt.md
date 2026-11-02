# Bolt's Performance Journal

## 2025-05-18 - Intl.DateTimeFormat Reusability in Server Loop Aggregations
**Learning:** Calling `Date.prototype.toLocaleDateString()` inside loops across request log collections creates a significant performance bottleneck in Node.js. Under the hood, V8 repeatedly constructs new `Intl.DateTimeFormat` instances and parses locale options, taking hundreds of milliseconds for moderate log volumes (e.g. ~430ms per 5,000 items) and blocking the main event loop during client polling.
**Action:** Always instantiate `Intl.DateTimeFormat` once at module scope and call `formatter.format(date)` in batch data aggregation routines. Combine multiple array traversals into a single pass to achieve 25x–30x faster response calculations.
