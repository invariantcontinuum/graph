"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  GraphScene,
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

const PACKAGE_VERSION = "0.2.10";

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
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

function compactLabel(value: string): string {
  return value.replaceAll("_", " ");
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
    edgeColors: ["#c5d86d", "#58a4b0", "#f3a712", "#d45b35", "#8fb339", "#d99c70", "#6ba6ff", "#e7c66b"],
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
    edgeColors: ["#315f5d", "#456990", "#8d671b", "#a64625", "#657c2d", "#8f6041", "#376f93", "#9a7828"],
  },
} satisfies Record<ThemeMode, {
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
}>;

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
      width: Math.max(overrides.defaultEdgeStyle?.width ?? 1.3, mode === "dark" ? 1.45 : 1.25),
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
    () => (selectedId ? snapshot.nodes.find((node) => node.id === selectedId) ?? null : null),
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
    return Math.round((snapshot.edges.length / snapshot.nodes.length) * 100) / 100;
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

  const openNodeDetails = useCallback((node: NodeData) => {
    setSelectedId(node.id);
    setDetailsOpen(true);
  }, []);

  const handlePositionsReady = useCallback(() => {
    refit(56);
  }, [refit]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (drawerOpen) {
          setDrawerOpen(false);
        } else if (detailsOpen) {
          setDetailsOpen(false);
        } else if (selectedId) {
          setSelectedId(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drawerOpen, detailsOpen, selectedId]);

  return (
    <main className="atlas-shell">
      <a className="skip-link" href="#graph-stage">
        Skip to graph
      </a>

      <header className="atlas-topbar">
        <button
          type="button"
          className="drawer-toggle"
          aria-label={drawerOpen ? "Close scenario rail" : "Open scenario rail"}
          title={drawerOpen ? "Close scenario rail" : "Open scenario rail"}
          aria-expanded={drawerOpen}
          aria-controls="scenario-rail"
          onClick={() => setDrawerOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>
        <div className="brand-lockup">
          <span className="brand-sigil">ic</span>
          <div>
            <p>Invariant Continuum</p>
            <strong>Graph Atlas</strong>
          </div>
        </div>
        <nav className="top-links" aria-label="Project links">
          <a href="https://github.com/invariantcontinuum/graph" target="_blank" rel="noreferrer">
            GitHub
          </a>
          <span>v{PACKAGE_VERSION}</span>
        </nav>
      </header>

      {drawerOpen ? (
        <button
          type="button"
          className="drawer-backdrop"
          aria-label="Close scenario rail"
          onClick={() => setDrawerOpen(false)}
        />
      ) : null}

      <aside
        id="scenario-rail"
        className="scenario-rail"
        data-open={drawerOpen}
        aria-label="Scenario catalog"
      >
        <div className="rail-heading">
          <p>Scenario catalog</p>
          <strong>{PRESETS.length} maps</strong>
        </div>
        <nav className="scenario-list" aria-label="Graph scenarios">
          {PRESETS.map((item) => (
            <button
              key={item.slug}
              type="button"
              className="scenario-card"
              data-active={item.slug === activeSlug}
              aria-current={item.slug === activeSlug ? "true" : undefined}
              onClick={() => applyPreset(item.slug)}
            >
              <span>{item.folio}</span>
              <strong title={item.title}>{item.title}</strong>
              <small title={item.subtitle}>{item.subtitle}</small>
              <b>
                {item.snapshot.nodes.length}n / {item.snapshot.edges.length}e
              </b>
            </button>
          ))}
        </nav>

        <section className="rail-panel" aria-label="Package release">
          <p className="panel-label">Released package</p>
          <strong>@invariantcontinuum/graph</strong>
          <span>0.2.10 pinned in this site</span>
        </section>
      </aside>

      <section className="graph-deck" aria-label="Interactive graph showcase">
        <div className="deck-head">
          <div>
            <p className="scenario-eyebrow">{preset.subtitle}</p>
            <h1>{preset.title}</h1>
            <p>{preset.essay}</p>
          </div>
          <div className="mode-cluster" aria-label="Graph controls">
            <div className="segmented" aria-label="Layout">
              {(["force", "hierarchical", "grid"] as LayoutType[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  data-active={layout === item}
                  aria-pressed={layout === item}
                  onClick={() => setLayout(item)}
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="segmented compact" aria-label="Theme mode">
              {(["dark", "light"] as ThemeMode[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  data-active={themeMode === item}
                  aria-pressed={themeMode === item}
                  onClick={() => setThemeMode(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="metrics-strip" aria-label="Graph metrics">
          <span>
            <b>{stats?.nodeCount ?? snapshot.nodes.length}</b>
            nodes
          </span>
          <span>
            <b>{stats?.edgeCount ?? snapshot.edges.length}</b>
            edges
          </span>
          <span>
            <b>{nodeTypes.length}</b>
            node types
          </span>
          <span>
            <b>{graphDensity}</b>
            density
          </span>
        </div>

        <div id="graph-stage" className="graph-stage">
          <GraphScene
            ref={graphRef}
            snapshot={snapshot}
            themeMode={themeMode}
            layout={layout}
            themeOverrides={graphThemeOverrides}
            focusIds={focusIds}
            showCommunities
            onNodeClick={openNodeDetails}
            onBackgroundClick={clearSelection}
            onLegendChange={setLegend}
            onStatsChange={setStats}
            onPositionsReady={handlePositionsReady}
            aria-label={`${preset.title} graph`}
          />
        </div>
      </section>

      <aside className="insight-rail" aria-label="Graph inspector">
        <section className="inspector-panel selected-panel">
          <div className="panel-topline">
            <p>Selection</p>
            <strong>{selectedNode ? selectedNode.id : "none"}</strong>
          </div>
          {selectedNode ? (
            <>
              <h2>{selectedNode.name}</h2>
              <dl className="node-facts">
                <div>
                  <dt>Type</dt>
                  <dd>{selectedNode.type}</dd>
                </div>
                <div>
                  <dt>Domain</dt>
                  <dd>{selectedNode.domain}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{selectedNode.status}</dd>
                </div>
                <div>
                  <dt>Edges</dt>
                  <dd>{selectedEdges.length}</dd>
                </div>
              </dl>
              <div className="action-grid">
                <button type="button" onClick={frameSelected}>
                  Frame
                </button>
                <button type="button" onClick={() => graphRef.current?.panToNode(selectedNode.id)}>
                  Center
                </button>
                <button
                  type="button"
                  title="Keyboard shortcut: Escape"
                  aria-keyshortcuts="Escape"
                  onClick={clearSelection}
                >
                  Clear
                </button>
                <button type="button" className="danger-action" onClick={removeSelected}>
                  Remove
                </button>
              </div>
            </>
          ) : (
            <p className="empty-copy">No active node. Click a node to view its details.</p>
          )}
        </section>

        <section className="inspector-panel">
          <div className="panel-topline">
            <p>Connections</p>
            <strong>{selectedEdges.length}</strong>
          </div>
          {selectedEdges.length > 0 ? (
            <ul className="connection-list" aria-label="Selected node connections">
              {selectedEdges.map((edge) => {
                const neighborId = edge.source === selectedNode?.id ? edge.target : edge.source;
                const neighbor =
                  snapshot.nodes.find((node) => node.id === neighborId)?.name ?? neighborId;
                return (
                  <li key={edge.id}>
                    <span title={edge.type}>{compactLabel(edge.type)}</span>
                    <button
                      type="button"
                      title={neighbor}
                      aria-label={`Select neighbor ${neighbor}`}
                      onClick={() => {
                        setSelectedId(neighborId);
                        graphRef.current?.panToNode(neighborId);
                      }}
                    >
                      {neighbor}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="empty-copy">This node has no connected edges.</p>
          )}
        </section>

        <section className="inspector-panel">
          <div className="panel-topline">
            <p>Composition</p>
            <strong>{legend?.edge_types.length ?? edgeTypes.length} edge types</strong>
          </div>
          <div className="type-cloud" aria-label="Node type counts">
            {nodeTypes.map((item) => (
              <span key={item.key}>
                {compactLabel(item.key)}
                <b>{item.count}</b>
              </span>
            ))}
          </div>
          <div className="type-cloud muted-cloud" aria-label="Edge type counts">
            {edgeTypes.slice(0, 8).map((item) => (
              <span key={item.key}>
                {compactLabel(item.key)}
                <b>{item.count}</b>
              </span>
            ))}
          </div>
        </section>

        <section className="inspector-panel controls-panel">
          <button
            type="button"
            title="Keyboard shortcut: Plus"
            aria-label="Zoom in"
            aria-keyshortcuts="Plus"
            onClick={() => graphRef.current?.zoomIn()}
          >
            Zoom in
          </button>
          <button
            type="button"
            title="Keyboard shortcut: Minus"
            aria-label="Zoom out"
            aria-keyshortcuts="Minus"
            onClick={() => graphRef.current?.zoomOut()}
          >
            Zoom out
          </button>
          <button type="button" title="Fit the entire graph into view" onClick={() => graphRef.current?.fit(56)}>
            Fit all
          </button>
          <button type="button" title="Add a new test node to the graph" onClick={addNode}>
            Add probe
          </button>
        </section>
      </aside>

      {detailsOpen && selectedNode ? (
        <div className="details-backdrop" role="presentation" onMouseDown={() => setDetailsOpen(false)}>
          <section
            className="node-details-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="node-details-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="details-header">
              <div>
                <p>Node record</p>
                <h2 id="node-details-title">{selectedNode.name}</h2>
                <span>{selectedNode.id}</span>
              </div>
              <button
                type="button"
                className="modal-close"
                aria-label="Close node details"
                title="Keyboard shortcut: Escape"
                aria-keyshortcuts="Escape"
                onClick={() => setDetailsOpen(false)}
              >
                Close
              </button>
            </header>

            <dl className="details-grid">
              <div>
                <dt>Type</dt>
                <dd>{selectedNode.type}</dd>
              </div>
              <div>
                <dt>Domain</dt>
                <dd>{selectedNode.domain}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{selectedNode.status}</dd>
              </div>
              <div>
                <dt>Community</dt>
                <dd>{selectedNode.community ?? "none"}</dd>
              </div>
            </dl>

            <section className="details-section" aria-label="Connected edges">
              <div className="panel-topline">
                <p>Adjacent records</p>
                <strong>{selectedEdges.length}</strong>
              </div>
              {selectedEdges.length > 0 ? (
                <ul className="connection-list modal-list">
                  {selectedEdges.map((edge) => {
                    const neighborId = edge.source === selectedNode.id ? edge.target : edge.source;
                    const neighbor =
                      snapshot.nodes.find((node) => node.id === neighborId)?.name ?? neighborId;
                    return (
                      <li key={edge.id}>
                        <span title={edge.type}>{compactLabel(edge.type)}</span>
                        <button
                          type="button"
                          title={neighbor}
                          aria-label={`Select neighbor ${neighbor}`}
                          onClick={() => {
                            setSelectedId(neighborId);
                            setDetailsOpen(true);
                            graphRef.current?.panToNode(neighborId);
                          }}
                        >
                          {neighbor}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="empty-copy">This record has no adjacent connections.</p>
              )}
            </section>

            <section className="details-section" aria-label="Node metadata">
              <div className="panel-topline">
                <p>Metadata</p>
                <strong>{selectedMetaEntries.length}</strong>
              </div>
              {selectedMetaEntries.length > 0 ? (
                <pre className="meta-block">{formatJson(selectedNode.meta)}</pre>
              ) : (
                <p className="empty-copy">No metadata on this node.</p>
              )}
            </section>

            <div className="modal-actions">
              <button type="button" onClick={frameSelected}>
                Frame
              </button>
              <button type="button" onClick={() => graphRef.current?.panToNode(selectedNode.id)}>
                Center
              </button>
              <button
                type="button"
                title="Keyboard shortcut: Escape"
                aria-keyshortcuts="Escape"
                onClick={() => setDetailsOpen(false)}
              >
                Close
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
