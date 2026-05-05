## 2024-04-26 - Presentational Canvas Overlays
**Learning:** In complex, multi-layered WebGL/Canvas React components, screen readers will pick up supplemental canvas overlays if not explicitly hidden. The main interaction layer handles keyboard and screen reader focus, but decorative layers (like grids or text labels) add noise to the accessibility tree.
**Action:** Always apply `aria-hidden={true}` to supplementary presentation-only `<canvas>` elements that act as visual overlays to an interactive root.

## 2024-04-27 - Canvas Focus Ring Accessibility
**Learning:** For interactive `<canvas>` elements acting as a single application root, native browser `:focus-visible` styling is often masked or inconsistent. Keyboard interactivity (shortcuts) and focus states must be explicitly managed within the canvas component.
**Action:** Use an explicit `onFocus`/`onBlur` listener checking for `matches(":focus-visible")` to emulate standard `outline` focus rings over custom rendered WebGL/Canvas controls.

## 2024-05-05 - Semantic Association of Code Areas
**Learning:** Found `<textarea>` blocks labeled using visual `<span>` tags rather than semantic `<label>` elements connected via `htmlFor`. A "source view" button toggled code blocks visually but lacked ARIA properties connecting the toggle button state (`aria-expanded`) and relationship (`aria-controls`) to the code container.
**Action:** Always link form elements with descriptive `<label>`s via IDs and correctly reflect toggle state and relationship of layout blocks using `aria-expanded` and `aria-controls`.
