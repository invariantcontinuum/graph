## 2024-04-26 - Presentational Canvas Overlays
**Learning:** In complex, multi-layered WebGL/Canvas React components, screen readers will pick up supplemental canvas overlays if not explicitly hidden. The main interaction layer handles keyboard and screen reader focus, but decorative layers (like grids or text labels) add noise to the accessibility tree.
**Action:** Always apply `aria-hidden={true}` to supplementary presentation-only `<canvas>` elements that act as visual overlays to an interactive root.

## 2024-04-27 - Canvas Focus Ring Accessibility
**Learning:** For interactive `<canvas>` elements acting as a single application root, native browser `:focus-visible` styling is often masked or inconsistent. Keyboard interactivity (shortcuts) and focus states must be explicitly managed within the canvas component.
**Action:** Use an explicit `onFocus`/`onBlur` listener checking for `matches(":focus-visible")` to emulate standard `outline` focus rings over custom rendered WebGL/Canvas controls.

## 2024-05-15 - Expandable Layouts and Form Labels Accessibility
**Learning:** Interactive layouts containing drawers, collapsibles, or visually distinct input areas often forget screen reader linkage. Custom toggles omit `aria-expanded` and `aria-controls`, and visually grouped `<span className="eyebrow">` elements above `<textarea>` or `<input>` fields do not act as labels for screen readers.
**Action:** Always add `aria-expanded` and `aria-controls` to custom toggle buttons, mapping to the ID of the collapsible panel. Convert visual-only `<span className="...">` labels above inputs to semantic `<label htmlFor="...">` to ensure form fields are properly described.
