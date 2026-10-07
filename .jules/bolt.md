## 2025-05-18 - Avoid `toLocaleDateString` in log aggregations & hot paths
**Learning:** `toLocaleDateString` in Node.js invokes ICU localization formatting logic, which is prohibitively slow (>100x slowdown) when called per entry in large array loops. Replacing it with custom array/getter string formatting reduces runtime from ~550ms to ~5ms for 5k items.
**Action:** Always prefer lightweight date string formatting or pre-formatted timestamps in hot aggregation paths over ICU `toLocaleDateString` calls.
