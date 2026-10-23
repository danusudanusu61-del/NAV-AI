## 2025-05-18 - Optimized Date Formatting in Stats Endpoint Log Iteration
**Learning:** Calling `new Date()` and `toLocaleDateString()` repeatedly inside loops over log items introduces significant CPU and allocation overhead on hot API endpoints like `/api/developer/stats`.
**Action:** Pre-calculate date string lookup maps or timestamp ranges outside loops when aggregating logs or time-series data.
