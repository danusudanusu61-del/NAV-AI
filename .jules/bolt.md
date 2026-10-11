# Bolt Performance Journal - Critical Learnings

## 2025-05-18 - Avoid `toLocaleDateString` in Request Handling Loops
**Learning:** `Date.prototype.toLocaleDateString()` with formatting options allocates `Intl.DateTimeFormat` instances or invokes internal i18n formatters under the hood. In hot loops processing log items on every API poll (e.g., `/api/developer/stats`), calling `toLocaleDateString` thousands of times creates significant CPU overhead and object churn.
**Action:** Use lightweight custom date formatters (like array lookups for month names with `getMonth()` and `getDate()`) when generating fixed string keys like `"Jan 15"` in telemetry and stat aggregations.
