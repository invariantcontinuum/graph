"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  GraphScene,
  type EdgeData,
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

type JsonResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

type ThemeProfile = {
  id: string;
  label: string;
  overrides: GraphThemeOverrides;
};

const THEME_PROFILES: ThemeProfile[] = [
  {
    id: "midnight",
    label: "Midnight Ops",
    overrides: {
      canvasBg: "#060912",
      gridLineColor: "#141b2f",
      labelHalo: "#060912",
      selectionBorder: "#22d3ee",
      selectionFill: "rgba(34, 211, 238, 0.18)",
      hullFill: "rgba(34, 211, 238, 0.05)",
      hullStroke: "rgba(34, 211, 238, 0.24)",
      dimOpacity: 0.1,
      defaultNodeStyle: {
        color: "#101827",
        borderColor: "#38bdf8",
        labelColor: "#eef8ff",
      },
      defaultEdgeStyle: {
        color: "#64748b",
        width: 1.35,
      },
    },
  },
  {
    id: "daylight",
    label: "Daylight Grid",
    overrides: {
      canvasBg: "#f7f9fc",
      gridLineColor: "#dde5f0",
      labelHalo: "#f7f9fc",
      selectionBorder: "#2563eb",
      selectionFill: "rgba(37, 99, 235, 0.14)",
      hullFill: "rgba(37, 99, 235, 0.05)",
      hullStroke: "rgba(37, 99, 235, 0.2)",
      dimOpacity: 0.15,
      defaultNodeStyle: {
        color: "#ffffff",
        borderColor: "#2563eb",
        labelColor: "#111827",
      },
      defaultEdgeStyle: {
        color: "#667085",
        width: 1.25,
      },
    },
  },
  {
    id: "aurora",
    label: "Aurora Dark",
    overrides: {
      canvasBg: "#090a1a",
      gridLineColor: "#1d1b39",
      labelHalo: "#090a1a",
      selectionBorder: "#a78bfa",
      selectionFill: "rgba(167, 139, 250, 0.2)",
      hullFill: "rgba(167, 139, 250, 0.06)",
      hullStroke: "rgba(167, 139, 250, 0.25)",
      dimOpacity: 0.1,
      defaultNodeStyle: {
        color: "#15132b",
        borderColor: "#a78bfa",
        labelColor: "#f8fafc",
      },
      defaultEdgeStyle: {
        color: "#8b93b8",
        width: 1.4,
      },
    },
  },
  {
    id: "paper",
    label: "Clean Paper",
    overrides: {
      canvasBg: "#ffffff",
      gridLineColor: "#e6edf5",
      labelHalo: "#ffffff",
      selectionBorder: "#0f766e",
      selectionFill: "rgba(15, 118, 110, 0.14)",
      hullFill: "rgba(15, 118, 110, 0.05)",
      hullStroke: "rgba(15, 118, 110, 0.2)",
      dimOpacity: 0.16,
      defaultNodeStyle: {
        color: "#ffffff",
        borderColor: "#0f766e",
        labelColor: "#0f172a",
      },
      defaultEdgeStyle: {
        color: "#6b7280",
        width: 1.25,
      },
    },
  },
];

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseJson<T>(raw: string, validate: (value: unknown) => T): JsonResult<T> {
  try {
    return { ok: true, value: validate(JSON.parse(raw)) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function requireString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${path} must be a non-empty string`);
  }
  return value;
}

function requireText(value: unknown, path: string): string {
  if (typeof value !== "string") {
    throw new Error(`${path} must be a string`);
  }
  return value;
}

function requireNumber(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${path} must be a finite number`);
  }
  return value;
}

function validateSnapshot(value: unknown): GraphSnapshot {
  if (!isRecord(value)) throw new Error("snapshot must be an object");
  if (!Array.isArray(value.nodes)) throw new Error("snapshot.nodes must be an array");
  if (!Array.isArray(value.edges)) throw new Error("snapshot.edges must be an array");
  if (!isRecord(value.meta)) throw new Error("snapshot.meta must be an object");

  const nodes: NodeData[] = value.nodes.map((raw, index) => {
    if (!isRecord(raw)) throw new Error(`nodes[${index}] must be an object`);
    const meta = raw.meta;
    if (!isRecord(meta)) throw new Error(`nodes[${index}].meta must be an object`);
    return {
      id: requireString(raw.id, `nodes[${index}].id`),
      name: requireString(raw.name, `nodes[${index}].name`),
      type: requireString(raw.type, `nodes[${index}].type`),
      domain: requireString(raw.domain, `nodes[${index}].domain`),
      status: requireString(raw.status, `nodes[${index}].status`),
      community:
        raw.community === undefined
          ? undefined
          : requireNumber(raw.community, `nodes[${index}].community`),
      meta,
    };
  });

  const edges: EdgeData[] = value.edges.map((raw, index) => {
    if (!isRecord(raw)) throw new Error(`edges[${index}] must be an object`);
    return {
      id: requireString(raw.id, `edges[${index}].id`),
      source: requireString(raw.source, `edges[${index}].source`),
      target: requireString(raw.target, `edges[${index}].target`),
      type: requireString(raw.type, `edges[${index}].type`),
      label: requireText(raw.label, `edges[${index}].label`),
      weight: requireNumber(raw.weight, `edges[${index}].weight`),
    };
  });

  return {
    nodes,
    edges,
    meta: {
      node_count: requireNumber(value.meta.node_count, "meta.node_count"),
      edge_count: requireNumber(value.meta.edge_count, "meta.edge_count"),
      last_updated:
        value.meta.last_updated === undefined
          ? undefined
          : requireString(value.meta.last_updated, "meta.last_updated"),
    },
  };
}

function validateThemeOverrides(value: unknown): GraphThemeOverrides {
  if (!isRecord(value)) throw new Error("theme overrides must be an object");
  return value as GraphThemeOverrides;
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
  const [themeProfileId, setThemeProfileId] = useState("preset");
  const [snapshot, setSnapshot] = useState<GraphSnapshot>(PRESETS[0].snapshot);
  const [snapshotJson, setSnapshotJson] = useState(() => formatJson(PRESETS[0].snapshot));
  const [themeOverrides, setThemeOverrides] = useState<GraphThemeOverrides>(
    PRESETS[0].overrides,
  );
  const [themeJson, setThemeJson] = useState(() => formatJson(PRESETS[0].overrides));
  const [snapshotErr, setSnapshotErr] = useState<string | null>(null);
  const [themeErr, setThemeErr] = useState<string | null>(null);
  const [legend, setLegend] = useState<LegendSummary | null>(null);
  const [stats, setStats] = useState<GraphStats | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const preset: Preset = useMemo(() => presetBySlug(activeSlug), [activeSlug]);

  const refit = useCallback((padding = 48) => {
    requestAnimationFrame(() => graphRef.current?.focusFit(null, padding));
  }, []);

  const applyPreset = useCallback(
    (slug: string) => {
      const nextPreset = presetBySlug(slug);
      setActiveSlug(slug);
      setSnapshot(nextPreset.snapshot);
      setSnapshotJson(formatJson(nextPreset.snapshot));
      setThemeProfileId("preset");
      setThemeOverrides(nextPreset.overrides);
      setThemeJson(formatJson(nextPreset.overrides));
      setSelectedId(null);
      setSnapshotErr(null);
      setThemeErr(null);
      refit();
    },
    [refit],
  );

  const commitSnapshot = useCallback(
    (next: GraphSnapshot, nextSelectedId: string | null = selectedId) => {
      const normalized = withMeta(next);
      setSnapshot(normalized);
      setSnapshotJson(formatJson(normalized));
      setSelectedId(nextSelectedId);
      setSnapshotErr(null);
      refit();
    },
    [refit, selectedId],
  );

  const applySnapshotJson = useCallback(() => {
    const parsed = parseJson(snapshotJson, validateSnapshot);
    if (!parsed.ok) {
      setSnapshotErr(parsed.error);
      return;
    }
    commitSnapshot(parsed.value, null);
  }, [commitSnapshot, snapshotJson]);

  const applyThemeJson = useCallback(() => {
    const parsed = parseJson(themeJson, validateThemeOverrides);
    if (!parsed.ok) {
      setThemeErr(parsed.error);
      return;
    }
    setThemeProfileId("custom");
    setThemeOverrides(parsed.value);
    setThemeErr(null);
  }, [themeJson]);

  const applyThemeProfile = useCallback(
    (profileId: string) => {
      setThemeProfileId(profileId);
      const next =
        profileId === "preset"
          ? preset.overrides
          : THEME_PROFILES.find((profile) => profile.id === profileId)?.overrides;
      if (!next) return;
      setThemeOverrides(next);
      setThemeJson(formatJson(next));
      setThemeErr(null);
    },
    [preset.overrides],
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

  const addNeighbor = useCallback(() => {
    if (!selectedNode) return;
    const nodeIds = new Set(snapshot.nodes.map((node) => node.id));
    const edgeIds = new Set(snapshot.edges.map((edge) => edge.id));
    const nodeId = nextId(`${selectedNode.id}-neighbor`, nodeIds);
    const edgeId = nextId("edge", edgeIds);
    const node: NodeData = {
      id: nodeId,
      name: `${selectedNode.name} neighbor`,
      type: selectedNode.type,
      domain: selectedNode.domain,
      status: "healthy",
      meta: { source: "showcase", parent: selectedNode.id },
    };
    const edge: EdgeData = {
      id: edgeId,
      source: selectedNode.id,
      target: nodeId,
      type: snapshot.edges[0]?.type ?? "depends",
      label: "generated",
      weight: 1,
    };
    commitSnapshot(
      {
        ...snapshot,
        nodes: [...snapshot.nodes, node],
        edges: [...snapshot.edges, edge],
      },
      nodeId,
    );
  }, [commitSnapshot, selectedNode, snapshot]);

  const removeSelected = useCallback(() => {
    if (!selectedId) return;
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
  }, [commitSnapshot, selectedId, snapshot]);

  const frameSelected = useCallback(() => {
    graphRef.current?.focusFit(selectedId, 64);
  }, [selectedId]);

  const handlePositionsReady = useCallback(() => {
    refit(48);
  }, [refit]);

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
        <span className="brand-mark">@invariantcontinuum/graph</span>
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
                onClick={() => applyPreset(item.slug)}
              >
                <span>{item.folio}</span>
                <strong>{item.title}</strong>
                <small>{item.subtitle}</small>
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
                onClick={() => setThemeMode(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <label className="field-label" htmlFor="theme-profile">
            Theme profile
          </label>
          <select
            id="theme-profile"
            className="select-control"
            value={themeProfileId}
            onChange={(event) => applyThemeProfile(event.target.value)}
          >
            <option value="preset">Scenario theme</option>
            <option value="custom">Custom JSON</option>
            {THEME_PROFILES.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.label}
              </option>
            ))}
          </select>
          <div className="button-row">
            <button type="button" className="action-button" onClick={() => graphRef.current?.fit(48)}>
              Fit
            </button>
            <button type="button" className="action-button" onClick={() => graphRef.current?.zoomIn()}>
              Zoom In
            </button>
            <button type="button" className="action-button" onClick={() => graphRef.current?.zoomOut()}>
              Zoom Out
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
              Add Node
            </button>
            <button
              type="button"
              className="action-button"
              disabled={!selectedNode}
              onClick={addNeighbor}
            >
              Add Neighbor
            </button>
            <button
              type="button"
              className="danger-button"
              disabled={!selectedNode}
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
              </div>
              <ul className="edge-list" aria-label="Incident edges">
                {selectedEdges.map((edge) => {
                  const neighborId = edge.source === selectedNode.id ? edge.target : edge.source;
                  const neighbor =
                    snapshot.nodes.find((node) => node.id === neighborId)?.name ?? neighborId;
                  return (
                    <li key={edge.id}>
                      <span>{edge.type}</span>
                      <button type="button" onClick={() => setSelectedId(neighborId)}>
                        {neighbor}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <p className="empty-state">No node selected.</p>
          )}
        </section>

        <section className="panel-section json-section">
          <div className="section-title">
            <span>JSON</span>
            <strong>{themeProfileId}</strong>
          </div>
          <label className="field-label" htmlFor="snapshot-json-editor">
            snapshot.json
          </label>
          <textarea
            id="snapshot-json-editor"
            className="json-editor"
            spellCheck={false}
            value={snapshotJson}
            onChange={(event) => setSnapshotJson(event.target.value)}
          />
          <div className="editor-actions">
            <button type="button" className="action-button" onClick={applySnapshotJson}>
              Apply Graph
            </button>
            {snapshotErr ? <span className="error-text">{snapshotErr}</span> : null}
          </div>
          <label className="field-label" htmlFor="theme-json-editor">
            themeOverrides.json
          </label>
          <textarea
            id="theme-json-editor"
            className="json-editor"
            spellCheck={false}
            value={themeJson}
            onChange={(event) => setThemeJson(event.target.value)}
          />
          <div className="editor-actions">
            <button type="button" className="action-button" onClick={applyThemeJson}>
              Apply Theme
            </button>
            {themeErr ? <span className="error-text">{themeErr}</span> : null}
          </div>
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
            onNodeClick={(node) => setSelectedId(node.id)}
            onBackgroundClick={() => setSelectedId(null)}
            onLegendChange={setLegend}
            onStatsChange={setStats}
            onPositionsReady={handlePositionsReady}
            aria-label={`${preset.title} graph`}
          />
        </div>
      </section>
    </main>
  );
}
