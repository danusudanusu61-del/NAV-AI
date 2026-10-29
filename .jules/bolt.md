## 2025-10-29 - Single-pass Aggregation and ICU Locale Pre-calculation for Analytics
**Learning:** Invoking `toLocaleDateString` inside log processing loops causes heavy ICU locale formatting overhead on every request. Pre-calculating ISO date prefix mappings (`YYYY-MM-DD`) for the target date buckets and aggregating metrics in a single O(N) loop eliminates repetitive array iterations and ICU formatting overhead.
**Action:** Pre-compute date lookup maps using ISO prefixes (`isoToDateStr`) before aggregating logs in a single loop.
