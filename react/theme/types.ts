import type { Shape } from "./typeStyles";

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

export interface EdgeTypeStyle {
  color: string;
  width: number;
  style: "solid" | "dashed" | "short-dashed" | "dotted";
  arrow: "triangle" | "none";
  /** Base quadratic bend ratio for curved edges; emitted as `bendRatio` on
   *  the engine's `edges.default`. */
  bendRatio?: number;
}

export interface GraphTheme {
  canvasBg: string;
  gridLineColor: string;
  selectionBorder: string;
  selectionFill: string;
  hullFill: string;
  hullStroke: string;
  dimOpacity: number;
  labelHalo: string;
  dimText: string;
  /** Show the uppercase type tag line inside the label chip (zoom-gated at
   *  paint time). */
  showTypeTag: boolean;
  /** Base curvature for edges (bend ratio); flows to the engine as
   *  `edges.default.bendRatio`. */
  edgeCurvature: number;
  nodeTypes: Record<string, NodeTypeStyle>;
  edgeTypes: Record<string, EdgeTypeStyle>;
  defaultNodeStyle: NodeTypeStyle;
  defaultEdgeStyle: EdgeTypeStyle;
}

export type NodeTypeStyleOverride = Partial<NodeTypeStyle>;
export type EdgeTypeStyleOverride = Partial<EdgeTypeStyle>;

export interface GraphThemeOverrides {
  canvasBg?: string;
  gridLineColor?: string;
  selectionBorder?: string;
  selectionFill?: string;
  hullFill?: string;
  hullStroke?: string;
  dimOpacity?: number;
  labelHalo?: string;
  dimText?: string;
  showTypeTag?: boolean;
  edgeCurvature?: number;
  /** When set, every node type's fill is recomputed as its border color at
   *  this alpha (types with non-#rrggbb border colors are skipped). */
  nodeFillTint?: number;
  nodeTypes?: Record<string, NodeTypeStyleOverride>;
  edgeTypes?: Record<string, EdgeTypeStyleOverride>;
  defaultNodeStyle?: NodeTypeStyleOverride;
  defaultEdgeStyle?: EdgeTypeStyleOverride;
}
