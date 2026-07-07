# Design

Visual system for the `@invariantcontinuum/graph` showcase. Dark, locked (the
engine's dark canvas is the identity; the page extends it). Light rendering is
demonstrated inside the theming section's contained canvas only.

## Color

Anchored to the engine's own dark palette (`react/theme/palette.ts`).

| Token | Value | Role |
| --- | --- | --- |
| `--bg` | `#070a12` | Page background, identical to engine canvasBg for seamless hero |
| `--surface` | `#0b101c` | Raised panels, control rails |
| `--surface-2` | `#101828` | Hover / active fills, code blocks |
| `--ink` | `#f8fafc` | Headings, primary text (engine labelColor) |
| `--ink-2` | `#bac6d9` | Body text |
| `--ink-3` | `#8494ad` | Secondary / captions (AA on bg for ≥14px 500) |
| `--line` | `rgba(148,163,184,.16)` | Hairlines, borders |
| `--accent` | `#22d3ee` | Single accent (engine selection cyan). Committed strategy |
| `--accent-ink` | `#04222a` | Text on accent fills |

One accent, used identically everywhere. No gradients as decoration, no glows.

## Typography

- Display + body: **Archivo** (variable, `wdth` axis). Display at weight 640-740,
  width ~118 for instrument-plate presence; body at 400/460.
- Code + data: **JetBrains Mono** 400/600. Mono is justified: this is a developer
  package and code is content.
- Scale: fluid clamp, ratio ≥1.3. Display ceiling 4.4rem. `text-wrap: balance`
  on headings. Body max 68ch.

## Shape & Space

- One radius system: 12px panels, 8px controls, 999px pills for segmented options.
- Spacing on an 8px grid; section rhythm `clamp(72px, 12vh, 140px)` with tighter
  grouping inside panels.
- Layout families used once each: full-bleed hero overlay, asymmetric capability
  grid (2fr/1fr rows), rail + stage playground, centered stress-test stage,
  split theming demo, prose + code API section.

## Motion

- One orchestrated hero load-in (rise + fade, 3 staggered elements, 600ms,
  ease-out-quint).
- Scroll reveals via IntersectionObserver adding `.in`; hidden state only exists
  under `html.js` so content is never gated on JS.
- vanilla-tilt on capability tiles: max 6°, no glare, desktop pointer only.
- Everything collapses under `prefers-reduced-motion: reduce`. The engine's own
  layout settling provides ambient motion; UI chrome stays quiet.

## Components

- `EngineFrame`: bordered canvas container (1px `--line`, 12px radius, engine
  canvas bleeds to edges), lazy-mounts its GraphScene near viewport, shows a
  skeleton shimmer while WASM boots, static fallback message without WebGL2.
- `CodeBlock`: `--surface-2`, hand-tokenized spans (`.tok-kw`, `.tok-str`,
  `.tok-fn`, `.tok-cm`), copy button top-right.
- Segmented controls: pill group on `--surface`, active option accent-filled
  with `--accent-ink` text.
- Buttons: primary = accent fill; secondary = 1px `--line` border, ink text.
  `:active` scale .98. Focus: 2px accent ring, 2px offset, never removed.
