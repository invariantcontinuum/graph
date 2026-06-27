# Jules Palette Playbook: Accessibility, UX, and Design

Last updated: 2026-05-29

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

## 2026-06-27 - Make skip-to-content target focusable
**Learning:** Adding a "Skip to content" link that points to a specific container ID using an `href="#target-id"` anchor will visually scroll the page, but screen readers and keyboard navigation require that target container to programmatically receive focus. If the target is a generic `<div>` without a `tabIndex`, it won't receive focus, leaving the user's sequential tab order unchanged and defeating the purpose of the skip link.
**Action:** Always add `tabIndex={-1}` to the target container of a skip link (e.g., `<div id="graph-stage">`) so it can be programmatically focused and properly reset the tab order for assistive technologies without interrupting natural page flow.
