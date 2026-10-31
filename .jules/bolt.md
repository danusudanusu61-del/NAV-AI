# Bolt's Journal - Critical Learnings Only

## 2025-05-14 - Repeated `toLocaleDateString` in Aggregation Loops Blocks Node Event Loop
**Learning:** Calling `new Date(ts).toLocaleDateString("en-US", options)` inside loops (such as API request log aggregation) triggers ICU formatting object initialization and locale resolution on every invocation. In V8/Node.js, executing this over thousands of items takes orders of magnitude longer (~90s vs ~900ms for 100 iterations of 10,000 items, ~98% overhead) and severely blocks the single-threaded Node event loop on frequently polled endpoints (e.g. `/api/developer/stats` polled every 10s).
**Action:** Always instantiate `Intl.DateTimeFormat` once at module scope or outside loops, apply early numerical timestamp cutoffs before string formatting, and combine multiple array traversals (`filter`, `reduce`, `forEach`) into a single pass.
