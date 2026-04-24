# @invariantcontinuum/graph

WASM + WebGL2 graph renderer for large knowledge graphs, with layout work offloaded to a Web Worker and a React surface that ranges from a low-level `<Graph>` canvas bridge to a full `<GraphScene>` with overlays and theme wiring.
<img width="1327" height="677" alt="image" src="https://github.com/user-attachments/assets/fd29f11e-4e25-41cb-890e-828109b4382e" />

## Installation

```bash
npm install @invariantcontinuum/graph
```

GitHub Packages requires a scoped registry entry in `.npmrc`:

```ini
@invariantcontinuum:registry=https://npm.pkg.github.com
```

## Package Exports

| Export | Purpose |
| --- | --- |
| `@invariantcontinuum/graph` | Low-level main-thread WASM entry (`RenderEngine`) |
| `@invariantcontinuum/graph/worker` | Worker-side WASM entry for layout and snapshot processing |
| `@invariantcontinuum/graph/react` | React components, overlays, theme helpers, and TypeScript types |

## Recommended Usage

`GraphScene` is the recommended entry point for application code. It composes the WebGL canvas, overlays, theme conversion, and a chrome slot in one component.

```tsx
import { useState } from "react";
import {
  GraphScene,
  type GraphSnapshot,
  type LegendSummary,
} from "@invariantcontinuum/graph/react";

function GraphPage({ snapshot }: { snapshot: GraphSnapshot }) {
  const [legend, setLegend] = useState<LegendSummary | null>(null);

  return (
    <div style={{ width: "100%", height: "720px" }}>
      <GraphScene
        snapshot={snapshot}
        themeMode="dark"
        layout="grid"
        showCommunities
        onLegendChange={setLegend}
        onNodeClick={(node) => console.log("node", node.id)}
        chrome={
          legend ? (
            <aside>
              {legend.node_types.map((entry) => (
                <div key={entry.type_key}>{entry.label}</div>
              ))}
            </aside>
          ) : null
        }
      />
    </div>
  );
}
```

Use `Graph` directly when you want to provide your own overlays, legend, or scene composition:

```tsx
import { Graph, type GraphHandle } from "@invariantcontinuum/graph/react";
import { useRef } from "react";

function BareGraph({ snapshot }: { snapshot: GraphSnapshot }) {
  const ref = useRef<GraphHandle>(null);

  return (
    <Graph
      ref={ref}
      snapshot={snapshot}
      layout="force"
      onReady={() => ref.current?.fit(80)}
      onNodeClick={(node) => console.log(node.id)}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
```

## React Surface

### `GraphScene`

`GraphScene` wraps `Graph` and wires the package overlays together:

- `GridOverlay` for the camera-synced background grid
- `CompoundFramesOverlay` for source-group frames
- `LabelOverlay` for Canvas2D node labels
- Theme conversion from `themeMode` into the engine JSON format
- `chrome` slot for app-owned legend, toolbar, or inspector UI

Key props:

| Prop | Type | Description |
| --- | --- | --- |
| `themeMode` | `"light" \| "dark"` | Required. Builds the package theme and engine JSON from a single mode flag |
| `snapshot` | `GraphSnapshot` | Snapshot payload to render |
| `layout` | `"force" \| "hierarchical" \| "grid"` | Layout strategy passed through to the worker |
| `focusIds` | `Set<string> \| null` | Spotlight neighborhood for heavy dimming outside the focus set |
| `chrome` | `ReactNode` | UI rendered above the scene (legend, toolbar, stats, etc.) |
| `nodeSourceIds` | `Record<string, string \| null>` | Enables source grouping frames when paired with `sourceLabels` |
| `sourceLabels` | `Record<string, string>` | Human-readable labels for compound frames |

### `Graph`

`Graph` is the lower-level React bridge between the canvas, the main-thread WASM renderer, and the worker.

| Prop | Type | Description |
| --- | --- | --- |
| `snapshotUrl` | `string` | Fetch a snapshot JSON payload over HTTP |
| `snapshot` | `GraphSnapshot` | Pass snapshot data directly |
| `layout` | `"force" \| "hierarchical" \| "grid"` | Active layout mode. Default: `"force"` |
| `theme` | `Record<string, unknown>` | Engine JSON theme object |
| `filter` | `GraphFilter \| null` | Worker-side filtering by type, domain, or status |
| `spotlightIds` | `string[] \| null` | Explicit spotlight ids when composing the scene yourself |
| `showCommunities` | `boolean` | Toggle community hull rendering |
| `onNodeClick` | `(node: NodeData) => void` | Fires when a node is clicked |
| `onBackgroundClick` | `() => void` | Fires when empty canvas is clicked |
| `onNodeHover` | `(node: NodeData \| null) => void` | Fires on hover enter/leave |
| `onLegendChange` | `(legend: LegendSummary) => void` | Receives theme-resolved node and edge legend data |
| `onStatsChange` | `(stats: GraphStats) => void` | Receives node/edge/violation counts |
| `onPositionsReady` | `() => void` | Fires after the first post-layout positions arrive |
| `onReady` | `() => void` | Fires after engine/worker initialization |
| `wsUrl` | `string` | Reserved for live updates; currently experimental |
| `authToken` | `string` | Token paired with `wsUrl`; currently experimental |
| `className` | `string` | CSS class for the canvas |
| `style` | `CSSProperties` | Inline canvas styles |

### `GraphHandle`

The forwarded ref exposes imperative controls:

| Method | Description |
| --- | --- |
| `fit(padding?)` | Fit the full graph into view |
| `zoomIn()` / `zoomOut()` | Step zoom the camera |
| `relayout(layout)` | Switch worker layout mode |
| `setTheme(theme)` | Replace the engine theme |
| `setData(snapshot)` | Replace snapshot data |
| `selectNode(id)` | Focus a node without changing zoom |
| `panToNode(id)` | Pan to a node while preserving zoom |
| `focusFit(id, padding?)` | Fit the 1-hop neighborhood / selected focus |
| `subscribeFrame(cb)` | Subscribe to per-frame positions + VP matrix |
| `subscribeEdges(cb)` | Subscribe to edge geometry updates |

## Themes And Overlays

`@invariantcontinuum/graph/react` also exports the building blocks used by `GraphScene`:

| Export | Purpose |
| --- | --- |
| `buildGraphTheme(mode)` | Build the package's high-level light/dark theme |
| `graphThemeToEngineJson(theme)` | Convert the theme into the JSON schema consumed by the WASM engine |
| `GridOverlay` | Background grid tied to the camera transform |
| `CompoundFramesOverlay` | Dashed grouping frames around `source_id` clusters |
| `LabelOverlay` | Canvas2D text overlay for readable node labels |
| `EdgeLabelsOverlay` | Optional edge-type pill overlay for custom scene composition |
| `LIGHT`, `DARK`, `NODE_TYPES`, `EDGE_TYPES` | Palette tokens and theme constants |

## Snapshot Format

```ts
interface GraphSnapshot {
  nodes: {
    id: string;
    name: string;
    type: string;
    domain: string;
    status: string;
    community?: number;
    meta: Record<string, unknown>;
  }[];
  edges: {
    id: string;
    source: string;
    target: string;
    type: string;
    label: string;
    weight: number;
  }[];
  meta: {
    node_count: number;
    edge_count: number;
    last_updated?: string;
  };
}
```

The bundled theme presets recognize node types such as `service`, `source`, `database`, `cache`, `data`, `policy`, `adr`, `incident`, `external`, `config`, `script`, `doc`, and `asset`, and edge types such as `depends`, `depends_on`, `violation`, `enforces`, `why`, and `drift`.

## Architecture

The runtime splits responsibilities across two WASM targets:

```text
Main Thread                                 Worker
+--------------------------------------+    +----------------------------------+
| graph-main-wasm                      |    | graph-worker-wasm                |
| - WebGL2 render passes               |    | - Snapshot ingestion             |
| - Camera, hit-testing, focus         |    | - Force / hierarchical / grid    |
| - Drag interaction + worker messages |    | - Filter + spotlight evaluation  |
| - Theme application + legend         |    | - Transferable positions/edges   |
+--------------------------------------+    +----------------------------------+
                ^                                            ^
                |                                            |
        React Graph / GraphScene                  react/worker.ts bootstrap
```

`GraphScene` sits above this split and keeps the overlays, theme system, and chrome slot synchronized with the engine.

## Known Limitations

- `wsUrl` / `authToken` are exposed on the React API, but worker-side live WebSocket mutation ingestion is not fully wired yet. Snapshot-first usage is the supported path.
- The low-level `Graph` component renders only the WebGL canvas. Readable labels and scene chrome come from `GraphScene` or manual overlay composition.
- The WASM text pipeline still uses placeholder SDF text internals; the package currently relies on Canvas2D overlays for production label rendering.
- WebGL2 is required.
- Accessibility semantics are minimal because the renderer is canvas-first.

## Development

Requires `wasm-pack`, Rust nightly, and the `wasm32-unknown-unknown` target.

```bash
# Build worker wasm
wasm-pack build --target web --out-dir ../../pkg crates/graph-worker-wasm --out-name graph_worker_wasm

# Build main-thread wasm
wasm-pack build --target web --out-dir ../../pkg-main crates/graph-main-wasm --out-name graph_main_wasm
cp pkg-main/graph_main_wasm* pkg/ && rm -rf pkg-main

# Run Rust tests
cargo test --workspace
```

## License

MIT
