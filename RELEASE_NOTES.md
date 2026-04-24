# Release Notes: v0.2.2

## Showcase-Ready JSON And Styling Release

`v0.2.2` makes the package suitable for the public showcase's interactive JSON and legend styling controls. The core change is that graph type information is now preserved as user-defined strings from snapshot ingestion through worker layout, renderer styling, legend extraction, filtering, and React overlays.

## Highlights

### User-Defined Type Styling

`GraphScene` now accepts `themeOverrides`, and `mergeGraphTheme` is exported for custom composition. Apps can define node and edge styles keyed by the same type strings found in their graph data or legend JSON:

```tsx
<GraphScene
  snapshot={snapshot}
  themeMode="dark"
  themeOverrides={{
    nodeTypes: {
      risk: { shape: "hexagon", borderColor: "#f97316" },
    },
    edgeTypes: {
      blocks: { color: "#22c55e", width: 3, style: "dashed" },
    },
  }}
/>
```

### Camera And Focus Fixes

The camera now treats `x/y` consistently as the viewport center. Wheel and pinch zoom preserve the world point under the cursor, `fit()` centers the full graph, and `focusFit(id)` centers the selected node or its 1-hop neighborhood reliably.

### Static Force Layout

Force layout computes a settled placement and stops instead of leaving the graph floating. Dragging a node updates that node and its connected edge geometry without restarting background drift.

### Chrome Layering

`GraphScene` now wraps app chrome above renderer overlays. Canvas labels remain clipped to their nodes and no longer visually cover stats, legends, or inspector chrome supplied through the `chrome` slot.

## Upgrade Notes

### Existing Consumers

Existing `Graph` and `GraphScene` integrations remain valid. `themeOverrides` and `mergeGraphTheme` are additive.

### Snapshot Type Semantics

Node `type`, edge `type`, and node `status` values are no longer limited to built-in package enums internally. Built-in style presets still exist, but unknown type keys are preserved and fall back to default visual styles unless the app supplies overrides.

## Known Limitations

- `wsUrl` / `authToken` remain experimental.
- `Graph` by itself is canvas-only; use `GraphScene` or exported overlays for labels and chrome.
- The internal SDF text renderer is still placeholder-grade; production labels come from Canvas2D overlays.
- WebGL2 remains the only rendering backend.
