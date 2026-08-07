# Jules Palette Playbook: Accessibility, UX, and Design

Last updated: 2026-05-29

> Before starting any task, read `AGENTS.md` rule zero: check open PRs and
> recent merges so you never duplicate in-flight work.

This file is the playbook for product experience: graph readability,
accessibility semantics, keyboard behavior, labels, themes, responsive fit, and
showcase design. The graph package is a product UI surface, so clarity and
predictable controls matter more than decorative novelty.

## Current SonarCloud Accessibility Target

SonarCloud currently reports overlay and canvas accessibility findings in these
files:

| Rule | Files | Problem | Preferred fix |
| --- | --- | --- | --- |
| `typescript:S6819` | `react/GridOverlay.tsx`, `react/LabelOverlay.tsx`, `react/EdgeLabelsOverlay.tsx`, `react/CompoundFramesOverlay.tsx` | Presentation-role canvas usage is flagged | Remove `role="presentation"` from non-interactive overlay canvases; keep them unfocusable and hidden from assistive tech |
| `typescript:S6825` | same overlay files | `aria-hidden="true"` is flagged as focusable-risk | Ensure overlay canvases have no `tabIndex`, no interactive handlers, and `pointerEvents: "none"` |
| `typescript:S6843` | overlay files and `react/Graph.tsx` | Interactive or canvas elements have questionable roles | Keep only the main WebGL canvas focusable; reassess whether `role="application"` is justified or should become a labelled region with documented keyboard support |

Done criteria:

- Supplementary canvases are not in the accessibility tree.
- The main graph canvas has one clear accessible name.
- Keyboard users can discover focus, zoom, fit, selection, and escape behavior.
- SonarCloud no longer reports the overlay role findings.

## Canvas Accessibility Contract

- `Graph` owns the only focusable canvas.
- Overlay canvases are decorative implementation layers. They should have
  `aria-hidden={true}`, no `role`, no `tabIndex`, no pointer handlers, and
  `pointerEvents: "none"`.
- If an overlay becomes interactive, it stops being an overlay. Move interaction
  into `Graph` or expose an HTML control in the host chrome.
- Do not use `role="presentation"` on `<canvas>` unless a browser and SonarCloud
  validation proves it is necessary. Current evidence says it is noisy.
- Do not expose every node as DOM text by default. Large graphs need a
  canvas-first model, but selection and inspector chrome should expose the
  active node, connected edges, and action state.

## UX And Design Priorities

The package should feel like a dependable graph workbench:

- Nodes read as stable cards, not random symbols.
- Edges attach to node boundaries and move during drag.
- Force, hierarchical, and grid layouts should all be usable, not only force.
- Dark and light themes must propagate to canvas background, grid, nodes,
  labels, edges, selection, and hulls.
- Buttons that represent state use `aria-pressed` or `aria-current`.
- Truncated visible text gets `title` only when truncation hides information.
- Destructive graph actions need confirmation until undo exists.
- Empty states teach the next action; they do not say only "nothing here."

## Meaningful UX Features To Build

Prioritize features that help users inspect and act on graph data:

1. Keyboard graph navigation: arrow-key nearest-neighbor movement, Enter to
   select, Escape to clear, and `?` for a shortcut popover in host chrome.
2. Search and filter chrome: text search over node name/id/type/domain/status,
   with result count and fit-to-result behavior.
3. Edge inspector: selected node panel should show incoming, outgoing, edge
   type, label, and target/source status with focus actions.
4. Layout affordances: preserve selected node context when switching layout and
   animate only camera state, not layout properties.
5. Snapshot export: expose a typed helper or host pattern for exporting current
   graph data plus positions.
6. Live update status: when `wsUrl` becomes real, show connection state,
   queued mutations, and last applied update.

## Visual Quality Rules

- Use fixed type sizes for product UI. Avoid viewport-scaled font sizes in
  compact panels or tool surfaces.
- Keep graph chrome dense but organized: segmented controls for layout/theme,
  icon buttons for repeated tools, and clear labels for destructive actions.
- Avoid cards inside cards. Repeated items may be cards; page sections should
  be bands or direct layouts.
- Maintain a restrained palette. Use accent color for active selection,
  focus, and primary commands, not decoration.
- Check mobile and desktop screenshots for overlap. Text must fit its controls.

## Validation Checklist

For UX/accessibility work:

```bash
npm test
cd site && ./node_modules/.bin/tsc --noEmit
npm --prefix site run lint
npm --prefix site run build
git diff --check
```

Browser smoke must cover:

- desktop and mobile viewport
- force, hierarchical, and grid
- dark and light
- node click, background click, fit all
- drag behavior when renderer code changes
- console errors and failed network requests

## 2026-05-29 - Improve Screen Reader Experience for Decorative Canvases
**Learning:** The previous `role="presentation"` approach for overlay canvases (grid, labels, edges, frames) was triggering accessibility warnings (e.g. SonarCloud `typescript:S6819`). Assistive tech functions best when non-interactive decorative overlay canvases are completely omitted from the accessibility tree, which is adequately handled by `aria-hidden={true}` combined with `pointerEvents: "none"` without redundantly supplying a `role`. Furthermore, the main Graph canvas was using `role="application"` without a documented reason, but `role="region"` along with an `aria-roledescription="graph"` and keyboard shortcut advertisement provides a superior standard interaction model for an interactive custom control surface.
**Action:** Replaced `role="application"` with `role="region"`, added `aria-roledescription="graph"`, mapped the existing keyboard shortcuts `Escape + -` with `aria-keyshortcuts`, and removed the deprecated `role="presentation"` on the decorative overlays.

## 2026-05-30 - Prevent ARIA keyshortcuts parsing ambiguity
**Learning:** Screen readers often use space to separate distinct keyboard shortcuts and `+` to denote simultaneous key combinations (e.g., `Shift+A`). When advertising a literal `+` or space as a keyboard shortcut, using the literal characters in `aria-keyshortcuts` creates parsing ambiguity and fails to read correctly for users. The string 'Plus' should be used instead of '+' in `aria-keyshortcuts`.
**Action:** Used the text 'Plus' when adding `aria-keyshortcuts` to the zoom-in controls.
## 2024-06-19 - Explicit Roles for Container ARIA Labels
**Learning:** Screen readers typically ignore `aria-label` attributes on non-semantic container elements (like `<div>` or `<span>`) unless they are assigned an explicit ARIA role that supports naming.
**Action:** Always pair `aria-label` with an appropriate semantic role (e.g., `role="group"`, `role="region"`, or `role="navigation"`) when applying labels to structural `<div>` or `<span>` containers that group related UI elements.

## 2024-06-20 - Screen readers ignore aria-label on generic divs without roles
**Learning:** Found an accessibility issue pattern in `GraphDeck.tsx` (`mode-cluster`, `metrics-strip`) and `TypeCloud.tsx` where generic `<div>` elements were given an `aria-label` but lacked an ARIA role. Screen readers typically ignore `aria-label` on non-semantic container elements unless paired with a role, making those labels invisible to assistive technologies.
**Action:** Always pair `aria-label` with a semantic structural role (e.g., `role="group"` or `role="region"`) when applying labels to `<div>` or `<span>` containers that group related UI elements.

## 2024-06-25 - Prevent Global Formatting Overreach
**Learning:** Running tools like \`npx prettier --write .\` or repository-wide linters across all generated files (like WASM bindings or lockfiles) overrides strict constraint instructions to keep changes focused and small, causing massive noisy PR diffs that obscure UX improvements.
**Action:** When implementing UX improvements, only run targeted formatting or linting on the exact files modified (e.g. \`npx prettier --write path/to/file.tsx\`) to prevent widespread formatting changes and keep pull requests small and reviewable.

## 2026-05-30 - Maintain consistent screen reader context across duplicated UI elements
**Learning:** When UI patterns are duplicated across different regions of an application—such as node action buttons ("Frame", "Center") existing in both a persistent side panel (`InspectorRail.tsx`) and a temporary overlay modal (`NodeDetailsModal.tsx`)—inconsistent `aria-label` attributes lead to a fragmented screen reader experience. Furthermore, using landmark roles (`<section>`) without an accessible name (`aria-label`) causes them to announce generically or be ignored by assistive tech. Finally, buttons with visible text must ensure their exact string is contiguously present within their `aria-label` to comply with WCAG 2.5.3 (Label in Name) for voice-control users.
**Action:** Added matching `aria-label` attributes (e.g., "Frame selected node", "Center selected node") to duplicate action buttons in both the rail and modal. Provided unique `aria-label`s to the structural `<section>` elements (e.g., "Selected node details", "Connected edges", "Graph composition") to convert them into meaningful, navigable regions. Updated the "Add probe" button's `aria-label` to "Add probe node" to preserve the visible text contiguously.

## 2026-06-01 - Provide Context-Aware Empty States
**Learning:** Reusing generic default prompt copy in empty state UI can cause conflicting instructions. In the ConnectionList component, if a node with no connections is selected, it would still show "Select a node to view connections" instead of indicating there are no connections.
**Action:** Use context-aware logic to pass specific empty-state messages based on the current selection state (e.g. passing "No connected edges" if a node is already active).

## 2026-06-21 - [Ensure ARIA labels are read on non-semantic container elements]
**Learning:** Screen readers typically ignore `aria-label` attributes on non-semantic container elements (like `<div>` or `<span>`) unless they are assigned an explicit ARIA role that supports naming.
**Action:** Always pair `aria-label` with an appropriate semantic role (e.g., `role="group"`, `role="region"`, or `role="navigation"`) when applying labels to structural `<div>` or `<span>` containers that group related UI elements.

## 2026-05-31 - Semantic Roles for aria-label on generic containers
**Learning:** Adding `aria-label` to generic non-semantic elements like `<div>` or `<span>` will be ignored by many screen readers unless paired with an appropriate ARIA role. Using `role="group"` gives the container semantic meaning, allowing screen readers to reliably announce the group's label when a user navigates into it.
**Action:** Added `role="group"` to the `mode-cluster`, `metrics-strip` in `GraphDeck.tsx` and `type-cloud` in `TypeCloud.tsx` which had `aria-label`s on generic `div` containers.

## 2026-05-31 - Contextual Empty States in Shared Components
**Learning:** Shared components that display lists (like `ConnectionList`) often have a default empty state (e.g. "Select a node to view connections"). However, when context changes (e.g. a node *is* selected but has no edges), the default empty state becomes confusing and misleading. Passing contextual empty copy down from the parent prevents this UX issue.
**Action:** Passed down a dynamic `emptyCopy` prop to `ConnectionList` in `InspectorRail.tsx` that changes from "Select a node..." to "No connected edges" when a node is actively selected.

## 2026-06-25 - Programmatic Focus for Skip Links
**Learning:** "Skip-to-content" links target container elements (e.g., `<div id="graph-stage">`) to help keyboard and screen reader users bypass repetitive navigation. However, if the target container lacks a `tabIndex`, the browser will scroll to the element but fail to move programmatic focus, leaving the user's tab order unchanged and defeating the purpose of the skip link.
**Action:** Always add `tabIndex={-1}` to the target container of a "skip-to-content" link so it can receive programmatic focus and properly reset the document tab order.

## 2026-07-06 - Expand abbreviations and embed adjacent context in aria-labels
**Learning:** Screen readers announce the exact text content of elements. When abbreviations like "42n / 12e" are used for visual density on interactive cards, they read poorly ("42n slash 12e"). Furthermore, screen reader users navigating interactively via the Tab key will skip non-focusable adjacent context (e.g. edge connection types presented next to a button).
**Action:** Expand abbreviations into natural language (e.g. "42 nodes and 12 edges") within `aria-label`s. Ensure that crucial adjacent visual context (like edge connection type) is embedded directly into the interactive element's `aria-label` so that context is not lost during Tab-key navigation.

## 2026-07-28 - Exposing implicit keyboard shortcuts for canvas controls
**Learning:** For users who rely on screen readers and keyboard navigation, implicit keyboard shortcuts that control UI state (such as 'Escape' to clear selection or '-' and 'Plus' to zoom) are effectively invisible unless documented or announced. Adding these to a hidden generic shortcuts overlay may still miss users trying to interact with specific canvas controls directly.
**Action:** Always use the `aria-keyshortcuts` attribute (e.g. `aria-keyshortcuts="Escape"`) on interactive controls (like buttons for zooming or clearing selections) that have corresponding keyboard shortcuts to explicitly advertise the shortcuts to assistive technologies in context.

## 2026-07-29 - Provide visual feedback for canvas drag/pan interactions
**Learning:** During canvas interactions like dragging nodes or panning the camera, lacking immediate cursor feedback (such as changing the cursor to `grabbing`) makes the interface feel unresponsive. Furthermore, hover events that fire during the drag/pan motion can inappropriately overwrite the active drag cursor, causing a flickering or confusing visual state.
**Action:** Set the cursor to `grabbing` on `pointerdown` when initiating a drag or pan, suppress cursor updates from hover events during the `pointermove` gesture, and explicitly restore the cursor to its correct hover state on `pointerup`.


## 2026-07-31 - Keyboard Navigation for Canvas Panning
**Learning:** For interactive canvas applications, users who rely on keyboard navigation (e.g., screen reader users or power users without a mouse) are entirely locked out of spatial navigation if panning is restricted to pointer gestures (click-and-drag). Providing explicit arrow-key support to pan the view is a crucial accessibility and usability win that restores basic exploratory function.
**Action:** Added keyboard arrow key listeners to explicitly invoke camera panning in the WASM engine, and advertised the new shortcuts via the `aria-keyshortcuts` attribute.
## 2026-07-31 - Exposing implicit keyboard shortcuts for canvas controls
**Learning:** For users who rely on screen readers and keyboard navigation, implicit keyboard shortcuts that control UI state (such as 'f' to fit the graph) are effectively invisible unless documented or announced. Adding these to a hidden generic shortcuts overlay may still miss users trying to interact with specific canvas controls directly.
**Action:** Added keyboard shortcut listener for "f" to fit the graph and explicitly advertised it via `aria-keyshortcuts="Escape Plus - ArrowUp ArrowDown ArrowLeft ArrowRight F"` on the main Graph canvas.
## 2026-08-01 - Avoid tabIndex=-1 on aria-hidden decorative elements
**Learning:** Adding `tabIndex={-1}` to purely decorative elements (like overlay canvases) that use `aria-hidden={true}` creates an accessibility conflict by making them programmatically focusable despite being hidden to screen readers.
**Action:** Removed `tabIndex={-1}` from all decorative overlay canvases in the React bridge.
## 2024-07-25 - Prevent Focus on Hidden Elements
**Learning:** Adding `tabIndex={-1}` to elements with `aria-hidden={true}` (like decorative canvases) creates an accessibility conflict. The element is removed from the accessibility tree, but the `tabIndex` makes it programmatically focusable, which can cause confusing behavior for screen readers if focus is accidentally routed there.
**Action:** Remove `tabIndex={-1}` from purely decorative elements that have `aria-hidden={true}` to ensure they are fully excluded from interaction models.


## 2026-07-22 - Embed adjacent visual context in aria-labels
**Learning:** Screen reader users navigating interactively via the Tab key will skip non-focusable adjacent visual context (like edge connection types presented next to a button). Furthermore, setting an aria-label that only describes the target action (e.g., 'Inspect Node') overwrites the visible text content, hiding the rich edge information from assistive technology.
**Action:** Embed crucial adjacent visual context (such as connection direction and edge type) directly into the interactive element's `aria-label` (e.g., 'Inspect Node, outgoing depends_on edge') so that context is preserved during programmatic focus.

## 2024-08-05 - Explicit Semantic Grouping and Empty States in Inspection Panels
**Learning:** In side panels that display diverse information, rendering empty states as `null` leaves users wondering if data is loading or intentionally absent. Additionally, without structural semantic roles (`role="group"`), these subgroups blur together in the accessibility tree for screen reader users.
**Action:** Wrapped logical subgroups (properties, metadata, connections) with `role="group"` and `aria-label`s. Replaced `null` renders for empty dynamic lists with explicit visual empty states to confirm the intentional absence of data.

## 2026-07-23 - Prevent Context Loss in Interactive Lists
**Learning:** When interactive elements (like buttons) are embedded in a list with adjacent visual context (like edge connection types and direction arrows), screen reader users navigating via Tab lose this context because the button's `aria-label` completely overrides the visual child text. Furthermore, failing to include the visible text inside the `aria-label` violates WCAG 2.5.3 (Label in Name) and can break Voice Control software.
**Action:** Always embed the expanded natural language equivalent of adjacent context directly into the element's `aria-label`, ensuring the contiguous visible text is included.

## 2024-07-24 - Semantic groups and explicit visual empty states in inspection panels
**Learning:** Inspection panels (like NodeDetailsPanel) often render discrete logical groups (properties, metadata, connections) without semantic grouping. This causes screen readers to read a flat list of text without context. Furthermore, when dynamic lists (like connected edges) return empty, falling back to rendering `null` provides no visual or structural feedback to the user that the system explicitly verified the absence of data, making the UI feel broken or incomplete.
**Action:** Always wrap logical subgroups in structural elements with semantic roles (e.g., `role="group"` or `role="region"`) and descriptive `aria-label`s. Ensure dynamic lists have explicit styled empty states (e.g., "No connected edges" inside a dashed border) rather than rendering nothing.

## 2026-08-05 - Provide semantic grouping and empty states in inspection panels
**Learning:** In complex inspection panels, unlabelled logical subgroups (like tags, metadata, or connections) lack structural context for screen readers, while dynamic lists that simply render `null` when empty leave users questioning if data failed to load.
**Action:** Wrapped logical subgroups in `react/NodeDetailsPanel.tsx` with `role="group"` and `aria-label`s, and replaced the empty connections `null` render with an explicit "No connected edges" visual state.

## 2024-07-26 - Semantic grouping and explicit empty states in inspection panels
**Learning:** In inspection panels, screen reader users miss the logical grouping of properties, metadata, and connections if they aren't explicitly grouped. Furthermore, when dynamic lists (like metadata or connections) are empty and render `null`, the absence of data is ambiguous visually and programmatically.
**Action:** Wrap logical subgroups (properties, metadata, connections) with semantic roles (`role="group"` or `role="region"`) and `aria-label`s. Replace `null` renders for empty dynamic lists with explicit visual empty states to confirm the absence of data.

## 2026-08-01 - Add Semantic Roles and Explicit Empty States
**Learning:** In inspection panels, omitting semantic roles for grouped content makes it difficult for screen reader users to navigate logical sections. Moreover, rendering `null` for empty dynamic lists (like metadata or connections) fails to explicitly confirm to the user that data is actually absent.
**Action:** Wrapped logical subgroups (properties, metadata, connections) in `react/NodeDetailsPanel.tsx` with `role="group"` and `aria-label`s. Replaced `null` renders with explicit empty states ("No metadata" and "No connected edges") to confirm the absence of data.

## 2024-10-25 - Provide context for ambiguous data chips
**Learning:** Displaying bare property values as "chips" (e.g., `[Service]`, `[Active]`) without explicit labels forces sighted users to guess their meaning and provides no context to screen readers. Furthermore, using raw values as React keys throws errors if two properties have identical values.
**Action:** Map chip values to explicit semantic labels, assigning `title` (for visual hover) and `aria-label` (for screen readers), and use the distinct property name as the React key.

## 2026-07-26 - Add keyboard navigation to canvas
**Learning:** Canvas-first interaction needs non-pointer access, so we added keyboard handlers to the Graph component to allow panning, zooming, fitting, and clearing selection.
**Action:** Added onKeyDown handler to react/Graph.tsx mapping arrow keys to panning, +/- to zooming, F to fit, and Escape to clear selection.

## 2024-10-27 - Expose shortcuts via tooltips and handle CSS ellipsis
**Learning:** Icon-only buttons with keyboard shortcuts (like 'Close') hide both their function and shortcut from sighted users when lacking a `title` tooltip. Additionally, text truncated via CSS `ellipsis` becomes entirely inaccessible to sighted users without a hover tooltip.
**Action:** Always provide `title` attributes on icon-only buttons (including the shortcut if applicable) and on any container where `textOverflow: 'ellipsis'` is applied.

## 2024-10-27 - Apply true single ellipsis character for text truncation
**Learning:** Truncating text by simply slicing the string without any visual indication can be confusing, as users might mistake the truncated string for the full value. Adding an ellipsis makes it clear that the text has been shortened, and using the true single ellipsis character ('…') instead of three periods ('...') applies typographic visual polish.
**Action:** Appended the true single ellipsis character ('…') to truncated source IDs in `react/CompoundFramesOverlay.tsx` to provide visual feedback of truncation with typographic polish.

## 2024-08-06 - [Keyboard Focus Styles in React Components]
**Learning:** Purely inline-styled React components lack the pseudo-classes (`:focus-visible`, `:hover`) available in CSS, making it difficult to polyfill accessible keyboard navigation focus indicators without external stylesheets or complex JS event handling.
**Action:** When no CSS stylesheet is provided, use inline `onFocus` and `onBlur` combined with local component state (or direct DOM manipulation on `e.currentTarget`) to provide visual focus indicators (`outline`) for keyboard users.

## 2024-10-31 - Polyfill interaction states in inline-styled library components
**Learning:** When building React UI components for a library that strictly uses inline styles (to avoid external CSS dependencies), interactive elements like `<button>` inherently lack the browser's default CSS `:hover` feedback. Furthermore, applying `outline: "none"` to reset borders or relying on defaults can strip away explicit keyboard focus rings. Relying entirely on inline styles means these crucial UX and accessibility interaction states are lost by default.
**Action:** Explicitly polyfill `:hover` and `:focus-visible` states using React's event handlers (`onMouseEnter`, `onMouseLeave`, `onFocus`, `onBlur`) on all inline-styled interactive elements to preserve visual feedback for pointer and keyboard users.
