## 2025-10-04 - Chart Rendering Redundant Loop Anti-Pattern
**Learning:** Performing aggregate calculations like `Math.max(...data.map(...))` inside an element-level `.map()` iteration callback creates an $O(N^2)$ operation on every render pass, allocating $N$ temporary arrays.
**Action:** Always compute aggregate metrics outside of `.map()` loops or wrap them in `useMemo` when rendering charts or lists.
