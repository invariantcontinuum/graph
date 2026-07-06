import type {
  EdgeTypeStyle,
  GraphTheme,
  GraphThemeOverrides,
  NodeTypeStyle,
} from "./types";

const mergeCache = new WeakMap<GraphTheme, Map<string, GraphTheme>>();

function defined<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as Partial<T>;
}

// ⚡ Bolt: Module-level cache to protect against React `useMemo` identity
// drops causing unnecessary deep theme conversion and garbage collection.
// The base theme goes in a WeakMap so it can be garbage collected,
// while the overrides are stringified to serve as a cache key.
const themeCache = new WeakMap<GraphTheme, Map<string, GraphTheme>>();

export function mergeGraphTheme(
  base: GraphTheme,
  overrides?: GraphThemeOverrides | null,
): GraphTheme {
  if (!overrides) return base;

  // ⚡ Bolt: Cache merged theme configurations to prevent cascading React identity drops
  // when `themeOverrides` are passed as inline object literals (e.g., `<GraphScene themeOverrides={{...}} />`).
  // This ensures we return a referentially stable object for identical overrides,
  // protecting downstream caches like WebGL JSON conversion.
  let baseCache = mergeCache.get(base);
  if (!baseCache) {
    baseCache = new Map<string, GraphTheme>();
    mergeCache.set(base, baseCache);
  }
  const cacheKey = JSON.stringify(overrides);
  const cached = baseCache.get(cacheKey);
  if (cached) return cached;

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

  const result: GraphTheme = {
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

  baseCache.set(cacheKey, result);
  return result;
}
