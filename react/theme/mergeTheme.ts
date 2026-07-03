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

// ⚡ Bolt: Cache merged theme objects to prevent cascading identity drops
// in React's render cycle caused by inline object literal themeOverrides props.
// The WeakMap is keyed by the base theme, and the inner Map by the serialized
// string of the overrides, ensuring referential stability for downstream
// WebGL memoization hooks.
const mergeCache = new WeakMap<GraphTheme, Map<string, GraphTheme>>();

export function mergeGraphTheme(
  base: GraphTheme,
  overrides?: GraphThemeOverrides | null,
): GraphTheme {
  if (!overrides) return base;

  const cacheKey = JSON.stringify(overrides);
  let innerCache = mergeCache.get(base);
  if (!innerCache) {
    innerCache = new Map();
    mergeCache.set(base, innerCache);
  } else {
    const cached = innerCache.get(cacheKey);
    if (cached) return cached;
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
    defaultNodeStyle,
    defaultEdgeStyle,
    nodeTypes,
    edgeTypes,
  };

  // Size bound the inner map to prevent memory leaks from dynamic overrides
  if (innerCache.size >= 10) {
    innerCache.clear();
  }
  innerCache.set(cacheKey, merged);
  return merged;
}
