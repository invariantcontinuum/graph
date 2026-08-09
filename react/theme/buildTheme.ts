// Compose a `GraphTheme` from `palette x typeStyles`.
// Tinted-fill rule is enforced here — every node type's fill derives from its
// border color, so a reviewer can see the uniform rule at a glance.

import type { GraphTheme, NodeTypeStyle, EdgeTypeStyle } from "./types";
import { LIGHT, DARK, NODE_TYPES, EDGE_TYPES, type EdgeType } from "./palette";
import { TYPE_STYLES, DEFAULT_STYLE } from "./typeStyles";

// Tinted-fill rule: every node type's fill is its border color at a low
// alpha over the canvas — nodes read as colored, not as black glass.
// `hex` must be a #rrggbb palette entry.
export function tintFill(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const LABEL_FONT = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const LABEL_WEIGHT = 760;

const EDGE_TYPE_LINE_WIDTH: Record<EdgeType, number> = {
  depends:    2.1,
  depends_on: 2.1,
  violation:  2.9,
  enforces:   2.2,
  why:        2.2,
  drift:      1.9,
};

const EDGE_TYPE_STYLE: Record<EdgeType, EdgeTypeStyle["style"]> = {
  depends:    "solid",
  depends_on: "solid",
  violation:  "dashed",
  enforces:   "dotted",
  why:        "short-dashed",
  drift:      "dashed",
};

const themeCache = new Map<string, GraphTheme>();

export function buildGraphTheme(mode: "light" | "dark"): GraphTheme {
  // ⚡ Bolt: Cache built themes to guarantee identity stability for the base
  // theme. This prevents downstream cascading identity drops.
  if (themeCache.has(mode)) {
    return themeCache.get(mode)!;
  }

  const p = mode === "light" ? LIGHT : DARK;

  const nodeTypes: Record<string, NodeTypeStyle> = {};
  for (const type of NODE_TYPES) {
    const shape = TYPE_STYLES[type];
    nodeTypes[type] = {
      shape: shape.shape,
      halfWidth: shape.halfWidth,
      halfHeight: shape.halfHeight,
      cornerRadius: shape.cornerRadius,
      color: tintFill(p.typeBorders[type], mode === "dark" ? 0.2 : 0.12),
      borderColor: p.typeBorders[type],
      borderWidth: shape.borderWidth,
      labelColor: p.labelColor,
      labelFont: LABEL_FONT,
      labelSize: shape.labelSize,
      labelWeight: LABEL_WEIGHT,
      glyph: shape.glyph,
    };
  }

  const edgeTypes: Record<string, EdgeTypeStyle> = {};
  for (const type of EDGE_TYPES) {
    edgeTypes[type] = {
      color: p.edgeAccents[type].line,
      width: EDGE_TYPE_LINE_WIDTH[type],
      style: EDGE_TYPE_STYLE[type],
      arrow: "triangle",
    };
  }

  const defaultNodeStyle: NodeTypeStyle = {
    shape: DEFAULT_STYLE.shape,
    halfWidth: DEFAULT_STYLE.halfWidth,
    halfHeight: DEFAULT_STYLE.halfHeight,
    cornerRadius: DEFAULT_STYLE.cornerRadius,
    color: tintFill(p.nodeDefaultBorder.startsWith("#") ? p.nodeDefaultBorder : "#94a3b8", mode === "dark" ? 0.18 : 0.1),
    borderColor: p.nodeDefaultBorder,
    borderWidth: DEFAULT_STYLE.borderWidth,
    labelColor: p.labelColor,
    labelFont: LABEL_FONT,
    labelSize: DEFAULT_STYLE.labelSize,
    labelWeight: LABEL_WEIGHT,
    glyph: DEFAULT_STYLE.glyph,
  };

  // Base edge curvature — single source for GraphTheme.edgeCurvature and the
  // engine's edges.default.bendRatio.
  const edgeCurvature = 0.10;

  const defaultEdgeStyle: EdgeTypeStyle = {
    color: p.edgeDefault,
    width: 1.6,
    style: "solid",
    arrow: "triangle",
    bendRatio: edgeCurvature,
  };

  const result = {
    canvasBg: p.canvasBg,
    gridLineColor: p.gridLine,
    selectionBorder: p.selection,
    selectionFill: mode === "dark"
      ? "rgba(34, 211, 238, 0.22)"
      : "rgba(37, 99, 235, 0.16)",
    hullFill: p.hullFill,
    hullStroke: p.hullStroke,
    dimOpacity: 0.14,
    labelHalo: p.labelHalo,
    dimText: p.dimText,
    showTypeTag: true,
    edgeCurvature,
    nodeTypes,
    edgeTypes,
    defaultNodeStyle,
    defaultEdgeStyle,
  };

  themeCache.set(mode, result);
  return result;
}
