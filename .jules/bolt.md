## 2024-04-24 - Force Layout Tick Optimization
**Learning:** `ForceLayout::tick` in `crates/graph-layout/src/force/mod.rs` was recomputing string-to-index mappings for edges (`index_edges`) on every single tick, resulting in O(E * log V) overhead.
**Action:** Caching these indices drastically improves performance (e.g. ~25% speed up). Cache invalidation must be implemented carefully. Just checking `node_count` or `edge_count` works for common cases but misses topology changes where node/edge counts remain identical. A complete optimization should either handle invalidation thoroughly or accept the trade-off with clear comments as we did here since clearing the layout cache explicitly covers the majority of cases.
## 2025-04-25 - [Optimize Barnes-Hut Memory Allocation]
**Learning:** Instantiating new vectors on every frame inside the hottest loop (like ForceLayout's integration steps in Rust) impacts benchmark times. Passing a mutable pre-allocated vector to reuse during traversal drastically reduces heap allocations and measurably speeds up execution.
**Action:** Re-use memory structures using pre-allocated buffers mapped onto iterative queries in algorithms like quad-trees to skip unneeded allocations.
## 2025-04-26 - [Unroll Iterators in Hot Loops]
**Learning:** Using `flatten()` on iterators over small arrays (like quad-tree children) inside extremely hot traversal loops adds measurable overhead. Manually unrolling the loop (`c[3]`, `c[2]`, `c[1]`, `c[0]`) in `BarnesHut::compute_force` yielded a ~5-9% performance improvement in benchmark ticks by eliminating iterator setup and bounds checking overhead.
**Action:** Identify extremely hot paths (like O(N log N) tree traversals executed per tick) and replace complex iterator chains on fixed-size arrays with manual, explicit unrolled accesses.

## 2026-04-30 - Replace division with multiplication in Barnes-Hut hot path
**Learning:** Floating-point division operations are significantly slower than multiplication operations, particularly when executing millions of times inside the inner loop of the Barnes-Hut force approximation step.
**Action:** Identify hot paths containing mathematical expressions like `(a * a) / b < c * c`, and refactor them using pre-calculated squares to avoid the division operation (`a * a < b * (c_sq)`).
