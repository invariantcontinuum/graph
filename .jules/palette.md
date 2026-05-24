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

## 2024-05-05 - Semantic Association of Code Areas
**Learning:** Found `<textarea>` blocks labeled using visual `<span>` tags rather than semantic `<label>` elements connected via `htmlFor`. A "source view" button toggled code blocks visually but lacked ARIA properties connecting the toggle button state (`aria-expanded`) and relationship (`aria-controls`) to the code container.
**Action:** Always link form elements with descriptive `<label>`s via IDs and correctly reflect toggle state and relationship of layout blocks using `aria-expanded` and `aria-controls`.

## 2024-05-18 - Segmented Controls and Active State Announcements
**Learning:** For custom segmented controls or lists of buttons representing a single selection state (like theme mode or layout type), relying solely on `data-active` attributes only provides visual updates via CSS. Screen readers fail to announce when a button becomes the active or selected option, leaving keyboard users unaware of their current configuration.
**Action:** Always complement visual state attributes like `data-active` with `aria-pressed` or `aria-current` dynamically tied to the selected state to ensure screen readers correctly announce the active button.
## 2024-06-25 - Form Validation and Disabled States Learnings
**Learning:** React components outputting dynamic validation errors without `role="alert"` or `aria-live="assertive"` cause critical accessibility issues, failing to notify screen reader users when invalid JSON is entered. Additionally, interactive buttons left disabled without explaining why cause severe UX friction for all users (not just assistive tech users) who don't know the required precursor state (e.g., selecting a node).
**Action:** Always wrap dynamic inline error messages in `role="alert"` or `aria-live` containers. Pair `disabled={true}` states with a `title` (or tooltip wrapper) explaining the missing prerequisites to re-enable the control.

## 2024-05-11 - Add Discoverable Clear Selection Button
**Learning:** While power users and keyboard navigators can use 'Escape' or click the background to clear a selection in the WebGL canvas, relying solely on invisible interactions hurts discoverability. Adding an explicit "Clear" button to the active selection panel not only provides a clear visual escape hatch but also serves as a natural place to advertise the 'Escape' keyboard shortcut via the `title` and `aria-keyshortcuts` attributes.
**Action:** Always pair global canvas click-to-clear or escape-to-clear behaviors with an explicit, visually apparent button in the active state UI, and use that button to advertise the shortcut.
## 2026-05-14 - Keyboard Shortcut Accessibility for Zoom Buttons
**Learning:** When advertising keyboard shortcuts in visual tooltips (`title` attributes), adding the `aria-keyshortcuts` attribute ensures that screen readers also correctly announce these shortcuts, improving discoverability for keyboard-only or visually impaired users.
**Action:** Always complement `title="Keyboard shortcut: ..."` on buttons with the corresponding `aria-keyshortcuts="..."` attribute to maintain equal accessibility.
## 2026-05-16 - Add Confirmation to Destructive Actions
**Learning:** Destructive actions without confirmation pose a severe data-loss risk, especially in graph editing where restoring edges can be tedious.
**Action:** Always wrap destructive UI operations (like removing nodes) in a confirmation mechanism, such as `window.confirm`, to verify user intent and prevent accidents.

## 2024-10-24 - Destructive Actions Confirmation
**Learning:** Destructive actions without confirmation dialogues (like deleting a node and its edges in a graph UI) can lead to accidental data loss and cause severe UX frustration. Users might accidentally click the wrong button, especially in dense control panels.
**Action:** Always wrap destructive UI actions (such as removing items) with a confirmation mechanism, such as `window.confirm`, providing clear context on what is being deleted.

## 2026-05-19 - Destructive Action Guard
**Learning:** Destructive UI actions (like removing elements) need explicit confirmation guards to prevent accidental data loss. This improves UX by making destructive behavior intentional rather than accidental.
**Action:** Guard destructive actions, such as removing elements from the graph, with a confirmation mechanism (e.g., `window.confirm`) that clearly identifies the target to prevent accidental data loss.

## 2024-05-20 - Guard Destructive Actions
**Learning:** Destructive actions without warning can easily cause data loss. In custom application graphs or canvas workspaces where elements can be deleted without easy undo features, always include a confirmation step.
**Action:** Use window.confirm with the specific element's name to guarantee users know exactly what they are removing before executing the destructive function.

## 2024-05-22 - Add confirmation dialog for delete action
**Learning:** Destructive UI actions, such as removing elements from the graph, must be guarded with a confirmation mechanism (e.g., `window.confirm`) that clearly identifies the target to prevent accidental data loss. Furthermore, truncated text elements must include `title` attributes to ensure content is accessible.
**Action:** Always wrap delete/remove callbacks with a `window.confirm` dialog, specifically including the name of the entity being deleted. Always add `title` to text elements truncated with `text-overflow: ellipsis`.
## 2026-05-24 - Truncated Text Accessibility
**Learning:** UI elements with visually truncated text (e.g., due to `text-overflow: ellipsis`) must include `title` attributes to expose the full text on hover, and interactive elements should use `aria-label` to ensure the complete text is announced by screen readers.
**Action:** Always add `title` and `aria-label` attributes to elements that are styled with `text-overflow: ellipsis`, particularly interactive elements like buttons, to ensure accessibility.
