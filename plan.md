1.  **Extend `NodeData` in `react/types.ts`:**
    Modify `react/types.ts` using `replace_with_git_merge_diff` to add `x` and `y` properties to `NodeData`:
    ```
    <<<<<<< SEARCH
    export interface NodeData {
      id: string;
      name: string;
      type: string;
      domain: string;
      status: string;
      community?: number;
      meta: Record<string, unknown>;
    }
    =======
    export interface NodeData {
      id: string;
      name: string;
      type: string;
      domain: string;
      status: string;
      community?: number;
      meta: Record<string, unknown>;
      x?: number;
      y?: number;
    }
    >>>>>>> REPLACE
    ```

2.  **Add `get_positions_map` to `RenderEngine` (Rust):**
    Modify `crates/graph-main-wasm/src/engine/data.rs` using `replace_with_git_merge_diff`:
    ```
    <<<<<<< SEARCH
        pub fn rehydrate(&mut self) {
            self.buffers_dirty = true;
            self.needs_render = true;
        }
    }
    =======
        pub fn rehydrate(&mut self) {
            self.buffers_dirty = true;
            self.needs_render = true;
        }

        pub fn get_snapshot_positions(&self) -> JsValue {
            let mut pos_map: HashMap<&str, (f32, f32)> = HashMap::new();
            let mut i = 0;
            while i < self.node_ids.len() && i * 4 + 1 < self.positions.len() {
                let x = self.positions[i * 4];
                let y = self.positions[i * 4 + 1];
                pos_map.insert(&self.node_ids[i], (x, y));
                i += 1;
            }
            serde_wasm_bindgen::to_value(&pos_map).unwrap_or(JsValue::NULL)
        }
    }
    >>>>>>> REPLACE
    ```

3.  **Update `Graph.tsx` to expose `getSnapshot` on `GraphHandle`:**
    Modify `react/Graph.tsx` using `replace_with_git_merge_diff` to add `edgesRef`, `getSnapshot` type signature, and `getSnapshot` method in `useImperativeHandle`.

    First, add `getSnapshot` to `GraphHandle` definition (Lines 60-65ish):
    ```
    <<<<<<< SEARCH
      panToNode: (id: string) => void;
      focusFit: (id: string | null, padding?: number) => void;
      subscribeFrame: (
    =======
      panToNode: (id: string) => void;
      focusFit: (id: string | null, padding?: number) => void;
      getSnapshot: () => GraphSnapshot | null;
      subscribeFrame: (
    >>>>>>> REPLACE
    ```

    Next, add `edgesRef` right after `nodeDataByIdRef`:
    ```
    <<<<<<< SEARCH
      const pendingFitRef = useRef(false);
      const nodeDataByIdRef = useRef<Map<string, NodeData>>(new Map());
      const draggingNodeRef = useRef<string | null>(null);
    =======
      const pendingFitRef = useRef(false);
      const nodeDataByIdRef = useRef<Map<string, NodeData>>(new Map());
      const edgesRef = useRef<EdgeData[]>([]);
      const draggingNodeRef = useRef<string | null>(null);
    >>>>>>> REPLACE
    ```

    Update `applySnapshot` to populate `edgesRef`:
    ```
    <<<<<<< SEARCH
        const nodeDataById = new Map<string, NodeData>();
        for (const node of snap.nodes) nodeDataById.set(node.id, node);
        nodeDataByIdRef.current = nodeDataById;

        if (snap.nodes.length === 0 && snap.edges.length === 0) {
    =======
        const nodeDataById = new Map<string, NodeData>();
        for (const node of snap.nodes) nodeDataById.set(node.id, node);
        nodeDataByIdRef.current = nodeDataById;
        edgesRef.current = snap.edges;

        if (snap.nodes.length === 0 && snap.edges.length === 0) {
    >>>>>>> REPLACE
    ```

    Finally, add `getSnapshot` implementation to `useImperativeHandle` near line 515:
    ```
    <<<<<<< SEARCH
          panToNode: (id) => {
            engineRef.current?.pan_to_node(id);
            requestRender();
          },
          focusFit: (id, padding = 80) => {
            engineRef.current?.focus_fit(id ?? undefined, padding);
            requestRender();
          },
          subscribeFrame: (cb) => {
    =======
          panToNode: (id) => {
            engineRef.current?.pan_to_node(id);
            requestRender();
          },
          focusFit: (id, padding = 80) => {
            engineRef.current?.focus_fit(id ?? undefined, padding);
            requestRender();
          },
          getSnapshot: () => {
            if (!engineRef.current) return null;
            const posMap = engineRef.current.get_snapshot_positions() as Record<string, [number, number]>;
            const nodes = Array.from(nodeDataByIdRef.current.values()).map(node => {
              const pos = posMap[node.id];
              if (pos) {
                return { ...node, x: pos[0], y: pos[1] };
              }
              return { ...node };
            });
            return {
              nodes,
              edges: edgesRef.current,
              meta: {
                node_count: nodes.length,
                edge_count: edgesRef.current.length,
              }
            };
          },
          subscribeFrame: (cb) => {
    >>>>>>> REPLACE
    ```

4.  **Update `react/README.md`, `.jules/feature-roadmap.md`, and `.jules/bolt.md` via `run_in_bash_session`:**
    Using `run_in_bash_session`:
    Update README.md:
    ```bash
    sed -i 's/\/\/ Later:/graphRef.current?.getSnapshot();\n\n\/\/ Later:/' react/README.md
    ```
    Update roadmap (remove item):
    ```bash
    sed -i '/Snapshot plus position export/d' .jules/feature-roadmap.md
    ```
    Update bolt.md journal using `cat << 'EOF' >>`:
    ```bash
    cat << 'EOF' >> .jules/bolt.md

    ## 2026-05-29 - [Snapshot plus position export]
    **Learning:** Added `getSnapshot()` to `GraphHandle` interface and Rust engine to retrieve node layout positions, allowing state persistence. Extended `NodeData` to support `x` and `y` layout values natively, which eliminates the need to maintain parallel position mappings externally.
    **Action:** Updated `react/types.ts` `NodeData` interface to include `x?: number` and `y?: number`. Added `get_snapshot_positions` mapped method to `crates/graph-main-wasm/src/engine/data.rs` to expose WASM buffer coordinates cleanly. Updated `react/Graph.tsx` imperative handle to construct and merge node properties, outputting `{ nodes, edges, meta }` on demand.
    EOF
    ```

5.  **Verify Code and Run tests & linters:**
    Execute `run_in_bash_session` to verify codebase builds and passes tests:
    ```bash
    cargo fmt
    cargo clippy --all-targets -- -D warnings
    pnpm install
    pnpm exec tsc --noEmit --project react/tsconfig.json
    pnpm test
    git status
    ```

6.  **Complete pre-commit steps:**
    Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
