# Jules SonarCloud Remediation Roadmap

Last updated: 2026-05-29

This roadmap is based on the live SonarCloud issue query for
`invariantcontinuum_graph` on 2026-05-29. Re-check before implementing because
automatic analysis updates after every push to `main`.

## Refresh Command

```bash
curl -s 'https://sonarcloud.io/api/issues/search?componentKeys=invariantcontinuum_graph&resolved=false&pageSize=100'
```

Summarize the result by rule, file, severity, and message before editing code.

## Current Open Findings

| Priority | Rule | Count | Files | Fix track |
| --- | --- | ---: | --- | --- |
| 1 | `typescript:S6819` | 4 | `react/*Overlay.tsx` | Overlay canvas semantics |
| 1 | `typescript:S6825` | 4 | `react/*Overlay.tsx` | Overlay canvas focus/aria-hidden semantics |
| 1 | `typescript:S6843` | 5 | overlay files, `react/Graph.tsx` | Canvas role cleanup and main-canvas role audit |
| 2 | `typescript:S3776` | 1 | `react/Graph.tsx` | Pointer handler complexity refactor |
| 3 | `text:S8570` | 5 | `crates/*/Cargo.toml` | Rust workspace lockfile analyzer-noise handling |

## Batch 1: Overlay Canvas Semantics

Target files:

- `react/GridOverlay.tsx`
- `react/LabelOverlay.tsx`
- `react/EdgeLabelsOverlay.tsx`
- `react/CompoundFramesOverlay.tsx`

Implementation intent:

- Remove `role="presentation"` from overlay canvases.
- Keep `aria-hidden={true}` only while the canvas is non-interactive.
- Confirm there is no `tabIndex`, no click handler, and `pointerEvents: "none"`.
- Add or adjust tests if a DOM test harness exists. If not, add a small static
  assertion test around exported overlay elements only when it does not pull in
  a heavy testing stack.

Acceptance:

- SonarCloud clears `S6819`, `S6825`, and overlay `S6843` findings.
- Browser smoke confirms labels, grid, edge labels, and compound frames still
  render.

## Batch 2: Main Canvas Role Audit

Target file:

- `react/Graph.tsx`

Implementation intent:

- Decide whether the main canvas has enough keyboard behavior for
  `role="application"`.
- If it remains `role="application"`, document supported keyboard behavior in
  README and ensure shortcut attributes exist where host chrome exposes them.
- If not, use a less aggressive accessible role and keep a clear `aria-label`.
- Keep the canvas focusable only if keyboard interactions are implemented.

Acceptance:

- SonarCloud clears `react/Graph.tsx` `S6843`.
- Keyboard focus remains visible and usable.
- Node click, drag, zoom, fit, and selection smoke tests still pass.

## Batch 3: Pointer Complexity Refactor

Target file:

- `react/Graph.tsx`

Implementation intent:

- Extract pointer branch logic out of the `onMove` function.
- Prefer pure helpers that accept current pointer state and local coordinates.
- Keep mutation boundaries explicit: engine calls, callbacks, and worker message
  flushing should be easy to trace.

Acceptance:

- SonarCloud clears `typescript:S3776`.
- `npm test`, `tsc --noEmit`, and WASM browser tests pass.
- Dragged nodes still update connected edge endpoints immediately.

## Batch 4: Rust Workspace Lockfile Findings

Target files:

- `sonar-project.properties`
- `Cargo.lock`
- `crates/*/Cargo.toml`

Implementation intent:

- Do not add crate-local lock files.
- Keep the root `Cargo.lock` committed.
- If SonarCloud continues to flag nested crate manifests, configure a narrow
  ignore for `text:S8570` on `crates/**/Cargo.toml` and document that Rust
  workspace locking is root-scoped.

Acceptance:

- SonarCloud clears or intentionally ignores the five `text:S8570` findings.
- CI still builds and tests from the workspace root.

## Release Discipline

Fixes that change package runtime behavior require the package-first sequence:

1. commit package fix on `main`
2. wait for CI
3. run `gh workflow run release.yml -f bump=patch --ref main`
4. wait for Release and Publish
5. update the showcase dependency only after publish succeeds
6. validate Pages deploy

Documentation-only `.jules` updates do not require a package release.
