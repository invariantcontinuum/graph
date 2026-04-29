## 2024-04-26 - Presentational Canvas Overlays
**Learning:** In complex, multi-layered WebGL/Canvas React components, screen readers will pick up supplemental canvas overlays if not explicitly hidden. The main interaction layer handles keyboard and screen reader focus, but decorative layers (like grids or text labels) add noise to the accessibility tree.
**Action:** Always apply `aria-hidden={true}` to supplementary presentation-only `<canvas>` elements that act as visual overlays to an interactive root.

## 2024-04-29 - Managing WebGL Canvas Focus Outlines
**Learning:** In WebGL-based canvases acting as full applications (`role="application"`), native browser focus outlines (`:focus-visible`) are often masked or incorrectly rendered because the rendering context takes over the display. Native styling doesn't reliably work inside or around WebGL.
**Action:** Explicitly manage focus outlines using React event handlers (`onFocus`/`onBlur`), dynamically applying CSS `outline` and `outlineOffset` when the target matches `:focus-visible`.
