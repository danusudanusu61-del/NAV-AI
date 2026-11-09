# Bolt's Performance Journal

## 2025-05-18 - Reuse Intl.DateTimeFormat in Server-Side Aggregations
**Learning:** `Date.prototype.toLocaleDateString` reinitializes ICU localization options every time it is called. Inside server aggregation loops (such as iterating over request logs in `/api/developer/stats`), repeated calls cause synchronous CPU overhead (~1.2s vs ~23ms per 10k items, a ~50x difference) that blocks the single-threaded Node.js event loop.
**Action:** Always instantiate `Intl.DateTimeFormat` at module scope when formatting timestamps repeatedly in request handlers or data loops.

## 2025-05-18 - Cloudflare Workers Builds Check CI Requirement
**Learning:** The Cloudflare Workers Builds check (`nav-ai`) requires `wrangler.json` (pointing to `_worker.js` and build command `npm run build` with assets `./dist`) to build and deploy static assets without failing the CI pipeline.
**Action:** Include `wrangler.json` and `_worker.js` when configuring or deploying apps integrated with Cloudflare Workers.
