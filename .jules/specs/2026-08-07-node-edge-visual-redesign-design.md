# Node & Edge Visual Redesign — Design Spec

Date: 2026-08-07
Status: approved by user (2026-08-07)
Scope: `@invariantcontinuum/graph` package only. The showcase site must need
**zero** code changes — it inherits the new look by upgrading the package.

## Problem

Current rendering (v0.11.3) undersells the engine:

- **Nodes**: all 13 node types render as the same round-rectangle — a near-black
  "glass" fill + 1.35 px colored border. The shader supports 8 shapes but the
  theme never uses them. Type is encoded only in the border color, which is
  illegible at overview zoom. No hover glow; selection is only a border-color
  swap.
- **Node content**: one truncated single-line label (`Debu…`). No type glyph,
  no secondary information.
- **Edges**: straight, flat lines. At density they cross into a hairball that
  dominates the canvas while nodes visually disappear.
- **Interaction**: hover barely visible; spotlight dims nodes only.

## Decisions (from brainstorming with the user)

| Question | Decision |
| --- | --- |
| Pain points | All four: node shape & borders, node content, edge readability, interaction polish |
| Aesthetic | Brighter, more colorful — filled accent nodes, colored edges, more playful |
| Node content | Glyph + name + zoom-adaptive type tag |
| Edges | Curved (quadratic bezier) + source→target gradient; no flow animation |
| Implementation strategy | Approach A: evolve the existing instanced-SDF pipeline (no new render passes, additive-only public API) |

## Design

### 1. Nodes — shape, fill, borders

- **Shape encodes type** (`react/theme/typeStyles.ts`). 13 types over the 8
  shader-implemented shapes; repeats are disambiguated by the existing
  CARD / CARD_COMPACT size presets (and always by color):

  | Type | Shape | Size preset | Glyph |
  | --- | --- | --- | --- |
  | service | roundrectangle | CARD | ⚙ |
  | source | circle | CARD | ◎ |
  | database | barrel | CARD | ▤ |
  | cache | hexagon | CARD | ⬡ |
  | data | square | CARD | ▦ |
  | policy | octagon | CARD | ⛨ |
  | adr | diamond | COMPACT | ◆ |
  | incident | triangle | COMPACT | ⚠ |
  | external | circle | COMPACT | ↗ |
  | config | square | COMPACT | ▣ |
  | script | diamond | COMPACT | ⌘ |
  | doc | roundrectangle | COMPACT | ▤ |
  | asset | hexagon | COMPACT | ▢ |

  Glyph availability is validated at runtime against the label font; a missing
  glyph falls back to the shape's plain geometric mark (● ◆ ▲ ■ ⬡), never a
  tofu box.
- **Fill tinted by type color**, replacing the uniform-glass rule
  (`buildGraphTheme` glass-rule tests are deliberately rewritten):
  - dark theme: fill = type color at ~20% alpha over deep navy;
  - light theme: fill = type color at ~12% alpha over white.
  - borders: full-strength type color, ~2 px at reference scale.
- **Selection**: brighter fill + crisp outer ring + slow breathing pulse
  (driven by the existing `u_time` uniform).
- **Hover**: fill lighten + soft outer glow implemented as SDF falloff outside
  the shape boundary in `node.frag`. No node scaling — picking math
  (`picking.rs`) stays exact.

### 2. Node content — label chips (Canvas2D `LabelOverlay`)

- **Glyph + name chip**: per-type unicode glyph prefixed to the node name; chip
  background matches the node tint; proper padding + corner radius.
- **Zoom-adaptive type tag**: uppercase micro-label (e.g. `SERVICE`) under the
  name, rendered only when the node's on-screen pixel height is ≥ 40 px
  (doubles as the dense-graph perf guard).
- **Less truncation**: wider label box, 2-line wrap via the existing
  `fitLabelInBox`, emoji-safe ellipsis as last resort (already on main).

### 3. Edges — curved + gradient

- Quadratic bezier per edge. Control point = segment midpoint + perpendicular
  offset; parallel edges fan out by index; bow magnitude scales with edge
  length (capped).
- Vertex-shader tessellation: one instance per edge expands to a 16-segment
  triangle strip; still a single instanced draw call.
  Budget: 20k edges × 16 segments × 2 triangles ≈ 640k triangles — fine for
  WebGL2 instancing.
- **Gradient**: per-instance `to_color` (4 extra floats); fragment mixes
  source→target color along the curve parameter; alpha dips slightly
  mid-curve so direction reads without motion.
- Arrows: positioned at t=1, rotated to the curve tangent (derivative computed
  CPU-side in the engine where arrow instances are built).
- Dash styles (solid/long/short/dotted) preserved along the curve parameter.

### 4. Interaction polish

- Hovering a node: node glow + connected edges raise width/alpha (engine
  already tracks hover; edges gain an emphasis bit).
- Spotlight: keeps the existing 250 ms ease; edges attached to non-neighbors
  fade in sync with dimmed nodes.

### 5. Theme / public API

- The new look ships as **new defaults** in `buildGraphTheme`.
- `ThemeOverride` gains optional keys only, e.g. `nodeFillTint`,
  `nodeGlowStrength`, `edgeCurvature`, `showTypeTag`. No breaking changes to
  `GraphProps` / `GraphHandle` / engine JSON schema (new fields optional).
- Showcase: upgrades the dependency version only; its existing per-dataset
  theme overrides continue to layer on top.

## Architecture touch points

| Area | Files |
| --- | --- |
| Node shapes/fills/borders (theme) | `react/theme/{typeStyles,palette,buildTheme,toEngineTheme}.ts` |
| Node glow/ring/pulse (shader) | `crates/graph-render/shaders/node.frag`, `node.vert` (pass flags through), `crates/graph-render/src/nodes.rs` (no layout change if flags reused) |
| Edge bezier + gradient | `crates/graph-render/shaders/edge.{vert,frag}`, `crates/graph-render/src/edges.rs` (instance stride 11→15 floats), arrow tangent in `crates/graph-main-wasm/src/engine/` (arrow instance build) |
| Label chips + type tag | `react/LabelOverlay.tsx`, possibly `react/overlays/labels/fitLabel.ts` |
| Hover emphasis on edges | `crates/graph-main-wasm/src/engine/{interactions,buffers}.rs` |
| Tests | `react/theme/*.test.ts`, `react/overlays/labels/*.test.ts`, new Rust unit tests in `crates/graph-render` / engine |

## Error handling / fallbacks

- Unknown shape names keep falling back to `circle` (existing behavior).
- If `to_color` equals `from_color`, gradient degenerates to flat color.
- Old themes (no new override keys) get the new defaults — intended visual
  change, not an error path.
- Type tag threshold failures (extreme zoom-out) simply skip the tag.

## Testing

- `react/theme`: updated glass-rule tests → tinted-fill rule; shape-mapping
  test; light/dark inversion exhaustiveness (existing harness).
- `react/overlays/labels`: chip layout (glyph+name), zoom-threshold visibility
  tests for the type tag.
- Rust: unit tests for bezier control-point computation (fan-out of parallel
  edges) and endpoint tangent; `cargo test -p graph-core -p graph-layout`
  untouched; CI wasm headless-browser tests must pass.
- Repo validation gate (must pass before PR): `cargo fmt --all --check`,
  `cargo clippy --all-targets -- -D warnings -A clippy::chunks_exact_to_as_chunks`,
  `cargo test`, `npm test`, `npx tsc --noEmit -p react/tsconfig.json`.
- Visual verification: headless before/after screenshots of the showcase
  playground attached to the PR.

## Non-goals

- No flow/dash animation on edges (explicitly declined).
- No DOM/SVG node layer; no texture-atlas icons (YAGNI).
- No showcase code changes.
- No layout-algorithm changes (positions unchanged; picking unchanged).

## Release

Single PR with `feat:` commits → merge to main → auto-release (minor bump) →
GitHub Packages publish → showcase auto-bump bot pins the new version →
verify Pages deploy (dispatch `deploy.yml` manually if it doesn't fire).
