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

// ⚡ Bolt: Module-level cache to prevent cascading React identity drops.
// If an app passes `themeOverrides={{...}}` inline, rebuilding the theme on every render
// causes deep WebGL theme conversions. This WeakMap protects against that.
// The inner Map is size-bounded to prevent memory leaks if the app animates overrides.
const MAX_CACHE_SIZE = 10;
const mergeCache = new WeakMap<GraphTheme, Map<string, GraphTheme>>();

export function mergeGraphTheme(
  base: GraphTheme,
  overrides?: GraphThemeOverrides | null,
): GraphTheme {
  if (!overrides) return base;

  const overridesKey = JSON.stringify(overrides);
  let baseCache = mergeCache.get(base);
  if (!baseCache) {
    baseCache = new Map();
    mergeCache.set(base, baseCache);
  }

  const cached = baseCache.get(overridesKey);
  if (cached) {
    return cached;
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

  // Simple LRU-ish bound: clear the cache if it gets too large.
  if (baseCache.size >= MAX_CACHE_SIZE) {
    baseCache.clear();
  }

  baseCache.set(overridesKey, merged);
  return merged;
}
