## 2025-05-18 - Avoid O(N^2) chart max value computation inside render map loops
**Learning:** In React components rendering charts (like `DeveloperHub.tsx`), inline array calculations such as `Math.max(...chartData.map(d => d.requests))` inside `.map()` loops cause $O(N^2)$ iterations per render.
**Action:** Always compute maximums or aggregations prior to mapping over list items or memoize them with `useMemo`.
