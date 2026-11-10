# Bolt's Performance Journal

## 2025-05-18 - Reuse pre-instantiated Intl.DateTimeFormat in server aggregation loops
**Learning:** Calling `Date.prototype.toLocaleDateString(locale, options)` inside loops creates a new `Intl.DateTimeFormat` instance on every iteration. In V8/Node.js, initializing `Intl.DateTimeFormat` requires extensive locale resolution and pattern compilation. For 10,000 dates, repeated instantiation takes ~1,250ms, whereas reusing a module-scoped pre-instantiated `Intl.DateTimeFormat` takes ~39ms (a ~32x speedup and ~97% latency reduction), preventing event loop starvation during stats calculation.
**Action:** When formatting dates for aggregation, logging, or reporting in server-side loops, always define and reuse an `Intl.DateTimeFormat` instance at module or function scope instead of calling `toLocaleDateString`.
