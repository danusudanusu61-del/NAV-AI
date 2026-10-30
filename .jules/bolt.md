## 2026-10-30 - Memoize React Chat Message List & Cloudflare Worker Configuration
**Learning:** Re-rendering a list of chat messages on every keystroke in an input field causes expensive re-parsing of markdown regexes and DOM diffing.
**Action:** Extract chat message rendering into a `React.memo` component (`ChatMessageItem`) and move inline markdown parsing out of the render loop. Also include `_worker.js` entrypoint and `wrangler.json` asset configuration for Cloudflare Workers deployments.
