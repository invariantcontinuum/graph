## 2024-04-24 - Force Layout Tick Optimization
**Learning:** `ForceLayout::tick` in `crates/graph-layout/src/force/mod.rs` was recomputing string-to-index mappings for edges (`index_edges`) on every single tick, resulting in O(E * log V) overhead.
**Action:** Caching these indices drastically improves performance (e.g. ~25% speed up). Cache invalidation must be implemented carefully. Just checking `node_count` or `edge_count` works for common cases but misses topology changes where node/edge counts remain identical. A complete optimization should either handle invalidation thoroughly or accept the trade-off with clear comments as we did here since clearing the layout cache explicitly covers the majority of cases.
## 2024-04-24 - Force Layout Barnes Hut Optimization
**Learning:** In `barnes_hut.rs`, the `compute_force` function was allocating a new `Vec<&QuadNode>` (the `stack`) for every single node in every single tick. With thousands of nodes, this results in significant allocation overhead.
**Action:** Passing a mutable `Vec` down from `integrate_step` and clearing it avoids continuous allocation and drops execution time by ~13-25%.
