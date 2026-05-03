## 2024-04-26 - Presentational Canvas Overlays
**Learning:** In complex, multi-layered WebGL/Canvas React components, screen readers will pick up supplemental canvas overlays if not explicitly hidden. The main interaction layer handles keyboard and screen reader focus, but decorative layers (like grids or text labels) add noise to the accessibility tree.
**Action:** Always apply `aria-hidden={true}` to supplementary presentation-only `<canvas>` elements that act as visual overlays to an interactive root.

## 2024-04-27 - Canvas Focus Ring Accessibility
**Learning:** For interactive `<canvas>` elements acting as a single application root, native browser `:focus-visible` styling is often masked or inconsistent. Keyboard interactivity (shortcuts) and focus states must be explicitly managed within the canvas component.
**Action:** Use an explicit `onFocus`/`onBlur` listener checking for `matches(":focus-visible")` to emulate standard `outline` focus rings over custom rendered WebGL/Canvas controls.

## 2024-05-03 - Form Semantics and Toggle Button Accessibility
**Learning:** UI interactive layouts must use `aria-expanded` and `aria-controls` on toggle buttons bound to the ID of collapsible panels. Form fields such as `<textarea>` must be explicitly associated with semantic `<label htmlFor="...">` elements rather than visual-only styling like `<span>` with classes.
**Action:** Consistently enforce the pairing of labels to form inputs via IDs, and track interactive disclosure component state explicitly via `aria-expanded`/`aria-controls` for screen readers.
