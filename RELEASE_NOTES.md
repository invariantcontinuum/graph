# Release Notes: v0.2.3

## Code Quality + Architectural Refactor Release

`v0.2.3` is an internal cleanup with no breaking public API changes. The
focus is SOLID/DRY decomposition of the oversized Rust modules and
triage of the SonarCloud dashboard so that real issues are no longer
drowned in ~21,000 generated-file false positives.

## Highlights

### Rust module decomposition (internal)

Four oversized modules split along single-responsibility seams:

| Module | Before | After |
|---|---|---|
| `graph-main-wasm/src/engine.rs` | 1389 LOC | `engine/{mod, data, interactions, camera, frame, buffers}.rs` |
| `graph-worker-wasm/src/engine.rs` | 631 LOC | `engine/{mod, snapshot, layout, view, buffers, type_keys, config}.rs` |
| `graph-layout/src/force.rs` | 646 LOC | `force/{mod, config, barnes_hut, integrator, overlap}.rs` — `step_with_pins` and `tick` now share a single `integrate_step` path |
| `graph-render/src/theme.rs` | 468 LOC | `theme/{mod, color, shapes, defaults}.rs` |

Every public Rust and WASM export is unchanged — all 52 native tests
(plus new theme/force coverage) still pass.

### SonarCloud posture

- `sonar.exclusions` now drops `site/`, `coverage/`, and wasm-bindgen
  generated `*_wasm.js` / `*_wasm_bg.js` from the scan. This removes a
  standing BLOCKER false positive (`new Function(...)` in bindgen glue)
  and ~21k no-op accessibility warnings from the Next.js static export.
- Six actionable TypeScript issues fixed:
  - `LabelOverlay.tsx` per-frame loop extracted into focused helpers
    (cognitive complexity 18 → ≤ 10) and the `void` operator removed.
  - `fitLabel.ts` collapsed from nine positional parameters to an
    options object, with `wrapIntoLines` further split and
    `normalizeLabel` switched to `replaceAll`.
  - `vpMath.ts` numeric-grouping lint fixed via a named `TWO_POW_32`
    constant.
- Three GitHub Actions permission warnings fixed: `deploy.yml` now
  scopes `pages: write` / `id-token: write` at the job level.

### Generic-fit cleanup

- `WorkerEngine::get_stats` no longer hardcodes a
  `status == "violation"` count. The substrate-specific violations
  counter was already discarded by the caller and has been removed,
  simplifying the public worker API.
- New `react/README.md` walks through the domain-agnostic integration
  path: custom `themeOverrides`, `onLegendChange`-driven legends, and
  the imperative `GraphHandle` API.

### Developer experience

- `coverage/` is now git-ignored. Previous releases inadvertently
  committed ~100 vitest HTML reports on every test run.
- `cargo fmt --all --check` and `cargo clippy --all-targets -- -D warnings`
  remain the default CI gates; both pass after the refactor.

## Upgrade Notes

Patch release — no action required.

- `@invariantcontinuum/graph/react` surface is byte-identical.
- WASM exports are byte-identical (wasm-bindgen still generates the
  same `RenderEngine` methods; internal impl blocks were merely split
  across submodules).
- `GraphSnapshot` / `LegendSummary` / `GraphTheme` TypeScript types are
  unchanged.

## Known Limitations

- `wsUrl` / `authToken` remain experimental.
- `Graph` alone is canvas-only; use `GraphScene` or exported overlays
  for labels and chrome.
- The internal SDF text renderer is still placeholder-grade; production
  labels come from Canvas2D overlays.
- WebGL2 remains the only rendering backend.
