import type {
  EdgeTypeStyle,
  GraphTheme,
  GraphThemeOverrides,
  NodeTypeStyle,
} from "./types";
import { tintFill } from "./buildTheme";

const mergeCache = new WeakMap<GraphTheme, Map<string, GraphTheme>>();

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

  const overrideStr = JSON.stringify(overrides);
  let innerMap = mergeCache.get(base);
  if (!innerMap) {
    innerMap = new Map();
    mergeCache.set(base, innerMap);
  }
  if (innerMap.has(overrideStr)) {
    return innerMap.get(overrideStr)!;
  }
  if (innerMap.size >= 10) {
    innerMap.clear();
  }

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

  const merged: GraphTheme = {
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
    showTypeTag: overrides.showTypeTag ?? base.showTypeTag,
    edgeCurvature: overrides.edgeCurvature ?? base.edgeCurvature,
    defaultNodeStyle,
    defaultEdgeStyle,
    nodeTypes,
    edgeTypes,
  };

  // nodeFillTint recomputes every fill from the type's border color at the
  // requested alpha. tintFill only parses #rrggbb hex — skip anything else
  // (e.g. rgba() strings) so we never emit a garbage color.
  if (overrides.nodeFillTint !== undefined) {
    const tint = overrides.nodeFillTint;
    const retint = (style: NodeTypeStyle): NodeTypeStyle =>
      style.borderColor.startsWith("#")
        ? { ...style, color: tintFill(style.borderColor, tint) }
        : style;
    for (const key of Object.keys(merged.nodeTypes)) {
      merged.nodeTypes[key] = retint(merged.nodeTypes[key]);
    }
    merged.defaultNodeStyle = retint(merged.defaultNodeStyle);
  }

  innerMap.set(overrideStr, merged);
  return merged;
}
