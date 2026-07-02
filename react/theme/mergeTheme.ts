import type {
  EdgeTypeStyle,
  GraphTheme,
  GraphThemeOverrides,
  NodeTypeStyle,
} from "./types";

function defined<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as Partial<T>;
}

export function mergeGraphTheme(
  base: GraphTheme,
  overrides?: GraphThemeOverrides | null,
): GraphTheme {
  if (!overrides) return base;

  const defaultNodeStyle: NodeTypeStyle = {
    ...base.defaultNodeStyle,
    ...defined(overrides.defaultNodeStyle ?? {}),
  };
  const defaultEdgeStyle: EdgeTypeStyle = {
    ...base.defaultEdgeStyle,
    ...defined(overrides.defaultEdgeStyle ?? {}),
  };

  const nodeTypes: Record<string, NodeTypeStyle> = { ...base.nodeTypes };
  for (const [typeKey, override] of Object.entries(overrides.nodeTypes ?? {})) {
    nodeTypes[typeKey] = {
      ...(base.nodeTypes[typeKey] ?? defaultNodeStyle),
      ...defined(override),
    };
  }

  const edgeTypes: Record<string, EdgeTypeStyle> = { ...base.edgeTypes };
  for (const [typeKey, override] of Object.entries(overrides.edgeTypes ?? {})) {
    edgeTypes[typeKey] = {
      ...(base.edgeTypes[typeKey] ?? defaultEdgeStyle),
      ...defined(override),
    };
  }

  return {
    ...base,
    canvasBg: overrides.canvasBg ?? base.canvasBg,
    gridLineColor: overrides.gridLineColor ?? base.gridLineColor,
    selectionBorder: overrides.selectionBorder ?? base.selectionBorder,
    selectionFill: overrides.selectionFill ?? base.selectionFill,
    hullFill: overrides.hullFill ?? base.hullFill,
    hullStroke: overrides.hullStroke ?? base.hullStroke,
    dimOpacity: overrides.dimOpacity ?? base.dimOpacity,
    labelHalo: overrides.labelHalo ?? base.labelHalo,
    dimText: overrides.dimText ?? base.dimText,
    defaultNodeStyle,
    defaultEdgeStyle,
    nodeTypes,
    edgeTypes,
  };
}
