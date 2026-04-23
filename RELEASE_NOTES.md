# Release Notes: v0.3.0

## Scene Composition And Package Ergonomics

`v0.3.0` turns `@invariantcontinuum/graph` into a more complete package for app teams. The worker-split rendering architecture from the earlier releases is still the foundation, but the public surface now adds a higher-level React scene, overlay exports, theme helpers, grid layout support, and a broader imperative API for focus and camera control.

## Highlights

### `GraphScene` Becomes The Recommended Integration Surface

The package now exports a high-level `GraphScene` component from `@invariantcontinuum/graph/react`. It composes:

- the WebGL/WASM graph canvas
- the camera-synced grid overlay
- compound source frames
- Canvas2D labels
- theme conversion from `themeMode`
- an app-owned `chrome` slot for legends and toolbars

This means most consumers no longer need to build their own scene shell around the low-level `Graph` component.

### New React-Level APIs

The low-level `Graph` component remains available and now exposes more of the renderer's current capabilities:

- `layout` accepts `"grid"` in addition to `"force"` and `"hierarchical"`
- `onLegendChange` surfaces theme-resolved legend data
- `onBackgroundClick` lets hosts clear selection on empty-canvas clicks
- `onPositionsReady` signals the first post-layout positions
- `GraphHandle` now includes `panToNode`, `focusFit`, `subscribeFrame`, and `subscribeEdges`

### Theme Toolkit Exports

The React package now exports the theme primitives used by the bundled scene:

- `buildGraphTheme`
- `graphThemeToEngineJson`
- `LIGHT` / `DARK`
- per-type style and palette constants
- individual overlay components for custom composition

This makes it practical to stay visually aligned with the engine even when the application owns the legend, panels, or scene layering.

### Interaction And Layout Refinements

The current package state also includes a number of behavior upgrades relative to the earlier `0.2.x` line:

- unified pointer handling for mouse, touch, and pen gestures
- pinch zoom support
- drag-to-pin interaction flowing through worker messages
- viewport-aware grid layout via live canvas aspect ratio updates
- id-aligned position updates so click/focus resolution stays matched to the active worker order
- redraw recovery when an early converged layout would otherwise leave the canvas blank after an initial `0x0` paint

## Upgrade Notes

### Existing `Graph` Users

Existing `Graph` integrations remain valid. `v0.3.0` is primarily an additive release for React consumers.

### Recommended Migration

If your app currently wraps `Graph` with its own overlay and theme plumbing, the recommended migration is:

```diff
- import { Graph } from "@invariantcontinuum/graph/react";
+ import { GraphScene } from "@invariantcontinuum/graph/react";
```

Then move your scene-level UI into the `chrome` prop and drive theme selection through `themeMode`.

### Layout Choice

`"grid"` is now the best default when you want a stable, readable initial topology without waiting for force simulation convergence. Use `"force"` when organic clustering matters more than deterministic placement.

## Known Limitations

- The React API still exposes `wsUrl` / `authToken`, but worker-side live WebSocket mutation ingestion is not fully wired yet.
- `Graph` by itself is still canvas-only; use `GraphScene` or the exported overlays for readable labels and scene chrome.
- The core text renderer remains placeholder-grade internally; production labels currently come from Canvas2D overlays.
- WebGL2 remains the only rendering backend.
