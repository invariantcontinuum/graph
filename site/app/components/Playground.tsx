"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  GraphHandle,
  GraphStats,
  LayoutType,
  NodeData,
} from "@invariantcontinuum/graph/react";
import { SCENARIOS, scenarioBySlug } from "../scenarios";
import { EngineFrame } from "./EngineFrame";
import { Reveal } from "./Reveal";

const LAYOUTS: Array<{ id: LayoutType; label: string }> = [
  { id: "force", label: "Force" },
  { id: "hierarchical", label: "Hierarchical" },
  { id: "grid", label: "Grid" },
];

export function Playground() {
  const graphRef = useRef<GraphHandle | null>(null);
  const [slug, setSlug] = useState(SCENARIOS[0].slug);
  const [layout, setLayout] = useState<LayoutType>("force");
  const [stats, setStats] = useState<GraphStats | null>(null);
  const [selected, setSelected] = useState<NodeData | null>(null);

  const scenario = useMemo(() => scenarioBySlug(slug), [slug]);

  const selectedEdges = useMemo(() => {
    if (!selected) return [];
    return scenario.snapshot.edges.filter(
      (e) => e.source === selected.id || e.target === selected.id,
    );
  }, [selected, scenario]);

  const focusIds = useMemo(() => {
    if (!selected) return null;
    const ids = new Set<string>([selected.id]);
    for (const e of selectedEdges) {
      ids.add(e.source);
      ids.add(e.target);
    }
    return ids;
  }, [selected, selectedEdges]);

  const pickScenario = useCallback((next: string) => {
    setSlug(next);
    setSelected(null);
  }, []);

  const clearSelection = useCallback(() => setSelected(null), []);

  const onNodeClick = useCallback((node: NodeData | null) => {
    setSelected(node);
    if (node) graphRef.current?.panToNode(node.id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <section
      className="section playground"
      id="playground"
      aria-labelledby="pg-h"
    >
      <Reveal>
        <h2 id="pg-h">Five datasets, one engine</h2>
        <p className="section-lede">
          The scenarios below are procedurally generated and deliberately
          generic. Switching restyles the same engine through plain theme
          overrides: shapes, colors, and edge styles per node or edge type.
        </p>
      </Reveal>
      <Reveal className="pg-grid">
        <div className="pg-rail" role="tablist" aria-label="Demo scenarios">
          {SCENARIOS.map((s) => (
            <button
              key={s.slug}
              type="button"
              role="tab"
              aria-selected={s.slug === slug}
              className={`pg-tab${s.slug === slug ? " active" : ""}`}
              onClick={() => pickScenario(s.slug)}
            >
              <strong>{s.name}</strong>
              <span>{s.blurb}</span>
              <span className="pg-counts">
                {s.snapshot.nodes.length} nodes, {s.snapshot.edges.length} edges
              </span>
            </button>
          ))}
        </div>
        <div className="pg-stage" id="graph-stage" tabIndex={-1}>
          <EngineFrame
            ref={graphRef}
            snapshot={scenario.snapshot}
            themeOverrides={scenario.overrides}
            layout={layout}
            focusIds={focusIds}
            onNodeClick={onNodeClick}
            onBackgroundClick={clearSelection}
            onStatsChange={setStats}
            ariaLabel={`Live demo: ${scenario.name}, ${scenario.snapshot.nodes.length} nodes. Click a node to spotlight its neighborhood.`}
            fitPadding={48}
          >
            <span className="canvas-hint" aria-hidden="true">
              click a node to spotlight its neighborhood
            </span>
          </EngineFrame>
          <div className="pg-controls">
            <div
              className="segmented"
              role="group"
              aria-label="Layout algorithm"
            >
              {LAYOUTS.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  className={layout === l.id ? "active" : ""}
                  aria-pressed={layout === l.id}
                  onClick={() => setLayout(l.id)}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <div className="pg-zoom" role="group" aria-label="Camera">
              <button
                type="button"
                onClick={() => graphRef.current?.zoomOut()}
                aria-label="Zoom out"
                aria-keyshortcuts="-"
              >
                &minus;
              </button>
              <button
                type="button"
                onClick={() => graphRef.current?.zoomIn()}
                aria-label="Zoom in"
                aria-keyshortcuts="Plus"
              >
                +
              </button>
              <button type="button" onClick={() => graphRef.current?.fit(48)}>
                Fit
              </button>
            </div>
            {stats ? (
              <span className="pg-stats">
                {stats.nodeCount} nodes, {stats.edgeCount} edges
              </span>
            ) : null}
          </div>
          <div className="pg-selection" aria-live="polite">
            {selected ? (
              <>
                <span className="pg-selected-name">{selected.name}</span>
                <span className="pg-selected-meta">
                  type {selected.type}, {selectedEdges.length} connection
                  {selectedEdges.length === 1 ? "" : "s"}
                </span>
                <button
                  type="button"
                  onClick={clearSelection}
                  aria-keyshortcuts="Escape"
                >
                  Clear
                </button>
              </>
            ) : (
              <span className="pg-selected-meta">
                Nothing selected. Click any node; Escape clears.
              </span>
            )}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
