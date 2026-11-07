# Bolt's Performance Journal

## 2025-05-18 - Avoid Date.prototype.toLocaleDateString inside server aggregation loops
**Learning:** `Date.prototype.toLocaleDateString` re-instantiates an internal `Intl.DateTimeFormat` object on every single invocation when passed locale and options. In Node.js / V8, formatting 5,000 dates via `toLocaleDateString("en-US", { month: "short", day: "numeric" })` took ~518ms, whereas reusing a module-scoped `Intl.DateTimeFormat` instance took ~6ms (~86x faster). Running this in backend request handlers directly blocks the Node.js event loop for all concurrent requests.
**Action:** When bucketing or formatting dates inside server loops or endpoints, always instantiate `Intl.DateTimeFormat` at module scope and call `formatter.format(date)`.
