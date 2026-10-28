## 2026-10-28 - Hoisting Aggregations Out of JSX Mapping Loops

**Learning:** Computing maximums or aggregations over data arrays inside React JSX `.map()` calls scales quadratically $O(N^2)$ during component rendering and generates redundant array allocations.
**Action:** Always compute array-wide aggregates (such as `Math.max`) once prior to or above the `.map()` iteration loop to keep component rendering linear $O(N)$.
