# Node & Edge Visual Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the approved "brighter knowledge graph" look — shape-coded tinted nodes with glow, glyph+name+type-tag label chips below nodes, fanned-out gradient curved edges, hover edge emphasis — entirely inside `@invariantcontinuum/graph`.

**Architecture:** Evolve the existing instanced-SDF WebGL2 pipeline. Theme-layer TS changes drive shape/fill/border; label chips land in the Canvas2D `LabelOverlay`; edge gradient/fan-out/tangent are computed CPU-side in the engine's existing bezier tessellation (no new render passes, no shader data-layout change for edges); node glow is a shader-only change using a padded quad.

**Tech Stack:** Rust/wasm-pack (graph-render, graph-main-wasm), TypeScript/React (react/), GLSL ES 3.0, vitest, cargo test.

**Spec:** `.jules/specs/2026-08-07-node-edge-visual-redesign-design.md`

## Global Constraints

- Repo validation gate (must pass before PR): `cargo fmt --all --check`, `cargo clippy --all-targets -- -D warnings -A clippy::chunks_exact_to_as_chunks`, `cargo test -p graph-core -p graph-layout --all-features`, `npm test`, `npx tsc --noEmit -p react/tsconfig.json`.
- Public API: additive only. No breaking changes to `GraphProps`, `GraphHandle`, `GraphThemeOverrides`, or engine `ThemeConfig` JSON (new fields optional, camelCase serde renames — see the CRITICAL note in `react/theme/toEngineTheme.ts`).
- Branch: `feat/node-edge-visual-redesign` (already created; spec committed there). Conventional commits; `feat:` → minor bump on merge.
- Labels move from **inside** the node box to a **chip below the node** (per approved mockups); nodes become pure shapes.
- Do not touch the showcase repo in this plan. Do not hand-edit `package.json` version or push tags.
- `docs/` is gitignored in this repo — plan/spec live under `.jules/`.

---

### Task 1: Theme — shape per type, tinted fills, stronger borders, glyph table

**Files:**
- Modify: `react/theme/typeStyles.ts` (full rewrite of the mapping table)
- Modify: `react/theme/buildTheme.ts:42-57` (fill rule)
- Modify: `react/theme/types.ts:3-15` (`NodeTypeStyle` gains `glyph`)
- Test: `react/theme/typeStyles.test.ts` (new), `react/theme/buildTheme.test.ts` (rewrite glass-rule tests)

**Interfaces:**
- Produces: `TypeShape.glyph: string`; `NodeTypeStyle.glyph?: string`; `tintFill(borderColor: string, alpha: number): string` (exported from `buildTheme.ts`); per-type shapes consumed unchanged via `toEngineTheme`.

- [ ] **Step 1: Write the failing tests**

`react/theme/typeStyles.test.ts` (new):

```ts
import { describe, test, expect } from "vitest";
import { TYPE_STYLES, DEFAULT_STYLE } from "./typeStyles";
import { NODE_TYPES } from "./palette";

describe("TYPE_STYLES shape coding", () => {
  test("every node type has a glyph", () => {
    for (const t of NODE_TYPES) {
      expect(TYPE_STYLES[t].glyph.length, `${t} glyph`).toBeGreaterThan(0);
    }
  });

  test("shape encodes type: no longer uniform roundrectangle", () => {
    const shapes = new Set(NODE_TYPES.map((t) => TYPE_STYLES[t].shape));
    expect(shapes.size).toBeGreaterThanOrEqual(7);
    expect(TYPE_STYLES.database.shape).toBe("barrel");
    expect(TYPE_STYLES.incident.shape).toBe("triangle");
    expect(TYPE_STYLES.cache.shape).toBe("hexagon");
    expect(TYPE_STYLES.service.shape).toBe("roundrectangle");
  });

  test("non-card shapes have balanced extents (not wide boxes)", () => {
    for (const t of NODE_TYPES) {
      const s = TYPE_STYLES[t];
      if (s.shape === "circle" || s.shape === "square" || s.shape === "diamond") {
        expect(s.halfWidth).toBe(s.halfHeight);
      }
    }
  });

  test("DEFAULT_STYLE keeps roundrectangle + glyph", () => {
    expect(DEFAULT_STYLE.shape).toBe("roundrectangle");
    expect(DEFAULT_STYLE.glyph.length).toBeGreaterThan(0);
  });
});
```

In `react/theme/buildTheme.test.ts`, replace the two "uniform glass fill" tests with:

```ts
  test("dark: every node type fill is a tint of its border color", () => {
    const t = buildGraphTheme("dark");
    for (const type of NODE_TYPES) {
      expect(t.nodeTypes[type].color, `${type} fill`).toBe(
        tintFill(DARK.typeBorders[type], 0.2),
      );
    }
  });

  test("light: every node type fill is a tint of its border color", () => {
    const t = buildGraphTheme("light");
    for (const type of NODE_TYPES) {
      expect(t.nodeTypes[type].color).toBe(
        tintFill(LIGHT.typeBorders[type], 0.12),
      );
    }
  });
```

(add `tintFill` to the import from `./buildTheme`; drop the now-unused uniform-fill imports if the linter flags them.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run react/theme/`
Expected: FAIL — `tintFill is not exported`, `TYPE_STYLES[t].glyph` undefined, uniform-fill tests removed.

- [ ] **Step 3: Implement**

`react/theme/types.ts` — extend `NodeTypeStyle`:

```ts
export interface NodeTypeStyle {
  shape: Shape;
  halfWidth: number;
  halfHeight: number;
  cornerRadius: number;
  color: string;
  borderColor: string;
  borderWidth: number;
  labelColor: string;
  labelFont: string;
  labelSize: number;
  labelWeight: number;
  /** Per-type unicode glyph shown in the label chip. Overlay-only; never sent
   *  to the engine. */
  glyph?: string;
}
```

`react/theme/typeStyles.ts` — full new table (per spec):

```ts
// Per-node-type shape + size + glyph table. Theme-independent — colors live
// in palette.ts. Shape encodes type; repeated shapes are disambiguated by
// the CARD / CARD_COMPACT size presets (and always by color).

import type { NodeType } from "./palette";

export type Shape =
  | "roundrectangle" | "barrel" | "diamond"
  | "hexagon" | "octagon" | "triangle" | "square" | "circle";

export interface TypeShape {
  shape: Shape;
  halfWidth: number;
  halfHeight: number;
  cornerRadius: number;
  borderWidth: number;
  labelSize: number;
  glyph: string;
}

// Wide cards (label chip sits below the node; the node itself is a shape).
const NODE_CARD: Omit<TypeShape, "shape" | "glyph"> = {
  halfWidth: 68, halfHeight: 24, cornerRadius: 10, borderWidth: 2.0, labelSize: 12,
};
const NODE_CARD_COMPACT: Omit<TypeShape, "shape" | "glyph"> = {
  halfWidth: 58, halfHeight: 22, cornerRadius: 10, borderWidth: 1.9, labelSize: 11,
};
// Balanced extents for radially-symmetric shapes so circles don't render as
// wide ellipses.
const SHAPE_CARD = { halfWidth: 26, halfHeight: 26, cornerRadius: 6, borderWidth: 2.0, labelSize: 12 };
const SHAPE_CARD_COMPACT = { halfWidth: 22, halfHeight: 22, cornerRadius: 6, borderWidth: 1.9, labelSize: 11 };

export const TYPE_STYLES: Record<NodeType, TypeShape> = {
  service:  { shape: "roundrectangle", glyph: "⚙", ...NODE_CARD },
  source:   { shape: "circle",         glyph: "◎", ...SHAPE_CARD },
  database: { shape: "barrel",         glyph: "▤", ...NODE_CARD },
  cache:    { shape: "hexagon",        glyph: "⬡", halfWidth: 30, halfHeight: 26, cornerRadius: 6, borderWidth: 2.0, labelSize: 12 },
  data:     { shape: "square",         glyph: "▦", ...SHAPE_CARD },
  policy:   { shape: "octagon",        glyph: "⛨", ...SHAPE_CARD },
  adr:      { shape: "diamond",        glyph: "◆", halfWidth: 26, halfHeight: 26, cornerRadius: 6, borderWidth: 1.9, labelSize: 11 },
  incident: { shape: "triangle",       glyph: "⚠", halfWidth: 30, halfHeight: 26, cornerRadius: 4, borderWidth: 2.1, labelSize: 11 },
  external: { shape: "circle",         glyph: "↗", ...SHAPE_CARD_COMPACT },
  config:   { shape: "square",         glyph: "▣", ...SHAPE_CARD_COMPACT },
  script:   { shape: "diamond",        glyph: "⌘", halfWidth: 24, halfHeight: 24, cornerRadius: 6, borderWidth: 1.9, labelSize: 11 },
  doc:      { shape: "roundrectangle", glyph: "▤", ...NODE_CARD_COMPACT },
  asset:    { shape: "hexagon",        glyph: "▢", halfWidth: 26, halfHeight: 22, cornerRadius: 6, borderWidth: 1.9, labelSize: 11 },
};

export const DEFAULT_STYLE: TypeShape = {
  shape: "roundrectangle", glyph: "●",
  halfWidth: 68, halfHeight: 24, cornerRadius: 10, borderWidth: 2.0, labelSize: 12,
};

export function typeStyleFor(type: string | undefined | null): TypeShape {
  if (!type) return DEFAULT_STYLE;
  return (TYPE_STYLES as Record<string, TypeShape | undefined>)[type] ?? DEFAULT_STYLE;
}
```

`react/theme/buildTheme.ts` — replace the glass-pane rule with tinting. Add and use:

```ts
// Tinted-fill rule: every node type's fill is its border color at a low
// alpha over the canvas — nodes read as colored, not as black glass.
// `hex` must be a #rrggbb palette entry.
export function tintFill(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
```

In `buildGraphTheme`, change the per-type `color: p.nodeGlassFill` to
`color: tintFill(p.typeBorders[type], mode === "dark" ? 0.2 : 0.12)`, and the
`defaultNodeStyle.color` to `tintFill(p.nodeDefaultBorder.startsWith("#") ? p.nodeDefaultBorder : "#94a3b8", mode === "dark" ? 0.18 : 0.1)`
— note: `nodeDefaultBorder` is an rgba() string, so for the default style
hardcode the slate base as shown. Update the header comment: "Tinted-fill rule
is enforced here — every node type's fill derives from its border color."

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run react/theme/`
Expected: PASS (all theme tests, incl. existing toEngineTheme/mergeTheme/palette tests).

- [ ] **Step 5: Commit**

```bash
git add react/theme/
git commit -m "feat(theme): shape-coded node types with tinted fills and glyphs"
```

---

### Task 2: Label chips below nodes — glyph + name + zoom-adaptive type tag

**Files:**
- Modify: `react/LabelOverlay.tsx` (replace inside-node painting with chip-below-node)
- Create: `react/overlays/labels/chipLayout.ts` (pure layout logic)
- Create: `react/overlays/labels/chipLayout.test.ts`
- Modify: `react/theme/types.ts:24-38` (`GraphTheme` gains `showTypeTag: boolean`); `mergeTheme.ts` passes it through; `buildTheme.ts` sets `showTypeTag: true`

**Interfaces:**
- Consumes: `NodeTypeStyle.glyph` (Task 1), `fitLabelInBox` (existing), `theme.dimText`, `theme.labelHalo`.
- Produces: `layoutLabelChip(input: ChipInput): ChipLayout | null` and `glyphSupported(ctx, glyph): boolean` from `chipLayout.ts`; `GraphTheme.showTypeTag: boolean` (default true).

- [ ] **Step 1: Write the failing test**

`react/overlays/labels/chipLayout.test.ts`:

```ts
import { describe, test, expect } from "vitest";
import { layoutLabelChip, glyphSupported } from "./chipLayout";

// Same mock approach as fitLabel.test.ts: ~6px per char.
const ctx = {
  font: "",
  measureText: (s: string) => ({ width: s.length * 6 }),
} as unknown as CanvasRenderingContext2D;

describe("layoutLabelChip", () => {
  test("composes glyph + name on one line when it fits", () => {
    const c = layoutLabelChip(ctx, {
      name: "api-gateway", glyph: "⚙", typeTag: "SERVICE",
      maxWidthPx: 200, fontPx: 12, tagFontPx: 8, showTag: true,
    });
    expect(c).not.toBeNull();
    expect(c!.lines).toEqual(["⚙ api-gateway"]);
    expect(c!.tag).toBe("SERVICE");
    expect(c!.heightPx).toBeGreaterThan(24); // name line + tag line + padding
  });

  test("omits tag when showTag is false (zoom gate)", () => {
    const c = layoutLabelChip(ctx, {
      name: "api", glyph: "⚙", typeTag: "SERVICE",
      maxWidthPx: 200, fontPx: 12, tagFontPx: 8, showTag: false,
    });
    expect(c!.tag).toBeNull();
  });

  test("null glyph renders name only", () => {
    const c = layoutLabelChip(ctx, {
      name: "api", glyph: null, typeTag: null,
      maxWidthPx: 200, fontPx: 12, tagFontPx: 8, showTag: true,
    });
    expect(c!.lines).toEqual(["api"]);
  });

  test("returns null when the name cannot fit even ellipsized", () => {
    const c = layoutLabelChip(ctx, {
      name: "x".repeat(500), glyph: "⚙", typeTag: null,
      maxWidthPx: 12, fontPx: 12, tagFontPx: 8, showTag: false,
    });
    expect(c).toBeNull();
  });
});

describe("glyphSupported", () => {
  test("tofu-width equality marks a glyph unsupported", () => {
    // mock gives every string a distinct width by length, so a 1-char glyph
    // and 1-char U+FFFF compare equal -> unsupported. A 2-char glyph differs.
    expect(glyphSupported(ctx, "⚙")).toBe(false);
    expect(glyphSupported(ctx, "⚙x")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run react/overlays/labels/chipLayout.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `chipLayout.ts`**

```ts
// Pure layout for the label chip drawn below each node. No canvas state is
// mutated here beyond font assignment for measurement — painting lives in
// LabelOverlay.tsx.

import { fitLabelInBox } from "./fitLabel";

export interface ChipInput {
  name: string;            // normalized (whitespace-collapsed) node name
  glyph: string | null;    // validated type glyph, or null to omit
  typeTag: string | null;  // uppercase type label, or null to omit
  maxWidthPx: number;      // chip text budget (device px)
  fontPx: number;          // name font size (device px)
  tagFontPx: number;       // tag font size (device px)
  showTag: boolean;        // zoom gate result
}

export interface ChipLayout {
  lines: string[];   // fitted name lines (glyph included in first line)
  tag: string | null;
  widthPx: number;   // chip box width incl. padding
  heightPx: number;  // chip box height incl. padding
  fontPx: number;
  tagFontPx: number;
  lineHeight: number;
  tagLineHeight: number;
}

export const CHIP_PAD_X = 7;
export const CHIP_PAD_Y = 4;
export const CHIP_GAP = 4; // vertical gap between node bottom and chip top

const glyphSupportCache = new Map<string, boolean>();

/** A glyph is "supported" if its measured width differs from the guaranteed-
 *  missing U+FFFF tofu width. Result cached per glyph. */
export function glyphSupported(
  ctx: CanvasRenderingContext2D,
  glyph: string,
): boolean {
  let ok = glyphSupportCache.get(glyph);
  if (ok === undefined) {
    const saved = ctx.font;
    ctx.font = "16px sans-serif";
    const tofu = ctx.measureText("￿").width;
    ok = ctx.measureText(glyph).width !== tofu;
    ctx.font = saved;
    glyphSupportCache.set(glyph, ok);
  }
  return ok;
}

export function layoutLabelChip(
  ctx: CanvasRenderingContext2D,
  input: ChipInput,
): ChipLayout | null {
  const text = input.glyph ? `${input.glyph} ${input.name}` : input.name;
  const chars = Array.from(text);
  const lineHeight = Math.ceil(input.fontPx * 1.16);
  // Name fits on up to 2 lines inside the width budget.
  const fitted = fitLabelInBox(
    ctx,
    text,
    chars,
    input.maxWidthPx,
    lineHeight * 2 + 2,
    "sans-serif",
    760,
    input.fontPx,
    Math.max(6, input.fontPx - 3),
    1,
  );
  if (!fitted) return null;

  const tag = input.showTag ? input.typeTag : null;
  const tagLineHeight = tag ? Math.ceil(input.tagFontPx * 1.3) : 0;

  let maxLineW = 0;
  for (const line of fitted.lines) {
    maxLineW = Math.max(maxLineW, ctx.measureText(line).width);
  }
  const tagW = tag ? ctx.measureText(tag).width : 0;

  return {
    lines: fitted.lines,
    tag,
    widthPx: Math.ceil(Math.max(maxLineW, tagW)) + CHIP_PAD_X * 2,
    heightPx:
      fitted.lines.length * fitted.lineHeight +
      tagLineHeight +
      CHIP_PAD_Y * 2,
    fontPx: fitted.fontPx,
    tagFontPx: input.tagFontPx,
    lineHeight: fitted.lineHeight,
    tagLineHeight,
  };
}
```

Check `fitLabelInBox`'s exact signature/return in `react/overlays/labels/fitLabel.ts` before wiring (it currently takes `(ctx, text, chars, maxWidth, maxHeight, fontFamily, fontWeight, baseFontPx, minFontPx, dpr)` and returns `FittedLabel { lines, fontPx, lineHeight } | null`); adjust the call above to match reality.

- [ ] **Step 4: Rewrite `LabelOverlay.tsx` painting**

Replace `paintLabel` (inside-node clipped text) with chip painting, and compute
its inputs in `drawOneLabel`. Key changes:

- The node box check stays (culling), but the text budget becomes
  `chipMaxWidth = max(nodeBoxW * 1.6, 90 * dpr)` — the chip may be wider than
  a small shape node.
- Zoom gate for the tag: `showTag = theme.showTypeTag !== false && nodeBoxH >= 40 * dpr`.
- Glyph: `const g = typeStyle.glyph ?? null;` then `glyph = g && glyphSupported(ctx, g) ? g : null;`
- Chip top-left: `cx = sx - layout.widthPx / 2`, `cy = sy + nodeBoxH / 2 + CHIP_GAP * dpr`.
- Cull chips offscreen with the existing margin check applied to the chip rect.
- Paint: rounded-rect chip bg `typeStyle.color` (the tinted fill), 1px stroke
  `typeStyle.borderColor` at 0.55 alpha, then halo-stroked name lines
  (`theme.labelHalo` stroke, `typeStyle.labelColor` fill, centered), then the
  tag line in `theme.dimText` at `tagFontPx`.

```ts
function paintChip(
  ctx: CanvasRenderingContext2D,
  sx: number,
  topPy: number,
  layout: ChipLayout,
  typeStyle: NodeTypeStyle,
  theme: GraphTheme,
  fontFamily: string,
  fontWeight: number,
  dpr: number,
): void {
  const x = sx - layout.widthPx / 2;
  const y = topPy;
  const r = Math.min(7 * dpr, layout.heightPx / 2);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, layout.widthPx, layout.heightPx, r);
  ctx.fillStyle = typeStyle.color ?? "rgba(15, 23, 42, 0.9)";
  ctx.fill();
  ctx.strokeStyle = typeStyle.borderColor ?? "rgba(148, 163, 184, 0.55)";
  ctx.lineWidth = Math.max(1, 0.75 * dpr);
  ctx.globalAlpha = 0.55;
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.clip();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";

  let cy = y + CHIP_PAD_Y + layout.lineHeight / 2;
  ctx.font = `${fontWeight} ${layout.fontPx}px ${fontFamily}`;
  ctx.lineWidth = Math.max(1.5 * dpr, layout.fontPx * 0.2);
  ctx.strokeStyle = theme.labelHalo ?? theme.canvasBg;
  ctx.fillStyle = typeStyle.labelColor ?? theme.defaultNodeStyle.labelColor;
  for (const line of layout.lines) {
    ctx.strokeText(line, sx, cy);
    ctx.fillText(line, sx, cy);
    cy += layout.lineHeight;
  }

  if (layout.tag) {
    ctx.font = `600 ${layout.tagFontPx}px ${fontFamily}`;
    ctx.fillStyle = theme.dimText;
    ctx.fillText(layout.tag, sx, y + layout.heightPx - CHIP_PAD_Y - layout.tagLineHeight / 2);
  }
  ctx.restore();
}
```

Note `ctx.roundRect` needs a fallback for older engines — this package targets
modern browsers (WebGL2-required), so `roundRect` is safe; if TS lib complains,
add `/// <reference lib="dom" />` awareness or a 3-line path fallback.

In `drawOneLabel`, replace the `fitLabelInBox` + `paintLabel` calls with:

```ts
  const showTag =
    (theme.showTypeTag ?? true) && nodeBoxH >= 40 * dpr;
  const rawGlyph = typeStyle.glyph ?? null;
  const glyph = rawGlyph && glyphSupported(ctx, rawGlyph) ? rawGlyph : null;
  const layout = layoutLabelChip(ctx, {
    name: cached.text,
    glyph,
    typeTag: type ? type.toUpperCase() : null,
    maxWidthPx: Math.max(nodeBoxW * 1.6, 90 * dpr),
    fontPx: basePx,
    tagFontPx: Math.max(6 * dpr, basePx * 0.62),
    showTag,
  });
  if (!layout) return;
  paintChip(
    ctx, sx, sy + nodeBoxH / 2 + CHIP_GAP * dpr,
    layout, typeStyle, theme, fontFamily, fontWeight, dpr,
  );
```

`GraphTheme` in `types.ts` gains `showTypeTag: boolean;`; `buildTheme` result
gains `showTypeTag: true,`; `mergeTheme` gains
`showTypeTag: overrides.showTypeTag ?? base.showTypeTag,` and
`GraphThemeOverrides` gains `showTypeTag?: boolean;`.

Remove the now-unused `fitLabelInBox` import in `LabelOverlay.tsx` if it
becomes unused (it moves into chipLayout.ts). Keep the `focusIds` prop and
`data-focus-count` attribute untouched.

- [ ] **Step 5: Run tests + typecheck**

Run: `npx vitest run react/` and `npx tsc --noEmit -p react/tsconfig.json`
Expected: PASS. Existing `Graph.test.ts` may reference label behavior — if a
test asserts inside-node label painting, update it to the chip model.

- [ ] **Step 6: Commit**

```bash
git add react/
git commit -m "feat(labels): label chips below nodes with type glyph and zoom-adaptive type tag"
```

---

### Task 3: Node glow + selection ring (shader)

**Files:**
- Modify: `crates/graph-render/shaders/node.vert`
- Modify: `crates/graph-render/shaders/node.frag`
- Modify: `crates/graph-render/src/nodes.rs` (new uniform `u_glow_strength`)
- Modify: `crates/graph-render/src/theme/mod.rs` (`HoverStyle` gains `glow`)
- Modify: `crates/graph-main-wasm/src/engine/mod.rs` or `frame.rs` (pass glow to `NodeRenderer::draw`)

**Interfaces:**
- Consumes: existing flag bits (bit1 hover, bit2 select, bit3 dim), `u_time`.
- Produces: `HoverStyle.glow: f32` (serde `glow`, default 0.35); `NodeRenderer::draw(gl, vp, time, dim_opacity, dim_progress, glow_strength)` — update the single call site in the engine.

- [ ] **Step 1: Understand the constraint (no test possible for GLSL here)**

The node quad exactly bounds the shape, so glow (which lives *outside* the
shape) needs a padded quad. The vertex shader already scales the quad by 1.3
on hover — we generalize: emit a padded local coordinate so the fragment
shader can shade the margin.

- [ ] **Step 2: Implement `node.vert`**

Replace the body computations with padded-clip logic:

```glsl
#version 300 es
precision highp float;
layout(location = 0) in vec2 a_position;
layout(location = 1) in vec2 a_center;
layout(location = 2) in float a_half_w;
layout(location = 3) in float a_half_h;
layout(location = 4) in vec4 a_color;
layout(location = 5) in vec4 a_border_color;
layout(location = 6) in float a_border_width;
layout(location = 7) in float a_shape;
layout(location = 8) in float a_flags;
uniform mat4 u_vp;
uniform float u_time;
out vec2 v_local;
out vec4 v_color;
out vec4 v_border_color;
out float v_border_width;
out float v_shape;
out float v_radius;
out float v_flags;
void main() {
    float flags = a_flags;
    bool pulse = mod(flags, 2.0) > 0.5;
    bool hovered = mod(floor(flags / 2.0), 2.0) > 0.5;
    bool selected = mod(floor(flags / 4.0), 2.0) > 0.5;
    float scale_mod = 1.0;
    if (pulse)   scale_mod *= 1.0 + 0.08 * sin(u_time * 3.0);
    if (hovered) scale_mod *= 1.12;
    if (selected) scale_mod *= 1.0 + 0.04 * sin(u_time * 6.0);
    // Glow margin: only hovered/selected nodes get a padded quad; the shape
    // itself keeps its true size (picking is CPU-side and unaffected).
    bool glow = hovered || selected;
    float pad = glow ? 0.55 : 0.0;
    vec2 half_size = vec2(a_half_w, a_half_h) * scale_mod * (1.0 + pad);
    vec2 world = a_center + a_position * half_size;
    gl_Position = u_vp * vec4(world, 0.0, 1.0);
    v_local        = a_position * (1.0 + pad);
    v_color        = a_color;
    v_border_color = a_border_color;
    float effective = max(half_size.x, half_size.y);
    v_border_width = a_border_width / effective;
    if (pulse) v_border_width *= 1.0 + 0.4 * (0.5 + 0.5 * sin(u_time * 3.0));
    v_shape        = a_shape;
    v_radius       = effective;
    v_flags        = flags;
}
```

(Hover scale drops from 1.3 to 1.12 — the glow now carries the emphasis;
1.3 was jumpy next to the new visuals.)

- [ ] **Step 3: Implement glow in `node.frag`**

After computing `d` and `alpha`, add the glow/ring layer before dimming:

```glsl
uniform float u_glow_strength;   // from interaction.hover.glow (default 0.35)
// ...existing code...
    bool hovered = mod(floor(v_flags / 2.0), 2.0) > 0.5;
    bool selected = mod(floor(v_flags / 4.0), 2.0) > 0.5;
    if ((hovered || selected) && d > 0.0) {
        // Soft exponential falloff outside the shape; crisp bright ring right
        // at the boundary for selected nodes.
        float glow_alpha = u_glow_strength * exp(-3.2 * d);
        if (selected) glow_alpha += 0.55 * (1.0 - smoothstep(0.0, 0.09, d));
        vec4 glow_rgb = v_border_color;
        color.rgb = mix(color.rgb, glow_rgb.rgb, clamp(glow_alpha * 1.6, 0.0, 1.0));
        color.a = max(color.a, glow_alpha * glow_rgb.a);
        alpha = max(alpha, clamp(glow_alpha, 0.0, 1.0));
    }
```

Restructure `main()` so the `discard` happens after the glow computation
(move `if (alpha < 0.01) discard;` below the glow block, and compute
`border_mix`/`color` first). Ensure `frag_color = vec4(color.rgb, color.a * alpha);`
remains last after dimming.

- [ ] **Step 4: Plumb `u_glow_strength`**

`nodes.rs`: add `u_glow_strength: WebGlUniformLocation`, fetch
`"u_glow_strength"` in `new()` (treat as optional: use
`gl.get_uniform_location(...)` without `ok_or`, store `Option<...>` and set
only if `Some`, so a stale shader can't break the engine), extend `draw()`
with `glow_strength: f32` and `gl.uniform1f(...)`.

`theme/mod.rs`: `HoverStyle` gains

```rust
    #[serde(default = "defaults::hover_glow")]
    pub glow: f32,
```

with `pub fn hover_glow() -> f32 { 0.35 }` in `defaults.rs`; update
`HoverStyle::default()` accordingly.

Engine call site (search `node_renderer.draw(` in `crates/graph-main-wasm/src/engine/`):
pass `self.theme.interaction.hover.glow`.

`toEngineTheme.ts`: `interaction.hover` gains `glow: 0.35` — add
`hover: { glow: 0.35 }` inside the existing `interaction` object.
`toEngineTheme.test.ts`: assert the emitted JSON path `interaction.hover.glow === 0.35`.

- [ ] **Step 5: Build + test**

Run: `cargo test -p graph-render` and `npx vitest run react/theme/toEngineTheme.test.ts`
Expected: PASS. Then `wasm-pack build --target web --out-dir ../../pkg crates/graph-worker-wasm --out-name graph_worker_wasm && wasm-pack build --target web --out-dir ../../pkg-main crates/graph-main-wasm --out-name graph_main_wasm` must compile the shaders at runtime — shader compile errors surface in the browser test step of Task 8 verification (headless screenshot).

- [ ] **Step 6: Commit**

```bash
git add crates/ react/theme/
git commit -m "feat(render): node hover glow and selection ring in node shader"
```

---

### Task 4: Parallel-edge fan-out + stronger curvature (Rust)

**Files:**
- Modify: `crates/graph-main-wasm/src/bezier.rs` (shared control-point helper, new defaults)
- Modify: `crates/graph-main-wasm/src/engine/buffers.rs:215-305` (per-edge bend from parallel index)
- Test: `crates/graph-main-wasm/src/bezier.rs` tests module (extend)

**Interfaces:**
- Produces: `pub fn quadratic_control_point(p0: (f32,f32), p1: (f32,f32), bend_ratio: f32) -> (f32,f32)` and `pub fn quadratic_point(p0: (f32,f32), c: (f32,f32), p1: (f32,f32), t: f32) -> (f32,f32)` in `bezier.rs` (Task 6 consumes `quadratic_point`).
- Consumes: nothing from earlier tasks.

- [ ] **Step 1: Write the failing tests**

Append to `bezier.rs`'s `mod tests`:

```rust
    #[test]
    fn parallel_edges_fan_out_symmetrically() {
        // Three edges between the same endpoints with sibling indices 0,1,2
        // must produce three distinct curves, symmetric around the chord.
        let p0 = (0.0, 0.0);
        let p1 = (100.0, 0.0);
        let bends: Vec<f32> = (0..3).map(|i| sibling_bend(0.10, i)).collect();
        let mids: Vec<(f32, f32)> = bends
            .iter()
            .map(|&b| quadratic_point(p0, quadratic_control_point(p0, p1, b), p1, 0.5))
            .collect();
        // distinct
        assert!((mids[0].1 - mids[1].1).abs() > 1.0);
        assert!((mids[1].1 - mids[2].1).abs() > 1.0);
        // symmetric: first sibling bends one way, second the other
        assert!(mids[0].1.signum() != mids[1].1.signum());
    }

    #[test]
    fn single_edge_keeps_base_bend() {
        assert!((sibling_bend(0.10, 0) - 0.10).abs() < 1e-6);
    }

    #[test]
    fn control_point_is_perpendicular_to_chord() {
        let c = quadratic_control_point((0.0, 0.0), (100.0, 0.0), 0.1);
        assert!(c.0 > 49.0 && c.0 < 51.0);
        assert!((c.1.abs() - 10.0).abs() < 0.01);
    }
```

- [ ] **Step 2: Run to verify fail**

Run: `cargo test -p graph-main-wasm bezier`
Expected: FAIL — `sibling_bend`, `quadratic_control_point`, `quadratic_point` undefined.

- [ ] **Step 3: Implement in `bezier.rs`**

```rust
/// Bend ratio for the `sibling_index`-th edge among parallel edges sharing
/// the same ordered endpoint pair. Index 0 keeps the base bend; subsequent
/// siblings alternate sides with growing magnitude so parallel edges fan out
/// instead of stacking.
pub fn sibling_bend(base: f32, sibling_index: usize) -> f32 {
    if sibling_index == 0 {
        return base;
    }
    let magnitude = base * (1.0 + (sibling_index as f32 + 1.0) / 2.0);
    if sibling_index % 2 == 1 { magnitude } else { -magnitude }
}

/// Control point of the quadratic bezier: chord midpoint offset perpendicular
/// by `chord_length * bend_ratio`.
pub fn quadratic_control_point(
    p0: (f32, f32),
    p1: (f32, f32),
    bend_ratio: f32,
) -> (f32, f32) {
    let dx = p1.0 - p0.0;
    let dy = p1.1 - p0.1;
    let chord_len = (dx * dx + dy * dy).sqrt().max(1e-5);
    let nx = -dy / chord_len;
    let ny = dx / chord_len;
    let off = chord_len * bend_ratio;
    ((p0.0 + p1.0) * 0.5 + nx * off, (p0.1 + p1.1) * 0.5 + ny * off)
}

/// Point on the quadratic bezier at parameter `t ∈ [0,1]`.
pub fn quadratic_point(
    p0: (f32, f32),
    c: (f32, f32),
    p1: (f32, f32),
    t: f32,
) -> (f32, f32) {
    let u = 1.0 - t;
    (
        p0.0 * u * u + c.0 * 2.0 * u * t + p1.0 * t * t,
        p0.1 * u * u + c.1 * 2.0 * u * t + p1.1 * t * t,
    )
}
```

Refactor `tessellate_quadratic` to use `quadratic_control_point` +
`quadratic_point` (identical math, no behavior change), and raise
`DEFAULT_BEND_RATIO` from `0.04` to `0.10` and `DEFAULT_SEGMENTS` from 4 to 6
(smoother gradient bands; overdraw stays bounded because Task 5 lowers
mid-curve alpha). Update the stale comment block above the constants.

- [ ] **Step 4: Wire per-edge bend in `buffers.rs`**

In `rebuild_edge_and_arrow_buffers`, before the loop build a sibling counter:

```rust
        let mut sibling_counts: std::collections::HashMap<(usize, usize), usize> =
            std::collections::HashMap::new();
```

Inside the loop, after `s_idx`/`t_idx` are computed (skip when either is
`None` — keep base bend), compute:

```rust
            let sibling_index = match (s_idx, t_idx) {
                (Some(a), Some(b)) => {
                    let n = sibling_counts.entry((a, b)).or_insert(0);
                    let idx = *n;
                    *n += 1;
                    idx
                }
                _ => 0,
            };
            let bend = crate::bezier::sibling_bend(DEFAULT_BEND_RATIO, sibling_index);
```

and change the tessellation call to
`tessellate_quadratic(draw_src, draw_tgt, bend, DEFAULT_SEGMENTS)`.

- [ ] **Step 5: Run tests**

Run: `cargo test -p graph-main-wasm`
Expected: PASS (new + existing bezier/buffer tests).

- [ ] **Step 6: Commit**

```bash
git add crates/graph-main-wasm/
git commit -m "feat(engine): fan out parallel edges with per-sibling bezier bends"
```

---

### Task 5: Edge gradient — source color → target color (Rust, CPU per-segment)

**Files:**
- Modify: `crates/graph-main-wasm/src/engine/buffers.rs:215-305` (gradient per segment)
- Test: `crates/graph-main-wasm/src/engine/buffers.rs` tests module (extend)

**Interfaces:**
- Consumes: `tessellate_quadratic` arc positions (Task 4), `self.node_metadata` + `resolved_node_style` (existing), `paint_edge_for_focus` (existing focus/dim logic).
- Produces: `fn lerp_color(a: [f32;4], b: [f32;4], t: f32) -> [f32;4]` and `fn gradient_endpoint_colors(&self, s_idx, t_idx, fallback: [f32;4]) -> ([f32;4],[f32;4])` (private helpers, unit-tested).

- [ ] **Step 1: Write the failing tests**

Append to `buffers.rs`'s `mod tests`:

```rust
    use super::{lerp_color, mid_curve_alpha};

    #[test]
    fn lerp_endpoints() {
        let a = [1.0, 0.0, 0.0, 1.0];
        let b = [0.0, 0.0, 1.0, 0.5];
        assert_eq!(lerp_color(a, b, 0.0), a);
        assert_eq!(lerp_color(a, b, 1.0), b);
        let m = lerp_color(a, b, 0.5);
        assert!((m[0] - 0.5).abs() < 1e-6 && (m[2] - 0.5).abs() < 1e-6);
        assert!((m[3] - 0.75).abs() < 1e-6);
    }

    #[test]
    fn mid_curve_alpha_dips_and_recovers() {
        let edge = mid_curve_alpha(1.0, 0.0);
        let mid = mid_curve_alpha(1.0, 0.5);
        let end = mid_curve_alpha(1.0, 1.0);
        assert!(mid < edge && mid >= 0.7);
        assert!((edge - end).abs() < 1e-6);
    }
```

- [ ] **Step 2: Run to verify fail**

Run: `cargo test -p graph-main-wasm buffers`
Expected: FAIL — functions undefined.

- [ ] **Step 3: Implement**

In `buffers.rs`:

```rust
fn lerp_color(a: [f32; 4], b: [f32; 4], t: f32) -> [f32; 4] {
    [
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t,
        a[3] + (b[3] - a[3]) * t,
    ]
}

/// Direction-without-motion cue: alpha dips to 75% mid-curve and recovers at
/// the endpoints.
fn mid_curve_alpha(alpha: f32, t: f32) -> f32 {
    alpha * (0.75 + 0.25 * (2.0 * t - 1.0).abs())
}
```

In `rebuild_edge_and_arrow_buffers`, per edge compute gradient endpoints from
the *node* type colors (border color reads as the node's accent):

```rust
            let edge_rgb = parse_color_tuple(painted.color_hex_or_similar); // see note
```

Reality check against the current code: `painted` already holds the focus/dim-
resolved `[f32;4]`. Restructure so gradient happens on the *base* edge color
and node accents, then focus/dim transforms apply per segment:

1. Before the segment loop:
   - `let base_edge_color = parse_color_tuple(style.color_hex);`
   - `let (from_color, to_color) = self.gradient_endpoint_colors(s_idx, t_idx, base_edge_color);`
     where the helper returns each endpoint's node type `border_color` parsed
     (via `node_metadata` → `resolved_node_style(...).border_color`), falling
     back to `base_edge_color` when metadata is missing.
   - Determine focus state once (reuse the existing `paint_edge_for_focus`
     logic by refactoring it into `fn edge_focus_state(...) -> EdgeFocus` with
     variants `None | Focused | Dimmed`, keeping the exact current width/alpha
     rules).
2. In the segment loop, `let t = (s.arc_start + seg_len * 0.5) / total_arc;`
   (track cumulative arc — `Segment.arc_start` exists; compute `seg_len` from
   from/to) then:
   - `let mut color = lerp_color(from_color, to_color, t);`
   - `color[3] = mid_curve_alpha(color[3], t);`
   - Apply focus transform: `Focused` → selection color at `FOCUS_EDGE_ALPHA`
     (unchanged), `Dimmed` → `color[3] *= spotlight_dim_opacity`.
   - Width: `Focused` → `width * FOCUS_EDGE_WIDTH_SCALE`, `Dimmed` →
     `(width * DIM_EDGE_WIDTH_SCALE).max(0.5)`, else `style.width`.

Keep `paint_edge_for_focus`'s public behavior via the refactor — existing
tests of focus behavior must still pass (check `mod tests` / callers for
direct uses; if it's only used in the loop, inline it).

- [ ] **Step 4: Run tests**

Run: `cargo test -p graph-main-wasm`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add crates/graph-main-wasm/
git commit -m "feat(engine): source-to-target gradient edges with mid-curve alpha dip"
```

---

### Task 6: Arrow tangent alignment with curve (Rust)

**Files:**
- Modify: `crates/graph-main-wasm/src/engine/buffers.rs:286-297` (arrow instance endpoints)
- Test: `crates/graph-main-wasm/src/bezier.rs` tests (tangent case)

**Interfaces:**
- Consumes: `quadratic_control_point`, `quadratic_point`, per-edge `bend` (Task 4/5 loop variables).
- Produces: none new.

- [ ] **Step 1: Write the failing test**

Append to `bezier.rs` tests:

```rust
    #[test]
    fn near_end_point_follows_curve_not_chord() {
        // With a strong bend, the point at t=0.97 must sit off the chord —
        // this is what arrows align to.
        let p0 = (0.0, 0.0);
        let p1 = (100.0, 0.0);
        let c = quadratic_control_point(p0, p1, 0.2);
        let near = quadratic_point(p0, c, p1, 0.97);
        assert!(near.1.abs() > 1.0, "y={}", near.1);
        assert!(near.0 > 90.0 && near.0 < 100.0);
    }
```

- [ ] **Step 2: Run to verify fail** — already passes if Task 4 landed
  `quadratic_point` (it does the math); in that case treat this as a
  characterization test and keep it.

Run: `cargo test -p graph-main-wasm bezier`
Expected: PASS.

- [ ] **Step 3: Change arrow instances in `buffers.rs`**

The arrow shader orients the triangle along `a_to - a_from`. Feed it the
curve's end tangent by moving `a_from` onto the curve just before the tip:

```rust
            // Arrows align with the curve tangent at the target, not the
            // straight chord: place the instance's "from" on the curve at
            // t = 0.97 so arrow.vert's dir = to - from matches the tangent.
            let ctrl = crate::bezier::quadratic_control_point(draw_src, draw_tgt, bend);
            let near_tip = crate::bezier::quadratic_point(draw_src, ctrl, draw_tgt, 0.97);
            arrow_instances.extend_from_slice(&[
                near_tip.0,
                near_tip.1,
                draw_tgt.0,
                draw_tgt.1,
                ARROW_WORLD_SIZE,
                painted_color_for_arrow[0], // reuse the same focus-resolved color as the edge's final segment
                painted_color_for_arrow[1],
                painted_color_for_arrow[2],
                painted_color_for_arrow[3],
            ]);
```

(`painted_color_for_arrow` = the color computed for the last segment in the
Task 5 loop — capture it after the segment loop as `last_segment_color`.)

- [ ] **Step 4: Run tests**

Run: `cargo test -p graph-main-wasm`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add crates/graph-main-wasm/
git commit -m "fix(engine): align arrowheads with bezier end tangent"
```

---

### Task 7: Hover edge emphasis (Rust)

**Files:**
- Modify: `crates/graph-main-wasm/src/engine/buffers.rs` (`rebuild_edge_and_arrow_buffers` focus logic)
- Test: `crates/graph-main-wasm/src/engine/buffers.rs` tests (hover state)

**Interfaces:**
- Consumes: `self.hovered_idx` (existing), `EdgeFocus` refactor (Task 5), `HoverStyle.dim_others` (existing theme field).
- Produces: `EdgeFocus::Hovered` handling.

- [ ] **Step 1: Write the failing test**

```rust
    #[test]
    fn hover_brightens_incident_edges_and_dims_others() {
        // edge_focus_state with a hovered node: incident edges are Hovered,
        // others get HoverDimmed.
        let mut coord_to_idx = std::collections::HashMap::new();
        coord_to_idx.insert((0.0f32.to_bits(), 0.0f32.to_bits()), 0usize);
        coord_to_idx.insert((100.0f32.to_bits(), 0.0f32.to_bits()), 1usize);
        coord_to_idx.insert((200.0f32.to_bits(), 0.0f32.to_bits()), 2usize);
        let st = edge_focus_state(None, Some(0), &coord_to_idx, (0.0, 0.0), (100.0, 0.0));
        assert!(matches!(st, EdgeFocus::Hovered));
        let st2 = edge_focus_state(None, Some(0), &coord_to_idx, (100.0, 0.0), (200.0, 0.0));
        assert!(matches!(st2, EdgeFocus::HoverDimmed));
        let st3 = edge_focus_state(None, None, &coord_to_idx, (0.0, 0.0), (100.0, 0.0));
        assert!(matches!(st3, EdgeFocus::None));
    }
```

- [ ] **Step 2: Run to verify fail**

Run: `cargo test -p graph-main-wasm buffers`
Expected: FAIL — `edge_focus_state`/`EdgeFocus` undefined (or missing variants).

- [ ] **Step 3: Implement**

Extend the Task 5 `EdgeFocus` enum: `None | Focused | Dimmed | Hovered | HoverDimmed`,
computed by (signature):

```rust
fn edge_focus_state(
    spotlight_idx: Option<usize>,
    hovered_idx: Option<usize>,
    coord_to_idx: &std::collections::HashMap<(u32, u32), usize>,
    src: (f32, f32),
    tgt: (f32, f32),
) -> EdgeFocus
```

Rules (spotlight wins over hover):
- spotlight set + incident → `Focused`; spotlight set + not → `Dimmed`
- else hover set + incident → `Hovered`; hover set + not → `HoverDimmed`
- else `None`

Paint mapping in the segment loop:
- `Hovered`: `width * 1.6`, `color[3] = (color[3] + 0.25).min(1.0)`
- `HoverDimmed`: `color[3] *= 0.5` (theme `hover.dim_others` default is 0 — do
  NOT use it; 0 would erase edges. Fixed 0.5 factor, noted in comment.)

(If `hover.dim_others` proves to be a fraction elsewhere, use
`1.0 - (1.0 - 0.5) ...` — no: keep the fixed 0.5 with a comment; theme-driven
hover dim is a separate concern.)

- [ ] **Step 4: Run tests**

Run: `cargo test -p graph-main-wasm`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add crates/graph-main-wasm/
git commit -m "feat(engine): emphasize hovered node's edges, de-emphasize others"
```

---

### Task 8: Override keys + engine JSON additions (TS + Rust serde)

**Files:**
- Modify: `react/theme/types.ts` (`GraphTheme` gains `edgeCurvature: number`; overrides gain `edgeCurvature?`, `nodeFillTint?`, `showTypeTag?` — showTypeTag landed in Task 2)
- Modify: `react/theme/buildTheme.ts` (`edgeCurvature: 0.10`)
- Modify: `react/theme/mergeTheme.ts` (pass `edgeCurvature`; `nodeFillTint` recomputes fills)
- Modify: `react/theme/toEngineTheme.ts` (emit `edges.default.bendRatio`)
- Modify: `crates/graph-render/src/theme/mod.rs` (`EdgeStyle` gains optional `bend_ratio`)
- Modify: `crates/graph-main-wasm/src/engine/buffers.rs` (use per-theme bend as base)
- Test: `react/theme/toEngineTheme.test.ts`, `react/theme/mergeTheme.test.ts`, Rust serde test in `theme/mod.rs`

**Interfaces:**
- Produces: `GraphTheme.edgeCurvature: number`; engine `edges.default.bendRatio?: number`; `EdgeStyle.bend_ratio: Option<f32>` (serde `bendRatio`).

- [ ] **Step 1: Failing tests**

`toEngineTheme.test.ts` addition:

```ts
  test("edgeCurvature flows to edges.default.bendRatio", () => {
    const t = buildGraphTheme("dark");
    const json = graphThemeToEngineJson(t) as { edges: { default: { bendRatio: number } } };
    expect(json.edges.default.bendRatio).toBeCloseTo(0.10);
  });
```

`mergeTheme.test.ts` additions:

```ts
  test("nodeFillTint recomputes per-type fills from border colors", () => {
    const base = buildGraphTheme("dark");
    const merged = mergeGraphTheme(base, { nodeFillTint: 0.4 });
    for (const type of NODE_TYPES) {
      expect(merged.nodeTypes[type].color).toBe(
        tintFill(base.nodeTypes[type].borderColor, 0.4),
      );
    }
  });

  test("edgeCurvature override wins", () => {
    const merged = mergeGraphTheme(buildGraphTheme("dark"), { edgeCurvature: 0.25 });
    expect(merged.edgeCurvature).toBe(0.25);
  });
```

Rust `theme/mod.rs` test addition:

```rust
    #[test]
    fn edge_default_bend_ratio_parses() {
        let json = r##"{"background":"#000","nodes":{"default":{"shape":"circle","size":12,"color":"#888"}},"edges":{"default":{"color":"#333","width":1,"bendRatio":0.12}}}"##;
        let theme: ThemeConfig = serde_json::from_str(json).unwrap();
        assert_eq!(theme.edges.default.bend_ratio, Some(0.12));
    }
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run react/theme/ && cargo test -p graph-render`
Expected: FAIL on the new assertions.

- [ ] **Step 3: Implement**

- `types.ts`: `GraphTheme` gains `edgeCurvature: number;`;
  `GraphThemeOverrides` gains `edgeCurvature?: number; nodeFillTint?: number;`.
- `buildTheme.ts`: result gains `edgeCurvature: 0.10,`.
- `mergeTheme.ts`: after building `merged`, if `overrides.nodeFillTint` is
  defined, rewrite every `nodeTypes[k].color = tintFill(nodeTypes[k].borderColor, overrides.nodeFillTint)`
  and same for `defaultNodeStyle` (guard non-hex borderColor by skipping it);
  import `tintFill` from `./buildTheme`. Add `edgeCurvature: overrides.edgeCurvature ?? base.edgeCurvature`.
- `toEngineTheme.ts`: `toDefaultEdge` gains `bendRatio: s.bendRatio` — needs
  `EdgeTypeStyle.bendRatio?: number`; set it in `buildTheme`'s
  `defaultEdgeStyle` from the theme's `edgeCurvature`.
- Rust `theme/mod.rs`: `EdgeStyle` gains
  `#[serde(rename = "bendRatio", default)] pub bend_ratio: Option<f32>,`.
- `buffers.rs`: `let base_bend = self.theme.edges.default.bend_ratio.unwrap_or(DEFAULT_BEND_RATIO);`
  and `sibling_bend(base_bend, sibling_index)`.

- [ ] **Step 4: Run full validation gate**

Run: `cargo fmt --all --check && cargo clippy --all-targets -- -D warnings -A clippy::chunks_exact_to_as_chunks && cargo test -p graph-core -p graph-layout --all-features && cargo test -p graph-render -p graph-main-wasm && npm test && npx tsc --noEmit -p react/tsconfig.json`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add react/ crates/
git commit -m "feat(theme): expose edgeCurvature, nodeFillTint, showTypeTag overrides"
```

---

### Task 9: Visual verification + PR + release

**Files:**
- Modify: `CHANGELOG.md` (top entry, if the repo maintains it manually — check first; release.yml may generate it. If generated, skip.)
- Modify: `README.md` / `react/README.md` only if they document the old uniform-glass rule or inside-node labels.

- [ ] **Step 1: Build the wasm package locally**

Run (mirrors ci.yml):
`curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh` (if wasm-pack missing)
`wasm-pack build --target web --out-dir ../../pkg crates/graph-worker-wasm --out-name graph_worker_wasm`
`wasm-pack build --target web --out-dir ../../pkg-main crates/graph-main-wasm --out-name graph_main_wasm`
then assemble per package.json files list (or `npm pack`).

- [ ] **Step 2: Local showcase check against the tarball**

In a scratch copy of the showcase (do NOT commit to showcase):
`npm install /home/dany/projects/invariantcontinuum/graph/invariantcontinuum-graph-<ver>.tgz`
`npm run dev`, then headless-screenshot the playground (dark + light), e.g.
reuse `/tmp/pwtest/shot2.mjs` against `http://localhost:3000/showcase`.
Verify: per-type shapes visible, tinted fills, chips with glyphs below nodes,
type tag appears when zoomed (node ≥ 40px), parallel edges fan out, gradient
reads source→target, hover glow, arrows aligned to curve.

- [ ] **Step 3: Rebuild repo wasm artifacts**

The repo commits built wasm at the package root (`graph_main_wasm*.js/wasm` — check `package.json` files list and how CI/release builds them; replicate the release build exactly so the PR contains fresh artifacts).

- [ ] **Step 4: Push branch, open PR, merge**

```bash
git push -u origin feat/node-edge-visual-redesign
gh pr create --title "feat: brighter node & edge visuals" --body "Spec: .jules/specs/2026-08-07-node-edge-visual-redesign-design.md — shape-coded tinted nodes, glyph chips, gradient curved edges, hover emphasis. Before/after screenshots attached."
```

Attach before/after screenshots to the PR body. Wait for CI green, then merge.

- [ ] **Step 5: Verify release + showcase auto-bump + Pages deploy**

- `gh run list` — Release + Publish succeed; new tag (minor bump).
- Showcase repo: auto-bump commit `chore: bump @invariantcontinuum/graph to <new>`; if its Pages deploy doesn't fire, `gh workflow run deploy.yml --ref main` in the showcase repo.
- Confirm https://invariantcontinuum.github.io/showcase/ shows the new visuals (headless screenshot).

---

## Self-review notes

- Spec coverage: §1 nodes → Tasks 1+3; §2 content → Task 2; §3 edges → Tasks 4+5+6; §4 interaction → Tasks 3+7; §5 API → Task 8; §6 testing → per-task steps + Task 9; release → Task 9.
- Deliberate spec amendment: labels move from inside-node to **chip below node** (required for non-card shapes; matches the approved ASCII mockups). `MIN_NODE_WIDTH_PX`-style culling constants in LabelOverlay stay as culling gates only.
- `docs/` gitignored → plan/spec under `.jules/`.
