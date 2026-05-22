## 2024-04-24 - Accessibility for Interactive Canvas Elements
**Learning:** Adding `aria-label` and `role="img"` to a complex WebGL `<canvas>` element provides immediate context for screen readers that otherwise ignore interactive canvas content. The interactive `<canvas>` element inside `react/Graph.tsx` now communicates its purpose.
**Action:** When a `<canvas>` element handles interactive visualizations (like a graph viewer), always ensure it is accessible to screen reader technologies. Provide `aria-label` customization to allow developers to describe the specific data visualized within.

## 2024-05-01 - Accessibility for Collapsible Panels and Form Fields
**Learning:** In interactive layouts (like the 'Show source' drawer in `site/app/Showcase.tsx`), missing `aria-expanded`/`aria-controls` on the toggle button and missing semantic `label` elements for inline `textarea` fields can confuse screen reader users by failing to announce state changes and form field purposes.
**Action:** Always associate form `<textarea>` or `<input>` fields with a semantic `<label htmlFor="...">`. For collapsible layout panels, add `aria-expanded` and `aria-controls` to the toggle button, binding it to the `id` of the panel container.

## 2024-05-15 - Accessibility for Segmented Controls and Navigation Lists
**Learning:** Custom UI components like segmented toggle buttons or navigation lists that rely on `data-active` attributes for visual styling must be paired with `aria-pressed` (for toggles) or `aria-current="true"` (for navigation) to ensure screen readers correctly announce the active state.
**Action:** Always add semantic `aria-pressed` or `aria-current` attributes to interactive elements where `data-active` or similar custom styling states are used to convey state visually.

## 2024-05-17 - Destructive Action Guard
**Learning:** Destructive UI actions, such as removing elements from the graph, must be guarded with a confirmation mechanism (e.g., `window.confirm`) that clearly identifies the target to prevent accidental data loss.
**Action:** When implementing destructive operations, always ensure a descriptive confirmation prompt is presented to the user beforehand.
