# @invariantcontinuum/graph

WebGPU/WebGL2 graph visualization engine compiled to WebAssembly, with a React wrapper for embedding in web applications.

## Package Structure

```
pkg/
  graph_wasm.js          WASM entry point (package main)
  graph_wasm_bg.wasm     Compiled WASM binary
  react/
    Graph.tsx            React component wrapper
    types.ts             TypeScript type definitions
```

## Usage

### React

```tsx
import { Graph } from "@invariantcontinuum/graph/react/Graph";

<Graph
  snapshot={graphData}
  layout="force"
  onNodeClick={(node) => console.log(node)}
/>
```

### WASM Direct

```typescript
import init, { GraphEngine } from "@invariantcontinuum/graph";

await init();
const engine = new GraphEngine(canvas);
engine.load_snapshot(data);
```

## Crate Architecture

| Crate | Role |
|-------|------|
| `graph-core` | Data structures, snapshot parsing, community detection |
| `graph-layout` | Layout algorithms (force-directed, grid, radial) |
| `graph-render` | WebGL2 rendering pipeline (nodes, edges, text, hulls) |
| `graph-wasm` | WASM bindings and JS API surface |

## Known Limitations (v0.1.x)

- **Text labels do not render.** The SDF text pipeline is structurally complete but uses a 1x1 placeholder atlas. Real MSDF atlas generation is planned for v0.2.
- **WebGL2 only.** WebGPU backend is not yet implemented.
- **No accessibility.** Keyboard navigation and screen reader support are not yet available.

## Development

Requires `wasm-pack` and a Rust toolchain with the `wasm32-unknown-unknown` target.

```bash
# Build WASM package
wasm-pack build crates/graph-wasm --target web --out-dir ../../pkg

# Run tests
cargo test --workspace
```

## License

MIT
