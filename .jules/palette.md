## 2024-04-26 - Presentational Canvas Overlays
**Learning:** In complex, multi-layered WebGL/Canvas React components, screen readers will pick up supplemental canvas overlays if not explicitly hidden. The main interaction layer handles keyboard and screen reader focus, but decorative layers (like grids or text labels) add noise to the accessibility tree.
**Action:** Always apply `aria-hidden={true}` to supplementary presentation-only `<canvas>` elements that act as visual overlays to an interactive root.

## 2024-04-27 - Canvas Focus Ring Accessibility
**Learning:** For interactive `<canvas>` elements acting as a single application root, native browser `:focus-visible` styling is often masked or inconsistent. Keyboard interactivity (shortcuts) and focus states must be explicitly managed within the canvas component.
**Action:** Use an explicit `onFocus`/`onBlur` listener checking for `matches(":focus-visible")` to emulate standard `outline` focus rings over custom rendered WebGL/Canvas controls.

## 2024-06-18 - [Toggle Panels & Form Labels Accessibility]
**Learning:** UI interactive layouts specifically using a source/code drawer benefit greatly from native ARIA `aria-expanded` and `aria-controls` bindings (associating the toggle button with the panel ID). Additionally, raw code `textarea` elements styled merely by adjacent visual elements (like `span` tags styled as "eyebrow") fail screen readers. They must be explicitly associated using a semantic `<label htmlFor="...">` matching the `id` of the `textarea`.
**Action:** Always use `aria-expanded` tracking local state and map it with `aria-controls` to collapsible panels. Avoid visual-only hints; always replace standalone span text descriptions above textareas/inputs with semantic `label`s bound by `htmlFor` to the field `id`.

## 2024-05-03 - Form Semantics and Toggle Button Accessibility
**Learning:** UI interactive layouts must use `aria-expanded` and `aria-controls` on toggle buttons bound to the ID of collapsible panels. Form fields such as `<textarea>` must be explicitly associated with semantic `<label htmlFor="...">` elements rather than visual-only styling like `<span>` with classes.
**Action:** Consistently enforce the pairing of labels to form inputs via IDs, and track interactive disclosure component state explicitly via `aria-expanded`/`aria-controls` for screen readers.

## 2024-05-15 - Expandable Layouts and Form Labels Accessibility
**Learning:** Interactive layouts containing drawers, collapsibles, or visually distinct input areas often forget screen reader linkage. Custom toggles omit `aria-expanded` and `aria-controls`, and visually grouped `<span className="eyebrow">` elements above `<textarea>` or `<input>` fields do not act as labels for screen readers.
**Action:** Always add `aria-expanded` and `aria-controls` to custom toggle buttons, mapping to the ID of the collapsible panel. Convert visual-only `<span className="...">` labels above inputs to semantic `<label htmlFor="...">` to ensure form fields are properly described.
