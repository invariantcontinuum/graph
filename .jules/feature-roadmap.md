# Jules Feature, Optimization, and UX Roadmap

Last updated: 2026-05-29

Use this file when the user asks for meaningful product improvements beyond
SonarCloud cleanup. The roadmap favors package features that improve real graph
inspection and keeps showcase work downstream of released package behavior.

## Product Aim

`@invariantcontinuum/graph` should be a reliable WASM/WebGL graph workbench for
large knowledge graphs. The package should make dense data inspectable,
interactive, themeable, and embeddable without forcing each app to rebuild the
same graph controls.

## Feature Backlog

| Priority | Feature                       | Package surface                                           | Why it matters                                                          |
| -------- | ----------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------- |
| 1        | Edge inspector data           | Click/selection payload and legend helpers                | Users need to understand why nodes are connected                        |
| 2        | Live mutation ingestion       | `wsUrl`, `authToken`, worker protocol                     | Existing props are experimental; making them real unlocks live diagrams |
| 2        | Snapshot plus position export | `GraphHandle.getSnapshot?` or documented callback pattern | Apps need persistence after layout or drag                              |
| 2        | Layout transition affordance  | camera-state animation and selected-node preservation     | Layout switching should not disorient users                             |
| 3        | Minimap or overview rail      | optional `GraphScene` chrome helper                       | Large graphs need orientation without forcing zoom-out                  |
| 3        | Edge-label density controls   | `EdgeLabelsOverlay` mode or threshold props               | Labels are useful only when they do not flood the view                  |

## Optimization Backlog

- Reuse main-WASM edge and arrow buffer allocations across rebuilds.
- Add benchmark coverage for grid and hierarchical layouts, not only force.
- Batch worker messages for rapid drag and filter changes.
- Avoid overlay render loops when the scene is not visible.
- Keep theme conversion memoized and prove stable object identities in tests.
- Measure browser paint costs after adding any overlay or chrome feature.

## UX And Design Backlog


- Add first-run and empty-state examples to the showcase.
- Improve selection state: show incoming/outgoing counts, connected edge types,
  and focus actions.
- Add clear disabled-state reasons for controls that depend on a selected node.
- Keep mobile behavior structural: drawer for scenario lists, inspector below
  the canvas, no viewport-scaled text in controls.
- Maintain light and dark parity in every theme token: canvas, grid, labels,
  node fill, node border, edges, selection, hulls, and dimmed states.

## Definition Of Done

Every feature or optimization should include:

- one sentence of user value
- a package API or host integration point
- a test plan
- browser smoke coverage
- documentation updates in README or `react/README.md`
- release and showcase update sequence when package behavior changes

Avoid "demo-only" features. The showcase should prove package capability, not
hide missing package behavior with local workarounds.
