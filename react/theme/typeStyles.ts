// Per-node-type shape + size table. Theme-independent — colors live in palette.ts.

import type { NodeType } from "./palette";

export type Shape =
  | "roundrectangle"
  | "barrel"
  | "diamond"
  | "hexagon"
  | "octagon"
  | "triangle"
  | "square"
  | "circle";

export interface TypeShape {
  shape: Shape;
  halfWidth: number;
  halfHeight: number;
  cornerRadius: number;
  borderWidth: number;
  labelSize: number;
}

const NODE_CARD: Omit<TypeShape, "shape"> = {
  halfWidth: 68,
  halfHeight: 24,
  cornerRadius: 10,
  borderWidth: 1.35,
  labelSize: 12,
};

const NODE_CARD_COMPACT: Omit<TypeShape, "shape"> = {
  halfWidth: 58,
  halfHeight: 22,
  cornerRadius: 10,
  borderWidth: 1.25,
  labelSize: 11,
};

export const TYPE_STYLES: Record<NodeType, TypeShape> = {
  service: { shape: "roundrectangle", ...NODE_CARD },
  source: { shape: "roundrectangle", ...NODE_CARD },
  data: { shape: "roundrectangle", ...NODE_CARD },
  config: { shape: "roundrectangle", ...NODE_CARD },
  script: { shape: "roundrectangle", ...NODE_CARD },
  doc: { shape: "roundrectangle", ...NODE_CARD },
  asset: { shape: "roundrectangle", ...NODE_CARD },
  database: { shape: "roundrectangle", ...NODE_CARD },
  cache: { shape: "roundrectangle", ...NODE_CARD },
  policy: { shape: "roundrectangle", ...NODE_CARD },
  adr: { shape: "roundrectangle", ...NODE_CARD_COMPACT },
  incident: {
    shape: "roundrectangle",
    ...NODE_CARD_COMPACT,
    borderWidth: 1.45,
  },
  external: { shape: "roundrectangle", ...NODE_CARD_COMPACT },
};

export const DEFAULT_STYLE: TypeShape = {
  shape: "roundrectangle",
  halfWidth: 68,
  halfHeight: 24,
  cornerRadius: 10,
  borderWidth: 1.35,
  labelSize: 12,
};

export function typeStyleFor(type: string | undefined | null): TypeShape {
  if (!type) return DEFAULT_STYLE;
  return (
    (TYPE_STYLES as Record<string, TypeShape | undefined>)[type] ??
    DEFAULT_STYLE
  );
}
