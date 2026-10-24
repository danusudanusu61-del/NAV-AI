## 2025-05-18 - Single-Pass Aggregation for Polled Telemetry Endpoints
**Learning:** Polled telemetry routes (like `/api/developer/stats` fetched every 10s by DeveloperHub) can incur redundant O(N) log traversals when computing multiple stats (`filter`, `reduce`, `forEach`). Combining stats accumulation into a single `for...of` pass reduces overhead and prevents main-thread lag when log size scales.
**Action:** Consolidate multiple array operations on logs into a single iteration when calculating dashboard metrics.
