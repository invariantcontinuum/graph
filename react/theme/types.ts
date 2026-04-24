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
}

export interface EdgeTypeStyle {
  color: string;
  width: number;
  style: "solid" | "dashed" | "short-dashed" | "dotted";
  arrow: "triangle" | "none";
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
  nodeTypes?: Record<string, NodeTypeStyleOverride>;
  edgeTypes?: Record<string, EdgeTypeStyleOverride>;
  defaultNodeStyle?: NodeTypeStyleOverride;
  defaultEdgeStyle?: EdgeTypeStyleOverride;
}
