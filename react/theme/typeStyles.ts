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
