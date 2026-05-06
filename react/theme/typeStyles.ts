// Per-node-type shape + size table. Theme-independent — colors live in palette.ts.

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
}

const R_LARGE: Omit<TypeShape, "shape"> = {
  halfWidth: 66,
  halfHeight: 24,
  cornerRadius: 8,
  borderWidth: 2.2,
  labelSize: 12,
};
const R_COMPACT: Omit<TypeShape, "shape"> = {
  halfWidth: 54,
  halfHeight: 20,
  cornerRadius: 8,
  borderWidth: 2,
  labelSize: 11,
};

export const TYPE_STYLES: Record<NodeType, TypeShape> = {
  service:  { shape: "roundrectangle", ...R_LARGE },
  source:   { shape: "roundrectangle", ...R_LARGE },
  data:     { shape: "roundrectangle", ...R_LARGE },
  config:   { shape: "roundrectangle", ...R_LARGE },
  script:   { shape: "roundrectangle", ...R_LARGE },
  doc:      { shape: "roundrectangle", ...R_LARGE },
  asset:    { shape: "roundrectangle", ...R_LARGE },
  database: { shape: "barrel",         ...R_LARGE },
  cache:    { shape: "barrel",         ...R_LARGE },
  policy:   { shape: "diamond",        halfWidth: 64, halfHeight: 32, cornerRadius: 8, borderWidth: 2.6, labelSize: 12 },
  adr:      { shape: "roundrectangle", ...R_COMPACT },
  incident: { shape: "roundrectangle", halfWidth: 56, halfHeight: 22, cornerRadius: 8, borderWidth: 2.6, labelSize: 11 },
  external: { shape: "roundrectangle", halfWidth: 58, halfHeight: 22, cornerRadius: 8, borderWidth: 2.1, labelSize: 11 },
};

export const DEFAULT_STYLE: TypeShape = {
  shape: "roundrectangle",
  halfWidth: 66,
  halfHeight: 24,
  cornerRadius: 8,
  borderWidth: 2,
  labelSize: 12,
};

export function typeStyleFor(type: string | undefined | null): TypeShape {
  if (!type) return DEFAULT_STYLE;
  return (TYPE_STYLES as Record<string, TypeShape | undefined>)[type] ?? DEFAULT_STYLE;
}
