# `@invariantcontinuum/graph/react`

React bindings for the `@invariantcontinuum/graph` WASM+WebGL2 engine.

The package is **domain-agnostic** — node types, edge types, and statuses are
plain strings throughout the engine. You bring your own type names; the
engine renders whatever theme you hand it.

## Quick start

```tsx
import { GraphScene } from "@invariantcontinuum/graph/react";

const snapshot = {
  nodes: [
    { id: "n1", name: "Order", type: "entity", status: "ok" },
    { id: "n2", name: "Fulfilment", type: "process", status: "ok" },
  ],
  edges: [{ id: "e1", source: "n1", target: "n2", type: "triggers" }],
};

export function App() {
  return (
    <GraphScene
      themeMode="dark"
      snapshot={snapshot}
      onNodeClick={(node) => console.log("node details", node)}
    />
  );
}
```

`type` and `status` on every node, and `type` on every edge, are arbitrary
strings. The default theme ships with fallbacks so unknown keys still render.

## Custom theme (bring your own legend)

`themeOverrides` lets you style arbitrary type strings without forking the
engine. The engine merges your overrides onto the default palette, so you only
need to specify what differs.

```tsx
import {
  GraphScene,
  type GraphThemeOverrides,
} from "@invariantcontinuum/graph/react";

const themeOverrides: GraphThemeOverrides = {
  nodeTypes: {
    entity: {
      shape: "roundrectangle",
      color: "#1e293b",
      borderColor: "#38bdf8",
      labelColor: "#e2e8f0",
    },
    process: {
      color: "#431407",
      borderColor: "#f97316",
    },
  },
  edgeTypes: {
    triggers: { color: "#fbbf24", style: "dashed" },
  },
  nodeStatuses: {
    degraded: { borderColor: "#ef4444", pulse: true },
  },
};

<GraphScene
  themeMode="dark"
  snapshot={snapshot}
  themeOverrides={themeOverrides}
/>;
```

Any node type not in `themeOverrides.nodeTypes` falls back to
`theme.defaultNodeStyle`; same for edges and statuses.

## Custom legend panel

`onLegendChange` fires whenever the engine recomputes the visible type set
(e.g. after `load_snapshot`). Use it to build app-owned legend UI that
matches the engine's view of the graph:

```tsx
import { useState } from "react";
import {
  GraphScene,
  type LegendSummary,
} from "@invariantcontinuum/graph/react";

export function App() {
  const [legend, setLegend] = useState<LegendSummary | null>(null);

  return (
    <div className="flex">
      <GraphScene
        themeMode="dark"
        snapshot={snapshot}
        onLegendChange={setLegend}
      />
      {legend && (
        <aside>
          <h3>Node types</h3>
          <ul>
            {legend.nodeTypes.map((t) => (
              <li key={t.typeKey} style={{ color: t.color }}>
                {t.typeKey} — {t.count}
              </li>
            ))}
          </ul>
        </aside>
      )}
    </div>
  );
}
```

## Imperative handle

For pan-to-node, focus-fit, and subscriptions, pass a ref:

```tsx
import { useRef } from "react";
import { GraphScene, type GraphHandle } from "@invariantcontinuum/graph/react";

const graphRef = useRef<GraphHandle | null>(null);

<GraphScene ref={graphRef} themeMode="dark" snapshot={snapshot} />;

// Later:
graphRef.current?.panToNode("n1");
graphRef.current?.focusFit("n1", 32);
```

## Scene layering and click payloads

`GraphScene` stacks rendering layers deliberately: `GridOverlay` is the background, compound source frames are the next background layer, the WebGL engine renders edges and nodes above them, labels sit above the engine, and the chrome slot is topmost.

`onNodeClick` and `onNodeHover` receive the full `NodeData` object from the active snapshot, not just an id. This lets host apps open an inspector or details modal without maintaining a duplicate id-to-node cache.

## Shapes

Built-in shapes (resolved by `shape` in your theme): `circle`, `diamond`,
`square`, `hexagon`, `triangle`, `octagon`, `roundrectangle`, `barrel`.
Unknown shape names fall back to `circle`.

The default type table renders every bundled node type as a rounded rectangle card with a light border. Custom shapes remain supported through `themeOverrides` for apps that need symbolic geometry.

## Edge styles

`style` on an edge-type override accepts: `solid` (default), `dashed`,
`short-dashed`, `dotted`. `animate: true` on an edge type flows a dash march
along the edge.

## Public exports

See `index.ts` — the public surface is:

- Components: `Graph`, `GraphScene`, `GridOverlay`, `CompoundFramesOverlay`,
  `LabelOverlay`, `EdgeLabelsOverlay`.
- Theme helpers: `buildGraphTheme`, `mergeGraphTheme`,
  `graphThemeToEngineJson`, `typeStyleFor`, `TYPE_STYLES`, `DEFAULT_STYLE`.
- Palette constants: `LIGHT`, `DARK`, `NODE_TYPES`, `EDGE_TYPES` — defaults
  wired up for a quick start; replace any time with your own via
  `themeOverrides`.
- Types: `GraphSnapshot`, `NodeData`, `EdgeData`, `LayoutType`,
  `LegendSummary`, `GraphTheme`, `GraphThemeOverrides`, and more.
