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

export default function Showcase() {
  const graphRef = useRef<GraphHandle>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSlug, setActiveSlug] = useState(PRESETS[0].slug);
  const [layout, setLayout] = useState<LayoutType>("force");
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");
  const [snapshot, setSnapshot] = useState<GraphSnapshot>(PRESETS[0].snapshot);
  const [themeOverrides, setThemeOverrides] = useState<GraphThemeOverrides>(
    PRESETS[0].overrides,
  );
  const [legend, setLegend] = useState<LegendSummary | null>(null);
  const [stats, setStats] = useState<GraphStats | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const preset: Preset = useMemo(() => presetBySlug(activeSlug), [activeSlug]);

  const refit = useCallback((padding = 48) => {
    requestAnimationFrame(() => graphRef.current?.focusFit(null, padding));
  }, []);

  const applyPreset = useCallback(
    (slug: string) => {
      const nextPreset = presetBySlug(slug);
      setActiveSlug(slug);
      setSnapshot(nextPreset.snapshot);
      setThemeOverrides(nextPreset.overrides);
      setSelectedId(null);
      setDetailsOpen(false);
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

  const addNode = useCallback(() => {
    const existing = new Set(snapshot.nodes.map((node) => node.id));
    const id = nextId("node", existing);
    const node: NodeData = {
      id,
      name: `Node ${snapshot.nodes.length + 1}`,
      type: snapshot.nodes[0]?.type ?? "entity",
      domain: "custom",
      status: "healthy",
      meta: { source: "showcase" },
    };
    commitSnapshot({ ...snapshot, nodes: [...snapshot.nodes, node] }, id);
  }, [commitSnapshot, snapshot]);

  const removeSelected = useCallback(() => {
    if (!selectedId || !selectedNode) return;
    if (
      !window.confirm(
        `Are you sure you want to remove "${selectedNode.name}" and all its connected edges? This action cannot be undone.`,
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

  const frameSelected = useCallback(() => {
    graphRef.current?.focusFit(selectedId, 64);
  }, [selectedId]);

  const clearSelection = useCallback(() => {
    setSelectedId(null);
    setDetailsOpen(false);
  }, []);

  const openNodeDetails = useCallback((node: NodeData) => {
    setSelectedId(node.id);
    setDetailsOpen(true);
  }, []);

  const handlePositionsReady = useCallback(() => {
    refit(48);
  }, [refit]);

  useEffect(() => {
    if (!detailsOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDetailsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [detailsOpen]);

  return (
    <main className="workbench-shell">
      <div className="mobile-topbar">
        <button
          type="button"
          className="icon-button"
          aria-label={sidebarOpen ? "Close controls" : "Open controls"}
          aria-expanded={sidebarOpen}
          aria-controls="graph-controls"
          onClick={() => setSidebarOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>
        <span className="brand-mark" title="@invariantcontinuum/graph">@invariantcontinuum/graph</span>
      </div>

      {sidebarOpen ? (
        <button
          type="button"
          className="drawer-backdrop"
          aria-label="Close controls"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        id="graph-controls"
        className="control-panel"
        data-open={sidebarOpen}
        aria-label="Graph controls"
      >
        <div className="panel-head">
          <div>
            <p className="kicker">Graph Scenario Lab</p>
            <h1>Graph Control Plane</h1>
          </div>
          <a
            className="repo-link"
            href="https://github.com/invariantcontinuum/graph"
            target="_blank"
            rel="noreferrer noopener"
          >
            GitHub
          </a>
        </div>

        <section className="panel-section">
          <div className="section-title">
            <span>Scenarios</span>
            <strong>{PRESETS.length}</strong>
          </div>
          <nav className="preset-list" aria-label="Graph presets">
            {PRESETS.map((item) => (
              <button
                key={item.slug}
                type="button"
                className="preset-button"
                data-active={item.slug === activeSlug}
                aria-current={item.slug === activeSlug ? "true" : undefined}
                onClick={() => applyPreset(item.slug)}
              >
                <span>{item.folio}</span>
                <strong title={item.title}>{item.title}</strong>
                <small title={item.subtitle}>{item.subtitle}</small>
              </button>
            ))}
          </nav>
        </section>

        <section className="panel-section">
          <div className="section-title">
            <span>Render</span>
            <strong>{layout}</strong>
          </div>
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
          <div className="segmented" aria-label="Theme mode">
            {(["light", "dark"] as ThemeMode[]).map((item) => (
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
          <div className="button-row">
            <button type="button" className="action-button" onClick={() => graphRef.current?.fit(48)}>
              Fit view
            </button>
          </div>
        </section>

        <section className="panel-section">
          <div className="section-title">
            <span>Graph</span>
            <strong>
              {snapshot.nodes.length} / {snapshot.edges.length}
            </strong>
          </div>
          <div className="button-row">
            <button type="button" className="action-button" onClick={addNode}>
              Add node
            </button>
            <button
              type="button"
              className="danger-button"
              disabled={!selectedNode}
              title={!selectedNode ? "Select a node first to remove it" : undefined}
              onClick={removeSelected}
            >
              Remove
            </button>
          </div>
          <div className="type-cloud" aria-label="Node types">
            {nodeTypes.map((item) => (
              <span key={item.key}>
                {item.key}
                <b>{item.count}</b>
              </span>
            ))}
          </div>
          <div className="type-cloud" aria-label="Edge types">
            {edgeTypes.map((item) => (
              <span key={item.key}>
                {item.key}
                <b>{item.count}</b>
              </span>
            ))}
          </div>
        </section>

        <section className="panel-section">
          <div className="section-title">
            <span>Selection</span>
            <strong>{selectedNode ? selectedNode.id : "none"}</strong>
          </div>
          {selectedNode ? (
            <div className="selection-box">
              <h2>{selectedNode.name}</h2>
              <dl>
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
              </dl>
              <div className="button-row">
                <button
                  type="button"
                  className="action-button"
                  onClick={() => graphRef.current?.panToNode(selectedNode.id)}
                >
                  Center on node
                </button>
                <button
                  type="button"
                  className="action-button"
                  title="Keyboard shortcut: Escape"
                  aria-keyshortcuts="Escape"
                  onClick={clearSelection}
                >
                  Clear
                </button>
              </div>
              <ul className="edge-list" aria-label="Incident edges">
                {selectedEdges.map((edge) => {
                  const neighborId = edge.source === selectedNode.id ? edge.target : edge.source;
                  const neighbor =
                    snapshot.nodes.find((node) => node.id === neighborId)?.name ?? neighborId;
                  return (
                    <li key={edge.id}>
                      <span title={edge.type}>{edge.type}</span>
                      <button
                        type="button"
                        title={neighbor}
                        aria-label={`Select neighbor ${neighbor}`}
                        onClick={() => {
                          setSelectedId(neighborId);
                          setDetailsOpen(true);
                        }}
                      >
                        {neighbor}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <p className="empty-state">No node selected. Click a node on the canvas to inspect it.</p>
          )}
        </section>

      </aside>

      <section className="graph-workspace" aria-label="Graph canvas">
        <div className="graph-toolbar">
          <div>
            <p className="scenario-eyebrow">{preset.subtitle}</p>
            <h2>{preset.title}</h2>
            <p className="scenario-copy">{preset.essay}</p>
          </div>
          <div className="graph-stats" aria-label="Graph stats">
            <span>{stats?.nodeCount ?? snapshot.nodes.length} nodes</span>
            <span>{stats?.edgeCount ?? snapshot.edges.length} edges</span>
            <span>{legend?.node_types.length ?? nodeTypes.length} types</span>
          </div>
        </div>

        <div className="graph-stage">
          <GraphScene
            ref={graphRef}
            snapshot={snapshot}
            themeMode={themeMode}
            layout={layout}
            themeOverrides={themeOverrides}
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
                <p className="kicker">Node details</p>
                <h2 id="node-details-title">{selectedNode.name}</h2>
                <span>{selectedNode.id}</span>
              </div>
              <button
                type="button"
                className="modal-close"
                aria-label="Close node details"
                onClick={() => setDetailsOpen(false)}
              >
                x
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
              <div className="section-title">
                <span>Connections</span>
                <strong>{selectedEdges.length}</strong>
              </div>
              {selectedEdges.length > 0 ? (
                <ul className="modal-edge-list">
                  {selectedEdges.map((edge) => {
                    const neighborId = edge.source === selectedNode.id ? edge.target : edge.source;
                    const neighbor =
                      snapshot.nodes.find((node) => node.id === neighborId)?.name ?? neighborId;
                    return (
                      <li key={edge.id}>
                        <span title={edge.type}>{edge.type}</span>
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
                <p className="empty-state">No connected edges.</p>
              )}
            </section>

            <section className="details-section" aria-label="Node metadata">
              <div className="section-title">
                <span>Metadata</span>
                <strong>{selectedMetaEntries.length}</strong>
              </div>
              {selectedMetaEntries.length > 0 ? (
                <pre className="meta-block">{formatJson(selectedNode.meta)}</pre>
              ) : (
                <p className="empty-state">No metadata on this node.</p>
              )}
            </section>

            <div className="modal-actions">
              <button type="button" className="action-button" onClick={frameSelected}>
                Frame
              </button>
              <button
                type="button"
                className="action-button"
                onClick={() => graphRef.current?.panToNode(selectedNode.id)}
              >
                Center
              </button>
              <button type="button" className="action-button" onClick={() => setDetailsOpen(false)}>
                Close
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
