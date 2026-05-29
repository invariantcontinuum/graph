# Jules Bolt Playbook: Quality, Performance, and Refactors

Last updated: 2026-05-29

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
