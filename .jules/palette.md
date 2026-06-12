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

## 2026-05-30 - Overlay Accessibility Fix
**Learning:** The SonarCloud accessibility rule `typescript:S6819` flags `role="presentation"` when used on decorative canvas elements that are already `aria-hidden={true}` and non-interactive. The role is redundant because these overlays have no pointer handlers, no `tabIndex`, and screen readers already ignore them.
**Action:** Never use `role="presentation"` on supplementary overlay canvases. Omit the role and rely on `aria-hidden={true}` plus CSS `pointerEvents: "none"` to keep them out of the accessibility tree and prevent interaction.

## 2026-06-01 - Showcase Empty States And Tooltips
**Learning:** Inspector panels that only say "No active node" are less useful than empty states that explain the next action. Main graph controls also benefit from native `title` tooltips when the visible label is short.
**Action:** Make showcase empty states instructional and add concise native tooltips to controls without cluttering the visible UI.

## 2026-06-11 - Progressive Dismissal for Escape Key
**Learning:** In complex UIs with multiple overlapping interactive states (like a scenario drawer, node details modal, and selected node state), simultaneously dismissing all states on a single 'Escape' keypress can be jarring and violate user expectations.
**Action:** Implement a progressive dismiss pattern. For 'Escape', check states in reverse z-index or interaction order (e.g., close drawer first, then details modal, then clear selection), allowing users to hierarchically back out of interactions without aggressively clearing all underlying state.
