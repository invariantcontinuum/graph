"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  GraphScene,
  buildGraphTheme,
  type EdgeTypeStyleOverride,
  type GraphHandle,
  type GraphSnapshot,
  type GraphStats,
  type GraphThemeOverrides,
  type LayoutType,
  type NodeTypeStyleOverride,
  type Shape,
} from "@invariantcontinuum/graph/react";
import { sampleSnapshot } from "./data";

type ThemeMode = "dark" | "light";
type EdgeLineStyle = "solid" | "dashed" | "short-dashed" | "dotted";

interface LegendNodeDesign {
  label?: string;
  shape?: Shape;
  color?: string;
  borderColor?: string;
  labelColor?: string;
  halfWidth?: number;
  halfHeight?: number;
  borderWidth?: number;
  labelSize?: number;
}

interface LegendEdgeDesign {
  label?: string;
  color?: string;
  width?: number;
  style?: EdgeLineStyle;
}

interface LegendDesignConfig {
  nodes: Record<string, LegendNodeDesign>;
  edges: Record<string, LegendEdgeDesign>;
}

interface CanvasLegendEntry {
  typeKey: string;
  label: string;
  count: number;
  color: string;
  borderColor?: string;
}

interface CanvasLegend {
  nodes: CanvasLegendEntry[];
  edges: CanvasLegendEntry[];
}

const SHAPES: Shape[] = [
  "roundrectangle",
  "barrel",
  "diamond",
  "hexagon",
  "octagon",
  "triangle",
  "square",
  "circle",
];

const EDGE_STYLES: EdgeLineStyle[] = ["solid", "dashed", "short-dashed", "dotted"];

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function toSnapshot(value: unknown): GraphSnapshot {
  const root = asRecord(value);
  const nodesIn = Array.isArray(root.nodes) ? root.nodes : [];
  const edgesIn = Array.isArray(root.edges) ? root.edges : [];

  const nodes = nodesIn.map((item, index) => {
    const node = asRecord(item);
    const id = stringValue(node.id, `node-${index + 1}`);
    return {
      id,
      name: stringValue(node.name, id),
      type: stringValue(node.type, "service"),
      domain: stringValue(node.domain, "default"),
      status: stringValue(node.status, "healthy"),
      community: typeof node.community === "number" ? node.community : undefined,
      meta: asRecord(node.meta),
    };
  });

  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = edgesIn.flatMap((item, index) => {
    const edge = asRecord(item);
    const source = stringValue(edge.source, "");
    const target = stringValue(edge.target, "");
    if (!nodeIds.has(source) || !nodeIds.has(target)) return [];
    return [{
      id: stringValue(edge.id, `edge-${index + 1}`),
      source,
      target,
      type: stringValue(edge.type, "depends"),
      label: stringValue(edge.label, ""),
      weight: numberValue(edge.weight, 1),
    }];
  });

  return {
    nodes,
    edges,
    meta: {
      node_count: nodes.length,
      edge_count: edges.length,
      last_updated: new Date().toISOString(),
    },
  };
}

function typesFromSnapshot(snapshot: GraphSnapshot) {
  return {
    nodes: [...new Set(snapshot.nodes.map((node) => node.type))].sort(),
    edges: [...new Set(snapshot.edges.map((edge) => edge.type))].sort(),
  };
}

function buildLegendDesign(snapshot: GraphSnapshot, mode: ThemeMode): LegendDesignConfig {
  const base = buildGraphTheme(mode);
  const types = typesFromSnapshot(snapshot);
  const nodes: Record<string, LegendNodeDesign> = {};
  const edges: Record<string, LegendEdgeDesign> = {};

  for (const type of types.nodes) {
    const style = base.nodeTypes[type] ?? base.defaultNodeStyle;
    nodes[type] = {
      label: type.replace(/_/g, " "),
      shape: style.shape,
      color: style.color,
      borderColor: style.borderColor,
      labelColor: style.labelColor,
      halfWidth: style.halfWidth,
      halfHeight: style.halfHeight,
      borderWidth: style.borderWidth,
      labelSize: style.labelSize,
    };
  }

  for (const type of types.edges) {
    const style = base.edgeTypes[type] ?? base.defaultEdgeStyle;
    edges[type] = {
      label: type.replace(/_/g, " "),
      color: style.color,
      width: style.width,
      style: style.style,
    };
  }

  return { nodes, edges };
}

function mergeMissingTypes(
  config: LegendDesignConfig,
  snapshot: GraphSnapshot,
  mode: ThemeMode,
): LegendDesignConfig {
  const fallback = buildLegendDesign(snapshot, mode);
  return {
    nodes: { ...fallback.nodes, ...config.nodes },
    edges: { ...fallback.edges, ...config.edges },
  };
}

function toLegendDesign(value: unknown, snapshot: GraphSnapshot, mode: ThemeMode): LegendDesignConfig {
  const root = asRecord(value);
  const nodesIn = asRecord(root.nodes);
  const edgesIn = asRecord(root.edges);
  const next: LegendDesignConfig = { nodes: {}, edges: {} };

  for (const [type, raw] of Object.entries(nodesIn)) {
    const node = asRecord(raw);
    const shape = stringValue(node.shape, "roundrectangle");
    next.nodes[type] = {
      label: stringValue(node.label, type.replace(/_/g, " ")),
      shape: SHAPES.includes(shape as Shape) ? (shape as Shape) : "roundrectangle",
      color: stringValue(node.color, "#ffffff"),
      borderColor: stringValue(node.borderColor, "#6fb5a7"),
      labelColor: stringValue(node.labelColor, "#231f20"),
      halfWidth: clamp(numberValue(node.halfWidth, 55), 18, 140),
      halfHeight: clamp(numberValue(node.halfHeight, 19), 12, 90),
      borderWidth: clamp(numberValue(node.borderWidth, 2), 0, 8),
      labelSize: clamp(numberValue(node.labelSize, 11), 7, 22),
    };
  }

  for (const [type, raw] of Object.entries(edgesIn)) {
    const edge = asRecord(raw);
    const style = stringValue(edge.style, "solid");
    next.edges[type] = {
      label: stringValue(edge.label, type.replace(/_/g, " ")),
      color: stringValue(edge.color, "#6fb5a7"),
      width: clamp(numberValue(edge.width, 1.7), 0.4, 8),
      style: EDGE_STYLES.includes(style as EdgeLineStyle) ? (style as EdgeLineStyle) : "solid",
    };
  }

  return mergeMissingTypes(next, snapshot, mode);
}

function buildThemeOverrides(config: LegendDesignConfig): GraphThemeOverrides {
  const nodeTypes: Record<string, NodeTypeStyleOverride> = {};
  const edgeTypes: Record<string, EdgeTypeStyleOverride> = {};

  for (const [type, design] of Object.entries(config.nodes)) {
    nodeTypes[type] = {
      shape: design.shape,
      color: design.color,
      borderColor: design.borderColor,
      labelColor: design.labelColor,
      halfWidth: design.halfWidth,
      halfHeight: design.halfHeight,
      borderWidth: design.borderWidth,
      labelSize: design.labelSize,
    };
  }

  for (const [type, design] of Object.entries(config.edges)) {
    edgeTypes[type] = {
      color: design.color,
      width: design.width,
      style: design.style,
      arrow: "triangle",
    };
  }

  return { nodeTypes, edgeTypes };
}

function labelForType(type: string, label?: string): string {
  return label?.trim() || type.replace(/_/g, " ");
}

function countByType<T>(items: T[], getType: (item: T) => string): Record<string, number> {
  return items.reduce<Record<string, number>>((counts, item) => {
    const type = getType(item);
    counts[type] = (counts[type] ?? 0) + 1;
    return counts;
  }, {});
}

function buildCanvasLegend(snapshot: GraphSnapshot, config: LegendDesignConfig): CanvasLegend {
  const nodeCounts = countByType(snapshot.nodes, (node) => node.type);
  const edgeCounts = countByType(snapshot.edges, (edge) => edge.type);

  return {
    nodes: Object.entries(nodeCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([typeKey, count]) => {
        const design = config.nodes[typeKey];
        return {
          typeKey,
          count,
          label: labelForType(typeKey, design?.label),
          color: design?.color ?? "#ffffff",
          borderColor: design?.borderColor ?? "#6fb5a7",
        };
      }),
    edges: Object.entries(edgeCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([typeKey, count]) => {
        const design = config.edges[typeKey];
        return {
          typeKey,
          count,
          label: labelForType(typeKey, design?.label),
          color: design?.color ?? "#6fb5a7",
        };
      }),
  };
}

function emptySnapshot(): GraphSnapshot {
  return {
    nodes: [],
    edges: [],
    meta: {
      node_count: 0,
      edge_count: 0,
      last_updated: new Date().toISOString(),
    },
  };
}

export default function Showcase() {
  const [snapshot, setSnapshot] = useState<GraphSnapshot>(sampleSnapshot);
  const [graphJson, setGraphJson] = useState(() => formatJson(sampleSnapshot));
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");
  const [layout, setLayout] = useState<LayoutType>("force");
  const [showCommunities, setShowCommunities] = useState(false);
  const [stats, setStats] = useState<GraphStats | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [legendConfig, setLegendConfig] = useState<LegendDesignConfig>(() =>
    buildLegendDesign(sampleSnapshot, "dark"),
  );
  const [legendJson, setLegendJson] = useState(() =>
    formatJson(buildLegendDesign(sampleSnapshot, "dark")),
  );
  const [graphError, setGraphError] = useState<string | null>(null);
  const [legendError, setLegendError] = useState<string | null>(null);
  const graphRef = useRef<GraphHandle>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const selectedNodeData = useMemo(
    () => snapshot.nodes.find((node) => node.id === selectedNode) ?? null,
    [snapshot.nodes, selectedNode],
  );

  const themeOverrides = useMemo(() => buildThemeOverrides(legendConfig), [legendConfig]);
  const canvasLegend = useMemo(
    () => buildCanvasLegend(snapshot, legendConfig),
    [snapshot, legendConfig],
  );

  const renderGraphJson = () => {
    try {
      const parsed = JSON.parse(graphJson) as unknown;
      const nextSnapshot = toSnapshot(parsed);
      const nextLegend = mergeMissingTypes(legendConfig, nextSnapshot, themeMode);
      setSnapshot(nextSnapshot);
      setGraphJson(formatJson(nextSnapshot));
      setLegendConfig(nextLegend);
      setLegendJson(formatJson(nextLegend));
      setSelectedNode(null);
      setGraphError(null);
      if (nextSnapshot.nodes.length === 0 && nextSnapshot.edges.length === 0) {
        setStats({
          nodeCount: 0,
          edgeCount: 0,
          violationCount: 0,
          lastUpdated: nextSnapshot.meta.last_updated ?? new Date().toISOString(),
        });
      }
      graphRef.current?.focusFit(null);
    } catch (error) {
      setGraphError(error instanceof Error ? error.message : "Invalid graph JSON");
    }
  };

  const clearGraph = () => {
    const nextSnapshot = emptySnapshot();
    setSnapshot(nextSnapshot);
    setGraphJson(formatJson(nextSnapshot));
    setSelectedNode(null);
    setGraphError(null);
    setStats({
      nodeCount: 0,
      edgeCount: 0,
      violationCount: 0,
      lastUpdated: nextSnapshot.meta.last_updated ?? new Date().toISOString(),
    });
    graphRef.current?.focusFit(null);
  };

  const loadSample = () => {
    const nextLegend = buildLegendDesign(sampleSnapshot, themeMode);
    setSnapshot(sampleSnapshot);
    setGraphJson(formatJson(sampleSnapshot));
    setLegendConfig(nextLegend);
    setLegendJson(formatJson(nextLegend));
    setSelectedNode(null);
    setGraphError(null);
    setLegendError(null);
  };

  const applyLegendJson = () => {
    try {
      const parsed = JSON.parse(legendJson) as unknown;
      const nextLegend = toLegendDesign(parsed, snapshot, themeMode);
      setLegendConfig(nextLegend);
      setLegendJson(formatJson(nextLegend));
      setLegendError(null);
    } catch (error) {
      setLegendError(error instanceof Error ? error.message : "Invalid legend JSON");
    }
  };

  const resetLegend = () => {
    const nextLegend = buildLegendDesign(snapshot, themeMode);
    setLegendConfig(nextLegend);
    setLegendJson(formatJson(nextLegend));
    setLegendError(null);
  };

  const updateNodeDesign = (type: string, patch: Partial<LegendNodeDesign>) => {
    setLegendConfig((prev) => {
      const next = {
        ...prev,
        nodes: {
          ...prev.nodes,
          [type]: { ...prev.nodes[type], ...patch },
        },
      };
      setLegendJson(formatJson(next));
      return next;
    });
  };

  const updateEdgeDesign = (type: string, patch: Partial<LegendEdgeDesign>) => {
    setLegendConfig((prev) => {
      const next = {
        ...prev,
        edges: {
          ...prev.edges,
          [type]: { ...prev.edges[type], ...patch },
        },
      };
      setLegendJson(formatJson(next));
      return next;
    });
  };

  if (!isClient) return <div className="p-8">Loading graph showcase...</div>;

  return (
    <div className={`flex h-screen flex-col ${themeMode === "dark" ? "bg-slate-950 text-stone-100" : "bg-stone-50 text-slate-950"}`}>
      <header className="z-20 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-slate-950/90 p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-300/40 bg-cyan-500/15">
            <img src="/graph/globe.svg" alt="Graph logo" className="h-6 w-6 invert" />
          </div>
          <div>
            <h1 className="font-mono text-xl font-bold tracking-tight text-cyan-300">@invariantcontinuum/graph</h1>
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Capability Showcase</div>
          </div>
          <span className="rounded border border-cyan-300/30 bg-cyan-300/10 px-2 py-0.5 font-mono text-[10px] font-bold text-cyan-100">v0.2.2</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={layout}
            onChange={(event) => setLayout(event.target.value as LayoutType)}
            className="rounded border border-slate-600 bg-slate-900 px-2 py-1 text-sm text-stone-100"
          >
            <option value="force">Force Directed</option>
            <option value="grid">Grid Layout</option>
            <option value="hierarchical">Hierarchical</option>
          </select>

          <button
            onClick={() => setThemeMode((prev) => (prev === "dark" ? "light" : "dark"))}
            className="rounded bg-slate-800 px-3 py-1 text-sm transition hover:bg-slate-700"
          >
            {themeMode === "dark" ? "Light theme" : "Dark theme"}
          </button>

          <button
            onClick={() => setShowCommunities((prev) => !prev)}
            className={`rounded px-3 py-1 text-sm transition ${showCommunities ? "bg-emerald-600" : "bg-slate-800 hover:bg-slate-700"}`}
          >
            Communities
          </button>

          <button
            onClick={() => graphRef.current?.fit()}
            className="rounded bg-cyan-600 px-3 py-1 text-sm text-white transition hover:bg-cyan-500"
          >
            Center fit
          </button>
        </div>
      </header>

      <div className="relative flex flex-1 overflow-hidden">
        <main className="relative flex-1">
          <GraphScene
            ref={graphRef}
            snapshot={snapshot}
            themeMode={themeMode}
            themeOverrides={themeOverrides}
            layout={layout}
            showCommunities={showCommunities}
            onStatsChange={setStats}
            onNodeClick={(node) => {
              setSelectedNode(node.id);
              graphRef.current?.focusFit(node.id);
            }}
            onBackgroundClick={() => {
              setSelectedNode(null);
              graphRef.current?.selectNode(null);
            }}
            chrome={
              <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4">
                <div className="pointer-events-auto w-52 rounded-xl border border-white/10 bg-slate-950/70 p-3 font-mono text-xs shadow-xl backdrop-blur">
                  <h3 className="mb-2 border-b border-white/15 pb-1 font-bold">Graph Stats</h3>
                  <div className="flex justify-between"><span>Nodes</span><span>{stats?.nodeCount ?? 0}</span></div>
                  <div className="flex justify-between"><span>Edges</span><span>{stats?.edgeCount ?? 0}</span></div>
                  <div className="flex justify-between"><span>Violations</span><span className="text-red-300">{stats?.violationCount ?? 0}</span></div>
                </div>

                <div className="pointer-events-auto w-56 rounded-xl border border-white/10 bg-slate-950/70 p-3 font-mono text-xs shadow-xl backdrop-blur">
                  <h3 className="mb-2 border-b border-white/15 pb-1 font-bold">Legend</h3>
                  <div className="max-h-60 space-y-3 overflow-y-auto">
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Nodes</div>
                      {canvasLegend.nodes.map((entry) => (
                        <div key={entry.typeKey} className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full border" style={{ backgroundColor: entry.color, borderColor: entry.borderColor }} />
                          <span className="truncate">{entry.label}</span>
                          <span className="ml-auto text-slate-400">{entry.count}</span>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Edges</div>
                      {canvasLegend.edges.map((entry) => (
                        <div key={entry.typeKey} className="flex items-center gap-2">
                          <span className="h-0.5 w-5 rounded" style={{ backgroundColor: entry.color }} />
                          <span className="truncate">{entry.label}</span>
                          <span className="ml-auto text-slate-400">{entry.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            }
          />
        </main>

        <aside className="z-20 w-[26rem] overflow-y-auto border-l border-white/10 bg-slate-950/95 p-4 text-stone-100 shadow-2xl">
          <section className="space-y-3 rounded-xl border border-cyan-300/15 bg-cyan-300/5 p-3">
            <div>
              <h2 className="font-bold">Graph JSON</h2>
              <p className="text-xs text-slate-400">Paste a snapshot with `nodes` and `edges`, then render it into the package canvas.</p>
            </div>
            <textarea
              value={graphJson}
              onChange={(event) => setGraphJson(event.target.value)}
              spellCheck={false}
              className="h-52 w-full resize-y rounded-lg border border-slate-700 bg-slate-900 p-3 font-mono text-xs text-stone-100 outline-none focus:border-cyan-300"
            />
            {graphError ? <div className="rounded border border-red-400/40 bg-red-500/10 p-2 text-xs text-red-200">{graphError}</div> : null}
            <div className="grid grid-cols-3 gap-2">
              <button onClick={renderGraphJson} className="rounded bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-500">Render</button>
              <button onClick={clearGraph} className="rounded bg-slate-800 px-3 py-2 text-sm font-semibold hover:bg-slate-700">Clear graph</button>
              <button onClick={loadSample} className="rounded bg-slate-800 px-3 py-2 text-sm font-semibold hover:bg-slate-700">Load sample</button>
            </div>
          </section>

          <section className="mt-4 space-y-3 rounded-xl border border-amber-300/15 bg-amber-300/5 p-3">
            <div>
              <h2 className="font-bold">Legend JSON</h2>
              <p className="text-xs text-slate-400">Define node and edge type styles. Keys should match the `type` values in graph JSON.</p>
            </div>
            <textarea
              value={legendJson}
              onChange={(event) => setLegendJson(event.target.value)}
              spellCheck={false}
              className="h-52 w-full resize-y rounded-lg border border-slate-700 bg-slate-900 p-3 font-mono text-xs text-stone-100 outline-none focus:border-amber-300"
            />
            {legendError ? <div className="rounded border border-red-400/40 bg-red-500/10 p-2 text-xs text-red-200">{legendError}</div> : null}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={applyLegendJson} className="rounded bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400">Apply legend</button>
              <button onClick={resetLegend} className="rounded bg-slate-800 px-3 py-2 text-sm font-semibold hover:bg-slate-700">Reset legend</button>
            </div>
          </section>

          <section className="mt-4 space-y-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div>
              <h2 className="font-bold">Type Design Controls</h2>
              <p className="text-xs text-slate-400">Interactive controls update the same legend JSON and package theme overrides.</p>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">Nodes</h3>
              {Object.entries(legendConfig.nodes).map(([type, design]) => (
                <details key={type} className="rounded-lg border border-slate-800 bg-slate-900/70 p-3" open={Object.keys(legendConfig.nodes).length <= 3}>
                  <summary className="cursor-pointer font-mono text-sm">{labelForType(type, design.label)}</summary>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                    <label className="space-y-1">
                      <span className="text-slate-400">Fill</span>
                      <input type="color" value={design.color?.startsWith("#") ? design.color.slice(0, 7) : "#ffffff"} onChange={(event) => updateNodeDesign(type, { color: event.target.value })} className="h-8 w-full rounded border border-slate-700 bg-slate-900" />
                    </label>
                    <label className="space-y-1">
                      <span className="text-slate-400">Border</span>
                      <input type="color" value={design.borderColor?.startsWith("#") ? design.borderColor.slice(0, 7) : "#6fb5a7"} onChange={(event) => updateNodeDesign(type, { borderColor: event.target.value })} className="h-8 w-full rounded border border-slate-700 bg-slate-900" />
                    </label>
                    <label className="col-span-2 space-y-1">
                      <span className="text-slate-400">Shape</span>
                      <select value={design.shape ?? "roundrectangle"} onChange={(event) => updateNodeDesign(type, { shape: event.target.value as Shape })} className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-2">
                        {SHAPES.map((shape) => <option key={shape} value={shape}>{shape}</option>)}
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-slate-400">Width {design.halfWidth ? design.halfWidth * 2 : 110}</span>
                      <input type="range" min="18" max="140" value={design.halfWidth ?? 55} onChange={(event) => updateNodeDesign(type, { halfWidth: Number(event.target.value) })} className="w-full" />
                    </label>
                    <label className="space-y-1">
                      <span className="text-slate-400">Height {design.halfHeight ? design.halfHeight * 2 : 38}</span>
                      <input type="range" min="12" max="90" value={design.halfHeight ?? 19} onChange={(event) => updateNodeDesign(type, { halfHeight: Number(event.target.value) })} className="w-full" />
                    </label>
                    <label className="space-y-1">
                      <span className="text-slate-400">Border {design.borderWidth ?? 2}</span>
                      <input type="range" min="0" max="8" step="0.25" value={design.borderWidth ?? 2} onChange={(event) => updateNodeDesign(type, { borderWidth: Number(event.target.value) })} className="w-full" />
                    </label>
                    <label className="space-y-1">
                      <span className="text-slate-400">Label {design.labelSize ?? 11}</span>
                      <input type="range" min="7" max="22" value={design.labelSize ?? 11} onChange={(event) => updateNodeDesign(type, { labelSize: Number(event.target.value) })} className="w-full" />
                    </label>
                  </div>
                </details>
              ))}
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">Edges</h3>
              {Object.entries(legendConfig.edges).map(([type, design]) => (
                <details key={type} className="rounded-lg border border-slate-800 bg-slate-900/70 p-3" open={Object.keys(legendConfig.edges).length <= 3}>
                  <summary className="cursor-pointer font-mono text-sm">{labelForType(type, design.label)}</summary>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                    <label className="space-y-1">
                      <span className="text-slate-400">Color</span>
                      <input type="color" value={design.color?.startsWith("#") ? design.color.slice(0, 7) : "#6fb5a7"} onChange={(event) => updateEdgeDesign(type, { color: event.target.value })} className="h-8 w-full rounded border border-slate-700 bg-slate-900" />
                    </label>
                    <label className="space-y-1">
                      <span className="text-slate-400">Style</span>
                      <select value={design.style ?? "solid"} onChange={(event) => updateEdgeDesign(type, { style: event.target.value as EdgeLineStyle })} className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-2">
                        {EDGE_STYLES.map((style) => <option key={style} value={style}>{style}</option>)}
                      </select>
                    </label>
                    <label className="col-span-2 space-y-1">
                      <span className="text-slate-400">Width {design.width ?? 1.7}</span>
                      <input type="range" min="0.4" max="8" step="0.1" value={design.width ?? 1.7} onChange={(event) => updateEdgeDesign(type, { width: Number(event.target.value) })} className="w-full" />
                    </label>
                  </div>
                </details>
              ))}
            </div>
          </section>

          <section className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <h2 className="mb-3 text-lg font-bold">Inspector</h2>
            {selectedNodeData ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="mb-1 text-xs font-bold uppercase text-slate-500">Node ID</div>
                  <div className="font-mono text-sm">{selectedNodeData.id}</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="mb-1 text-xs font-bold uppercase text-slate-500">Name</div>
                  <div>{selectedNodeData.name}</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="mb-1 text-xs font-bold uppercase text-slate-500">Type</div>
                  <div>{selectedNodeData.type}</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="mb-1 text-xs font-bold uppercase text-slate-500">Domain</div>
                  <div>{selectedNodeData.domain}</div>
                </div>
                <button
                  onClick={() => {
                    setSelectedNode(null);
                    graphRef.current?.focusFit(null);
                  }}
                  className="w-full rounded bg-slate-800 py-2 text-sm hover:bg-slate-700"
                >
                  Clear selection
                </button>
              </div>
            ) : (
              <div className="text-sm italic text-slate-500">Click a node to inspect its properties.</div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
