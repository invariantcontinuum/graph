"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type GraphHandle,
  type GraphSnapshot,
  type GraphStats,
  type GraphThemeOverrides,
  type LayoutType,
  type LegendSummary,
  type NodeData,
  type ThemeMode,
} from "@invariantcontinuum/graph/react";
import { PRESETS, presetBySlug, type Preset } from "./presets";
import { GraphDeck } from "./components/GraphDeck";
import { GraphStage } from "./components/GraphStage";
import { InspectorRail } from "./components/InspectorRail";
import { NodeDetailsModal } from "./components/NodeDetailsModal";
import { ScenarioRail } from "./components/ScenarioRail";
import { Topbar } from "./components/Topbar";

const PACKAGE_VERSION = "0.2.13";

function withMeta(snapshot: GraphSnapshot): GraphSnapshot {
  return {
    ...snapshot,
    meta: {
      ...snapshot.meta,
      node_count: snapshot.nodes.length,
      edge_count: snapshot.edges.length,
      last_updated: new Date().toISOString(),
    },
  };
}

function countBy(values: string[]): Array<{ key: string; count: number }> {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return Array.from(counts, ([key, count]) => ({ key, count })).sort((a, b) =>
    a.key.localeCompare(b.key),
  );
}

function nextId(prefix: string, existing: Set<string>): string {
  let index = existing.size + 1;
  let candidate = `${prefix}-${index}`;
  while (existing.has(candidate)) {
    index += 1;
    candidate = `${prefix}-${index}`;
  }
  return candidate;
}

const MODE_PALETTES = {
  dark: {
    canvasBg: "#071014",
    gridLineColor: "#13252c",
    labelHalo: "#071014",
    labelColor: "#eef8f3",
    nodeFill: "#101b20",
    nodeBorder: "#526a70",
    edgeDefault: "#6f8990",
    selectionBorder: "#c5d86d",
    selectionFill: "rgba(197, 216, 109, 0.18)",
    hullFill: "rgba(197, 216, 109, 0.055)",
    hullStroke: "rgba(197, 216, 109, 0.24)",
    dimOpacity: 0.13,
    typeFills: ["#102027", "#131f2d", "#1f2116", "#241a25", "#10251e"],
    edgeColors: [
      "#c5d86d",
      "#58a4b0",
      "#f3a712",
      "#d45b35",
      "#8fb339",
      "#d99c70",
      "#6ba6ff",
      "#e7c66b",
    ],
  },
  light: {
    canvasBg: "#f7f1e6",
    gridLineColor: "#ded4c1",
    labelHalo: "#f7f1e6",
    labelColor: "#1e1b16",
    nodeFill: "#fffaf0",
    nodeBorder: "#b5a889",
    edgeDefault: "#766d5c",
    selectionBorder: "#315f5d",
    selectionFill: "rgba(49, 95, 93, 0.14)",
    hullFill: "rgba(49, 95, 93, 0.045)",
    hullStroke: "rgba(49, 95, 93, 0.2)",
    dimOpacity: 0.2,
    typeFills: ["#fffdf6", "#f4fbf8", "#f9f6ff", "#fff4e8", "#f3faed"],
    edgeColors: [
      "#315f5d",
      "#456990",
      "#8d671b",
      "#a64625",
      "#657c2d",
      "#8f6041",
      "#376f93",
      "#9a7828",
    ],
  },
} satisfies Record<
  ThemeMode,
  {
    canvasBg: string;
    gridLineColor: string;
    labelHalo: string;
    labelColor: string;
    nodeFill: string;
    nodeBorder: string;
    edgeDefault: string;
    selectionBorder: string;
    selectionFill: string;
    hullFill: string;
    hullStroke: string;
    dimOpacity: number;
    typeFills: string[];
    edgeColors: string[];
  }
>;

function modeAwareOverrides(
  overrides: GraphThemeOverrides,
  mode: ThemeMode,
): GraphThemeOverrides {
  const palette = MODE_PALETTES[mode];
  const nodeTypes = Object.fromEntries(
    Object.entries(overrides.nodeTypes ?? {}).map(([type, style], index) => [
      type,
      {
        ...style,
        color: palette.typeFills[index % palette.typeFills.length],
        labelColor: palette.labelColor,
        borderColor: style.borderColor ?? palette.nodeBorder,
      },
    ]),
  );
  const edgeTypes = Object.fromEntries(
    Object.entries(overrides.edgeTypes ?? {}).map(([type, style], index) => [
      type,
      {
        ...style,
        color: palette.edgeColors[index % palette.edgeColors.length],
        width: Math.max(style.width ?? 1.35, mode === "dark" ? 1.5 : 1.35),
      },
    ]),
  );

  return {
    ...overrides,
    canvasBg: palette.canvasBg,
    gridLineColor: palette.gridLineColor,
    labelHalo: palette.labelHalo,
    selectionBorder: palette.selectionBorder,
    selectionFill: palette.selectionFill,
    hullFill: palette.hullFill,
    hullStroke: palette.hullStroke,
    dimOpacity: palette.dimOpacity,
    defaultNodeStyle: {
      ...overrides.defaultNodeStyle,
      color: palette.nodeFill,
      borderColor: overrides.defaultNodeStyle?.borderColor ?? palette.nodeBorder,
      labelColor: palette.labelColor,
    },
    defaultEdgeStyle: {
      ...overrides.defaultEdgeStyle,
      color: palette.edgeDefault,
      width: Math.max(
        overrides.defaultEdgeStyle?.width ?? 1.3,
        mode === "dark" ? 1.45 : 1.25,
      ),
    },
    nodeTypes,
    edgeTypes,
  };
}

export default function Showcase() {
  const graphRef = useRef<GraphHandle>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeSlug, setActiveSlug] = useState(PRESETS[0].slug);
  const [layout, setLayout] = useState<LayoutType>("force");
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");
  const [snapshot, setSnapshot] = useState<GraphSnapshot>(PRESETS[0].snapshot);
  const [legend, setLegend] = useState<LegendSummary | null>(null);
  const [stats, setStats] = useState<GraphStats | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const preset: Preset = useMemo(() => presetBySlug(activeSlug), [activeSlug]);
  const graphThemeOverrides = useMemo(
    () => modeAwareOverrides(preset.overrides, themeMode),
    [preset.overrides, themeMode],
  );

  const refit = useCallback((padding = 56) => {
    requestAnimationFrame(() => graphRef.current?.focusFit(null, padding));
  }, []);

  useEffect(() => {
    let resizeTimer: number | undefined;
    const handleResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => refit(), 90);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", handleResize);
    };
  }, [refit]);

  const applyPreset = useCallback(
    (slug: string) => {
      const nextPreset = presetBySlug(slug);
      setActiveSlug(slug);
      setSnapshot(nextPreset.snapshot);
      setSelectedId(null);
      setDetailsOpen(false);
      setDrawerOpen(false);
      setIsLoading(true);
      refit();
    },
    [refit],
  );

  const commitSnapshot = useCallback(
    (next: GraphSnapshot, nextSelectedId: string | null = selectedId) => {
      const normalized = withMeta(next);
      setSnapshot(normalized);
      setSelectedId(nextSelectedId);
      setDetailsOpen(nextSelectedId !== null);
      refit();
    },
    [refit, selectedId],
  );

  const selectedNode = useMemo(
    () =>
      selectedId
        ? (snapshot.nodes.find((node) => node.id === selectedId) ?? null)
        : null,
    [selectedId, snapshot.nodes],
  );

  const selectedEdges = useMemo(() => {
    if (!selectedId) return [];
    return snapshot.edges.filter(
      (edge) => edge.source === selectedId || edge.target === selectedId,
    );
  }, [selectedId, snapshot.edges]);

  const selectedMetaEntries = useMemo(
    () => (selectedNode ? Object.entries(selectedNode.meta ?? {}) : []),
    [selectedNode],
  );

  const focusIds = useMemo(() => {
    if (!selectedId) return null;
    const ids = new Set<string>([selectedId]);
    for (const edge of selectedEdges) {
      ids.add(edge.source);
      ids.add(edge.target);
    }
    return ids;
  }, [selectedEdges, selectedId]);

  const nodeTypes = useMemo(
    () => countBy(snapshot.nodes.map((node) => node.type)),
    [snapshot.nodes],
  );
  const edgeTypes = useMemo(
    () => countBy(snapshot.edges.map((edge) => edge.type)),
    [snapshot.edges],
  );

  const graphDensity = useMemo(() => {
    if (snapshot.nodes.length < 2) return 0;
    return (
      Math.round((snapshot.edges.length / snapshot.nodes.length) * 100) / 100
    );
  }, [snapshot.edges.length, snapshot.nodes.length]);

  const addNode = useCallback(() => {
    const existing = new Set(snapshot.nodes.map((node) => node.id));
    const id = nextId("node", existing);
    const node: NodeData = {
      id,
      name: `Probe ${snapshot.nodes.length + 1}`,
      type: snapshot.nodes[0]?.type ?? "entity",
      domain: "showcase",
      status: "draft",
      meta: { origin: "showcase", package: PACKAGE_VERSION },
    };
    commitSnapshot({ ...snapshot, nodes: [...snapshot.nodes, node] }, id);
  }, [commitSnapshot, snapshot]);

  const removeSelected = useCallback(() => {
    if (!selectedId || !selectedNode) return;
    if (
      !window.confirm(
        `Remove "${selectedNode.name}" and its connected edges? This cannot be undone.`,
      )
    ) {
      return;
    }

    commitSnapshot(
      {
        ...snapshot,
        nodes: snapshot.nodes.filter((node) => node.id !== selectedId),
        edges: snapshot.edges.filter(
          (edge) => edge.source !== selectedId && edge.target !== selectedId,
        ),
      },
      null,
    );
    setDetailsOpen(false);
  }, [commitSnapshot, selectedId, selectedNode, snapshot]);

  const clearSelection = useCallback(() => {
    setSelectedId(null);
    setDetailsOpen(false);
  }, []);

  const frameSelected = useCallback(() => {
    graphRef.current?.focusFit(selectedId, 72);
  }, [selectedId]);

  const openNodeDetails = useCallback((node: NodeData | null) => {
    if (!node) return;
    setSelectedId(node.id);
    setDetailsOpen(true);
  }, []);

  const handlePositionsReady = useCallback(() => {
    refit(56);
  }, [refit]);

  const handleGraphReady = useCallback(() => {
    setIsLoading(false);
  }, []);

  const zoomIn = useCallback(() => graphRef.current?.zoomIn(), []);
  const zoomOut = useCallback(() => graphRef.current?.zoomOut(), []);
  const fitGraph = useCallback(() => graphRef.current?.fit(56), []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      if (event.key === "Escape") {
        if (drawerOpen) {
          setDrawerOpen(false);
        } else if (detailsOpen) {
          setDetailsOpen(false);
        } else {
          clearSelection();
        }
      } else if (
        event.key.toLowerCase() === "f" &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        fitGraph();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drawerOpen, detailsOpen, clearSelection, fitGraph]);

  return (
    <main className="atlas-shell">
      <a className="skip-link" href="#graph-stage">
        Skip to graph
      </a>

      <Topbar
        packageVersion={PACKAGE_VERSION}
        drawerOpen={drawerOpen}
        onToggleDrawer={() => setDrawerOpen((open) => !open)}
      />

      <ScenarioRail
        presets={PRESETS}
        activeSlug={activeSlug}
        drawerOpen={drawerOpen}
        packageVersion={PACKAGE_VERSION}
        onSelect={applyPreset}
        onCloseDrawer={() => setDrawerOpen(false)}
      />

      <GraphDeck
        preset={preset}
        layout={layout}
        themeMode={themeMode}
        snapshot={snapshot}
        stats={stats}
        nodeTypeCount={nodeTypes.length}
        graphDensity={graphDensity}
        onLayoutChange={setLayout}
        onThemeModeChange={setThemeMode}
      >
        <GraphStage
          ref={graphRef}
          snapshot={snapshot}
          themeMode={themeMode}
          layout={layout}
          themeOverrides={graphThemeOverrides}
          focusIds={focusIds}
          presetTitle={preset.title}
          isLoading={isLoading}
          onNodeClick={openNodeDetails}
          onBackgroundClick={clearSelection}
          onLegendChange={setLegend}
          onStatsChange={setStats}
          onPositionsReady={handlePositionsReady}
          onReady={handleGraphReady}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onFit={fitGraph}
        />
      </GraphDeck>

      <InspectorRail
        selectedNode={selectedNode}
        selectedEdges={selectedEdges}
        selectedEdgeCount={selectedEdges.length}
        snapshot={snapshot}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        legend={legend}
        graphRef={graphRef}
        onClearSelection={clearSelection}
        onSelectNeighbor={(id) => {
          setSelectedId(id);
          graphRef.current?.panToNode(id);
        }}
        onFrameSelected={frameSelected}
        onRemoveSelected={removeSelected}
        onFitAll={fitGraph}
        onAddProbe={addNode}
      />

      {detailsOpen && selectedNode ? (
        <NodeDetailsModal
          node={selectedNode}
          edges={selectedEdges}
          snapshot={snapshot}
          metaEntries={selectedMetaEntries}
          graphRef={graphRef}
          onClose={() => setDetailsOpen(false)}
          onSelectNeighbor={(id) => {
            setSelectedId(id);
            graphRef.current?.panToNode(id);
          }}
          onFrameSelected={frameSelected}
        />
      ) : null}
    </main>
  );
}
