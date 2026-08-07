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

// A chip that had to ellipsize the name down to fewer than this many visible
// characters carries no information ("x…") — hide the label instead.
const MIN_SURVIVING_CHARS = 4;

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

  // fitLabelInBox's ellipsized fallback always succeeds when the height
  // budget allows one line, so "does not fit" has to be judged by how much
  // of the name survived: an ellipsized chip showing < MIN_SURVIVING_CHARS
  // characters is noise, not a label.
  if (fitted.lines.some((line) => line.includes("…"))) {
    const kept = fitted.lines.join("").replaceAll("…", "").trim();
    if (Array.from(kept).length < MIN_SURVIVING_CHARS) return null;
  }

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
