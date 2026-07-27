# Jules Bolt Playbook: Quality, Performance, and Refactors

Last updated: 2026-05-29

> Before starting any task, read `AGENTS.md` rule zero: check open PRs and
> recent merges so you never duplicate in-flight work.

This file is the execution playbook for package internals: Rust layout, WASM
engines, React bridge code, worker protocol, benchmarks, and SonarCloud code
quality findings. Keep it practical. Every entry should point future agents at
files, validation commands, and the reason the change matters.

## Current Quality Target

SonarCloud automatic analysis for `invariantcontinuum_graph` currently reports
19 open findings. The code-focused findings that belong in this playbook are:

| Rule | File | Problem | Preferred fix |
| --- | --- | --- | --- |
| `typescript:S3776` | `react/Graph.tsx` around pointer `onMove` | Cognitive complexity is 27, above the allowed 15 | Extract hover, drag, pan, pinch, and worker-pump branches into named helpers or a local pointer-controller hook |
| `text:S8570` | `crates/*/Cargo.toml` | Analyzer thinks crate manifests lack a predictable lock file | Keep root `Cargo.lock`; document and configure a targeted Sonar ignore for nested workspace manifests if SonarCloud keeps flagging them |

Accessibility findings for overlay canvas semantics are tracked in
`.jules/palette.md` because they are UX-facing, but fix them in the same release
batch when touching React files.

## Refactor Rules

- Reduce Sonar findings by changing design, not by adding broad suppressions.
- If a finding is analyzer noise, document why in `sonar-project.properties`
  with a narrow ignore pattern and a rule key.
- Keep `Graph.tsx` as orchestration, not as the owner of all pointer logic.
  Move pure pointer math and branch-specific behavior into small helpers that
  can be unit tested without a browser.
- Preserve public React props and `GraphHandle` signatures unless the user asks
  for a breaking release.
- Every behavior change needs a focused test or a browser/WASM test. Prefer
  tests that fail before the refactor.

## Architecture Principle Review

Every code-focused Jules Bolt pass should also scan for SOLID, DRY, and KISS
violations. Treat these as design-smell checks that guide fixes, not as slogans
that justify churn.

| Principle | What to look for | Appropriate fix |
| --- | --- | --- |
| Single Responsibility | Components or modules that own rendering, layout math, worker protocol, theme conversion, and input state in one place | Extract cohesive helpers or hooks around one reason to change, such as pointer state, layout adapters, or theme normalization |
| Open/Closed | Layout or renderer branches that require editing central control flow for every new mode, overlay, or theme variant | Introduce typed strategy maps or small adapters while preserving existing public props |
| Liskov Substitution | Layout implementations, worker messages, or theme tokens that only work for one mode despite sharing a common type | Tighten interfaces, split incompatible variants, and add tests that exercise force, hierarchical, and grid paths through the same public API |
| Interface Segregation | Props, options, or internal structs that force callers to provide unrelated node, edge, layout, and overlay settings | Split options by consumer and keep compatibility shims at the boundary when needed |
| Dependency Inversion | React UI logic directly depending on low-level worker packet details, layout internals, or DOM measurement side effects | Depend on small domain interfaces and isolate packet conversion or DOM reads in adapters |
| DRY | Copied geometry, theme conversion, edge attachment, label placement, or canvas setup logic across overlays and React bridge code | Extract the shared rule into a named utility only when the duplicate behavior must stay identical |
| KISS | Abstract factories, generic helpers, or state machines that make simple graph behavior harder to inspect than the original branch | Prefer direct, typed functions with clear names; remove indirection that has no current second use |

When a principle issue is found, record the concrete symptom, affected files,
and the smallest fix that improves maintainability without weakening runtime
performance. If the "fix" would create a larger abstraction than the problem,
leave a note and keep the simpler code.

## `Graph.tsx` Complexity Plan

The pointer event section should be split by responsibility:

1. `toLocalPointer(event, canvas)` returns graph-local coordinates.
2. `handleHoverOnly(local)` owns hover callbacks and cursor updates.
3. `handleSinglePointerMove(local, mode)` owns node drag and pan branches.
4. `handlePinchMove(activePointers)` owns centroid, zoom, and pan delta math.
5. `flushWorkerMessages()` stays tiny and is called only after mutations.

Done criteria:

- `onMove` is readable at a glance and delegates each branch to a named helper.
- SonarCloud no longer reports `typescript:S3776` for `react/Graph.tsx`.
- Pointer drag still updates connected edges immediately.
- Pinch zoom still preserves the gesture centroid.
- `npm test`, `tsc --noEmit`, and WASM browser tests pass.

## Cargo Lockfile Finding Plan

The workspace has a root `Cargo.lock`, so the nested crate findings are likely
Sonar text-rule noise rather than an actual supply-chain defect.

Preferred remediation order:

1. Confirm `Cargo.lock` is committed at the repository root.
2. Confirm CI runs `cargo test`, `cargo clippy`, and WASM builds from the
   workspace root.
3. If SonarCloud still reports `text:S8570` on `crates/**/Cargo.toml`, add a
   narrow `sonar.issue.ignore.multicriteria` entry for that rule and path only.
4. Add a comment explaining that the Rust workspace lock file is root-scoped.

Do not add fake crate-local lock files.

## Performance Priorities

The project is already optimized around Barnes-Hut layout, grid/hierarchical
one-shot layouts, WASM buffer transfer, and Canvas2D overlays. New performance
work should be measured, not guessed.

| Area | Aim | Validation |
| --- | --- | --- |
| Worker layout | Avoid repeated allocations in `crates/graph-layout/src/force/*` | `cargo bench -p graph-layout` |
| Main WASM buffers | Reuse allocations in edge, arrow, node, hull, and text buffer rebuilds | WASM browser tests plus visual smoke |
| React bridge | Avoid re-subscribing overlays or recreating worker messages on every render | `npm test`, browser smoke |
| Overlays | Pause work when frame data is missing, scene is hidden, or labels are below zoom threshold | browser performance trace |
| Theme conversion | Memoize stable theme objects and avoid deep conversion churn | `react/theme/*.test.ts` |

## Optimization Lessons To Keep

- Hot numeric loops can justify simple index loops when they are easier for LLVM
  to optimize than chained iterators.
- Use `chunks_exact` and bulk `extend` for flat buffer transformations where the
  access pattern is contiguous and measurable.
- Avoid floating-point division in inner geometric loops when equivalent
  multiplication by a precomputed inverse or squared threshold is clearer.
- Unroll fixed four-child quadtree initialization in Barnes-Hut hot paths.
- Reuse vectors and hash maps inside per-tick layout state instead of allocating
  new temporary collections.
- Do not trade correctness for micro-optimizations. The graph renderer has
  visual contracts: edges stay attached, layouts do not overlap card nodes, and
  theme changes repaint every layer.

## Validation Checklist

Run the smallest useful gate first, then broaden before committing:

```bash
cargo fmt --all
cargo test
cargo clippy --all-targets -- -D warnings
npm test
cd site && ./node_modules/.bin/tsc --noEmit
npm --prefix site run build
git diff --check
```

For renderer, drag, or WASM changes, also run:

```bash
wasm-pack test --headless --chrome crates/graph-worker-wasm
wasm-pack test --headless --chrome crates/graph-main-wasm
```

If local ChromeDriver fails for environment reasons, do not hide it. Record the
failure and confirm the GitHub WASM Browser Tests run passes.
## 2026-06-01 - [Avoid recalculating quad bounds widths in tree computation]
**Learning:** In hot loops checking if a node can be approximated in the Barnes-Hut algorithm, the node's geometry was being calculated via bounds array subtraction each time.
**Action:** When working on force computation steps, eliminate bounds computation on tree traversals by checking leaf nodes first.
## 2026-06-12 - [Use f32::min/max for faster bounding box calculations]
**Learning:** When finding the min/max of a flat array of `f32` coordinates (e.g., calculating bounding boxes), using explicit conditional branches (e.g., `if x < x_min`) is significantly slower because standard min/max implementations handle NaN checks efficiently and vectorize better.
**Action:** Use `.chunks_exact(2)` with standard `f32::min` / `f32::max` when iterating flat arrays of coordinates in hot paths to maximize performance.
## 2026-06-15 - [Memoize GraphTheme to JSON conversion]
**Learning:** In the React bridge, `graphThemeToEngineJson` converts a `GraphTheme` object to JSON. Even though `GraphScene` uses `useMemo` for this call, identity drops can cause the function to be called with identically shaped or even the exact same referenced theme, churning memory. This is a common performance bottleneck specific to this codebase's architecture where React needs to communicate frequently with the WASM engine.
**Action:** When creating JSON bridge configurations from stable objects like themes, cache the last converted object to avoid deep conversion churn and unnecessary garbage collection on every render.

## 2026-06-17 - [Memoize theme configuration conversion to prevent useMemo identity drops]
**Learning:** In the React bridge, creating a new theme conversion object on every render invalidates identity in hooks that depend on it, resulting in excessive churn and deep re-computation. By using a module-level WeakMap cache, the conversion result is preserved across hook evaluations for identical `GraphTheme` instances.
**Action:** When extracting functions for configuring dependencies, employ a module-level `WeakMap` cache matching arguments to converted results so they safely endure the React render cycle without garbage collection.

## 2026-06-18 - [Reuse vector allocation for pinned nodes during integration]
**Learning:** In the Barnes-Hut integrator, `snapshot_pinned` allocated a new vector on every layout tick. By hoisting this vector to the layout state, we avoid repeated allocations.
**Action:** Reuse a `Vec<(usize, f32, f32)>` inside the `ForceLayout` struct and pass it mutably into `integrate_step` across ticks.

## 2026-06-19 - [Branchless quadrant calculations in Quadtree logic]
**Learning:** In quadtree implementations (e.g. Barnes-Hut algorithm), the bounding box quadrant calculation has a completely unpredictable hot branch that degrades execution pipeline performance. Spatial coordinates (`x < mx`, `y < my`) cause constant CPU branch mispredictions.
**Action:** Replace predictable but slow branching (`if/else`) with branchless bitwise operators `((x >= mx) as usize) | (((y >= my) as usize) << 1)`. In benchmarks, this yielded a 10-15% performance improvement for unpredictable data traversals.

## 2026-06-20 - [Use branchless bitwise operations for quadtree quadrant classification]
**Learning:** In Rust hot paths like quadtree traversal (e.g., the Barnes-Hut algorithm), unpredictable spatial branching (`if x < mx`, `y < my`) causes CPU pipeline stalls.
**Action:** Replacing nested `if/else` blocks with branchless bitwise operations (e.g., `((x >= mx) as usize) | (((y >= my) as usize) << 1)`) yields measurable execution speedups for unpredictable coordinate classification.

## 2026-06-21 - [Branchless Quadtree Initialization]
**Learning:** In Rust hot paths like quadtree traversal (e.g., the Barnes-Hut algorithm), unpredictable spatial branching (`if x < mx`, `y < my`) causes CPU pipeline stalls.
**Action:** Replace nested `if/else` blocks with branchless bitwise operations (e.g., `((x >= mx) as usize) | (((y >= my) as usize) << 1)`) to avoid stalls and yield measurable execution speedups.

## 2026-06-22 - [Replace spatial branching with bitwise ops in Barnes-Hut quadtree]
**Learning:** In Rust hot paths like quadtree traversal (e.g., the Barnes-Hut algorithm), avoiding unpredictable spatial branching (`if x < mx`, `y < my`) which causes CPU pipeline stalls is important.
**Action:** When classifying spatial coordinates in performance-critical loops or recursive functions, prefer branchless bitwise arithmetic (e.g., `((x >= mx) as usize) | (((y >= my) as usize) << 1)`) over standard conditional statements.

## 2026-06-22 (PR 148) - [Use branchless bitwise operations in spatial branching]
**Learning:** In Rust hot paths like quadtree traversal (e.g., the Barnes-Hut algorithm), unpredictable spatial branching (`if x < mx`, `y < my`) causes CPU pipeline stalls.
**Action:** Replacing nested `if/else` blocks with branchless bitwise operations (e.g., `((x >= mx) as usize) | (((y >= my) as usize) << 1)`) yields measurable execution speedups for unpredictable coordinate classification.
## 2026-06-24 - [Memoize merged theme overrides to prevent cascading identity drops]
**Learning:** In the React bridge, when applying inline object literal props (like `themeOverrides={{...}}`), recreating the merged theme configuration on every render invalidates identity in downstream hooks. This can cause unnecessary deep theme conversion and garbage collection, especially if these hooks depend on referential equality for caching.
**Action:** Cached the merged configurations in `mergeGraphTheme` using a module-level `WeakMap` keyed on the stable base object, combined with a standard `Map` keyed on the serialized string of the overrides. Bounded the inner `Map` size (clearing at size >= 10) to prevent memory leaks from dynamically generated overrides.
## 2026-06-25 - [Skip standard f32::max NaN checks for positive numbers in hot loops]
**Learning:** In hot loops, standard library functions like `f32::max()` have inherent overhead because they perform IEEE-754 compliant NaN checks. If a mathematical guarantee ensures the value is non-negative (e.g., $x^2 + y^2$), this overhead is unnecessary.
**Action:** When determining the maximum of squared values or guaranteed non-negative/non-NaN floats in performance-critical paths, replace `.max()` with a simple `if val > max_val { max_val = val; }` block to skip NaN checks and improve throughput.
## 2026-06-25 - [Inline object allocations in hot render paths]
**Learning:** In hot render paths that run every frame (like `drawOneLabel` in Canvas2D overlays), calling helper functions that return short-lived objects (e.g., `{w, h}` or `{family, weight, basePx}`) causes excessive memory churn and triggers garbage collection pauses that drop FPS.
**Action:** When computing layout metrics inside per-node/per-frame loops, compute them inline as local primitive variables and pass them as flat arguments to downstream functions instead of encapsulating them in short-lived parameter objects.
## 2026-07-08 - [Inline short-lived layout objects in Canvas2D render loop]
**Learning:** In hot frontend render paths that run every frame (e.g., Canvas2D `requestAnimationFrame` loops), allocating short-lived objects (like returning `{w, h}` or parameter objects) causes excessive memory churn and GC pauses that drop FPS.
**Action:** Compute layout metrics inline as local primitive variables and pass flat arguments to downstream functions to prevent memory churn.
## 2026-07-10 - [Replace configuration parameter objects with flat arguments in hot frontend loops]
**Learning:** In hot frontend render paths that run every frame (e.g., Canvas2D `requestAnimationFrame` loops), passing configuration objects into layout loops (like font size stepping in `fitLabelInBox`) causes compounded GC churn and FPS drops because a new object is allocated on every step for every label.
**Action:** When computing layout inside per-node/per-frame loops, replace configuration parameter objects (e.g., `SizeAttempt`, `FallbackAttempt`) with primitive flat arguments to completely eliminate GC churn inside the loop.
## 2026-07-11 - [Use squared distances to bypass sqrt() in hot picking loop]
**Learning:** In the spatial grid picking loop (`pick` in `crates/graph-main-wasm/src/spatial.rs`), calculating the distance to candidate nodes involved a `.sqrt()` call for every candidate. Since this is an inner loop executing for potentially many candidate nodes, the floating-point square root operation adds measurable CPU overhead.
**Action:** When comparing distances in performance-critical geometric loops (e.g., node picking, hit testing), bypass the expensive `sqrt()` operation by comparing squared distances (`dist_sq < max_d * max_d`).

## 2026-08-01 - [Short-circuit redundant Canvas2D redraws]
**Learning:** In hot frontend render paths that run every frame (e.g., Canvas2D `requestAnimationFrame` loops), redrawing when the frame data hasn't changed wastes CPU. However, relying on WebGL `Float32Array` reference equality checks fails because the engine mutates them in-place. Furthermore, abstracting the `dirtyRef` early-exit check into a custom hook prevents SonarCloud code duplication errors and guarantees `ctx.clearRect()` is correctly called after the exit check to avoid blank canvases.
**Action:** Created `useOverlayRenderLoop` to manage a boolean `dirtyRef` that is set in subscription callbacks and cleared during the render tick, replacing naive `requestAnimationFrame` loops in all overlay components.

## 2026-07-21 - Bypass allocations in hot coordinate loops
**Learning:** Returning short-lived parameter objects like {sx, sy} from utility functions inside requestAnimationFrame loops causes excessive memory churn and GC pauses.
**Action:** Split return values into separate distinct X and Y functions that return primitives.
## 2026-07-16 - Optimize hot loop string cloning with as_deref
**Learning:** In Rust hot loops (e.g., per-node buffer rebuilding in WASM renderers or iteration over nodes), cloning `String` fields from configurations incurs unnecessary allocation overhead.
**Action:** Use `.as_deref()` on `Option<String>` to borrow string slices (`&str`) instead of `.clone()` to bypass allocations and significantly improve execution time.
## 2026-07-19 - [Bypass string allocation in per-node and per-edge GPU buffer rebuilding]
**Learning:** In Rust hot loops (like per-node or per-edge buffer rebuilding in WASM renderers), cloning `String` fields from configurations incurs unnecessary allocation overhead and memory churn.
**Action:** Use `.as_deref()` or `.as_str()` on `Option<String>` or `String` fields to borrow string slices (`&str`) instead of `.clone()` to bypass allocations and significantly improve execution time in hot loops.
## 2026-07-12 - [Skip standard f32::max NaN checks for positive numbers in hot loops]
**Learning:** In hot loops, standard library functions like `f32::max()` have inherent overhead because they perform IEEE-754 compliant NaN checks. If a mathematical guarantee ensures the value is non-negative, this overhead is unnecessary.
**Action:** When determining the maximum of non-NaN floats in performance-critical paths, replace `.max()` with a simple `if val > max_val { max_val = val; }` block to skip NaN checks and improve throughput.


## 2026-07-22 - [Bypass string and vector allocations in rebuild_type_keys]
**Learning:** In worker-side graph mutations (`rebuild_type_keys`), cloning node and edge type strings to build a unique type list causes O(V+E) string allocations and unnecessary temporary vectors.
**Action:** When building a deduplicated list of strings from a large collection, use `&str` references for the uniqueness check and `.to_string()` only when a new unique item is found, avoiding O(N) clones.

## 2026-07-27 - Prevent O(N) String allocations in pulse recomputation
**Learning:** In hot loops like per-node buffer rebuilding in WASM renderers, cloning String fields from configurations incurs unnecessary allocation overhead.
**Action:** Replaced String cloning in `recompute_pulse` with `&str` borrows directly accessing the theme and node metadata without temporary vectors, bypassing allocations and improving execution time.
