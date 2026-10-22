## 2025-05-18 - Single-Pass Stats Aggregation
**Learning:** Chaining array methods (`filter`, `reduce`, `forEach`) on log arrays creates multiple intermediate arrays and redundant iterations.
**Action:** Aggregate multiple metrics (counts, sums, date bucketing) in a single O(N) loop pass in hot API endpoints.
