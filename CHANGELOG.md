# Changelog

All notable changes to `@invariantcontinuum/graph` will be documented in this file.

## [0.1.3] - 2026-04-10

### Added
- **Web Worker layout engine** (`graph-worker-wasm`): Force-directed and hierarchical layout computation runs entirely off the main thread, eliminating UI freezes during layout
- **Frame-budgeted rendering** (`graph-main-wasm`): Main-thread rendering operates within a strict 12ms frame budget with automatic overrun detection
- **CPU spatial index**: O(1) node picking via a flat grid replaces synchronous GPU `readPixels`, removing the main source of interaction jank
- **Transferable position buffers**: Worker-to-main-thread communication uses zero-copy `Float32Array` transfer via `postMessage` with `Transferable`
- **On-demand render loop**: After layout convergence, the render loop stops scheduling frames until new data arrives or the user interacts, dropping idle CPU to near zero
- **Worker bootstrap** (`react/worker.ts`): Dedicated Web Worker entry point with promise-guarded initialization preventing double-init race conditions
- **Edge data transfer**: Edge geometry is sent as a separate Transferable buffer on snapshot load, decoupled from per-tick position updates

### Changed
- **React `Graph` component rewritten**: Now orchestrates a Web Worker (layout) and main-thread WASM module (rendering) instead of a single monolithic engine
- **npm package exports**: Main entry is now `graph_main_wasm.js`; Worker module available at `./worker` export; React wrapper unchanged at `./react`
- **`onReady` callback signature**: Changed from `(engine: any) => void` to `() => void` — the engine is no longer directly exposed to consumers
- **CI pipeline**: Builds and publishes two WASM targets (worker + main) instead of one

### Removed
- **`graph-wasm` crate**: Replaced by `graph-worker-wasm` and `graph-main-wasm`
- **`useGraphEngine` hook**: Engine lifecycle is now managed internally by the `Graph` component
- **GPU pick buffer for interaction**: Replaced by CPU spatial grid (no more synchronous `gl.readPixels`)

## [0.1.1] - 2026-04-09

### Added
- Initial WASM+WebGL2 graph engine with force-directed and hierarchical layout
- React wrapper component (`Graph.tsx`)
- Node, edge, hull, and text renderers (text uses placeholder atlas)
- GPU-based color-ID picking for node interaction
- WebSocket support for real-time graph updates
- Barnes-Hut quadtree for O(n log n) force computation

## [0.1.0] - 2026-04-09

### Added
- Initial release with core graph data structures and rendering pipeline
