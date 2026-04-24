## 2024-04-24 - Accessibility for Interactive Canvas Elements
**Learning:** Adding `aria-label` and `role="img"` to a complex WebGL `<canvas>` element provides immediate context for screen readers that otherwise ignore interactive canvas content. The interactive `<canvas>` element inside `react/Graph.tsx` now communicates its purpose.
**Action:** When a `<canvas>` element handles interactive visualizations (like a graph viewer), always ensure it is accessible to screen reader technologies. Provide `aria-label` customization to allow developers to describe the specific data visualized within.
