"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  GraphScene,
  type GraphHandle,
  type GraphSnapshot,
  type GraphStats,
  type LegendSummary,
} from "@invariantcontinuum/graph/react";
import { PRESETS, presetBySlug, type Preset } from "./presets";

const TODAY = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "long",
  year: "numeric",
}).format(new Date());

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export default function Showcase() {
  const [activeSlug, setActiveSlug] = useState<string>(PRESETS[0].slug);
  const preset: Preset = useMemo(() => presetBySlug(activeSlug), [activeSlug]);

  const [snapshot, setSnapshot] = useState<GraphSnapshot>(preset.snapshot);
  const [overridesJson, setOverridesJson] = useState(() =>
    formatJson(preset.overrides),
  );
  const [snapshotJson, setSnapshotJson] = useState(() =>
    formatJson(preset.snapshot),
  );
  const [overridesErr, setOverridesErr] = useState<string | null>(null);
  const [snapshotErr, setSnapshotErr] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [legend, setLegend] = useState<LegendSummary | null>(null);
  const [stats, setStats] = useState<GraphStats | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const graphRef = useRef<GraphHandle>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Preset change → reset snapshot, overrides, selection, then schedule a
  // refit once the worker has had a beat to produce settled positions for
  // the new snapshot. Calling focusFit synchronously in this effect would
  // frame the stale previous layout. 350ms matches the force-layout's
  // typical convergence time on our preset sizes; `onPositionsReady` below
  // is the authoritative fast path when it fires.
  useEffect(() => {
    setSnapshot(preset.snapshot);
    setOverridesJson(formatJson(preset.overrides));
    setSnapshotJson(formatJson(preset.snapshot));
    setSelectedId(null);
    setOverridesErr(null);
    setSnapshotErr(null);
    const timer = window.setTimeout(() => {
      graphRef.current?.focusFit(null, 40);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [preset]);

  const handlePositionsReady = useCallback(() => {
    requestAnimationFrame(() => graphRef.current?.focusFit(null, 40));
  }, []);

  const parsedOverrides = useMemo(() => {
    try {
      const parsed = JSON.parse(overridesJson);
      setOverridesErr(null);
      return parsed;
    } catch (err) {
      setOverridesErr(err instanceof Error ? err.message : String(err));
      return preset.overrides;
    }
  }, [overridesJson, preset.overrides]);

  const applySnapshotFromEditor = useCallback(() => {
    try {
      const parsed = JSON.parse(snapshotJson) as GraphSnapshot;
      setSnapshot(parsed);
      setSnapshotErr(null);
      setSelectedId(null);
      graphRef.current?.focusFit(null);
    } catch (err) {
      setSnapshotErr(err instanceof Error ? err.message : String(err));
    }
  }, [snapshotJson]);

  const selectedNode = useMemo(
    () => (selectedId ? snapshot.nodes.find((n) => n.id === selectedId) : null),
    [selectedId, snapshot.nodes],
  );

  const selectedEdges = useMemo(() => {
    if (!selectedId) return [];
    return snapshot.edges.filter(
      (e) => e.source === selectedId || e.target === selectedId,
    );
  }, [selectedId, snapshot.edges]);

  if (!isClient) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="eyebrow">loading atlas…</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--paper)]">
      {/* ── Masthead ──────────────────────────────────────────────── */}
      <header className="relative border-b border-[color:var(--rule)] px-6 pt-5 pb-4 md:px-10">
        <div className="mx-auto flex max-w-[1500px] items-end justify-between gap-6">
          <div className="flex items-baseline gap-6">
            <span className="eyebrow enter delay-1">
              No. {PRESETS.length} &nbsp;·&nbsp; Vol. 0.2.3 &nbsp;·&nbsp; {TODAY}
            </span>
          </div>
          <div className="enter delay-1">
            <a
              className="underline-draw eyebrow text-[color:var(--ink)]"
              href="https://github.com/invariantcontinuum/graph"
              target="_blank"
              rel="noreferrer noopener"
            >
              github · invariantcontinuum/graph
            </a>
          </div>
        </div>

        <div className="mx-auto mt-3 max-w-[1500px]">
          <h1 className="display-serif enter delay-2 text-[clamp(2.75rem,7vw,5.25rem)] leading-[0.92] tracking-[-0.02em]">
            An Atlas of <em className="italic text-[color:var(--accent)]">Graphs</em>
          </h1>
          <div className="mt-5 grid grid-cols-12 gap-6 items-end">
            <p className="body-serif enter delay-3 col-span-12 md:col-span-7 text-[1.04rem] leading-[1.55] text-[color:var(--ink-soft)] max-w-[48rem] drop-cap">
              Eight worlds — microservices, myth, chemistry, drama, philosophy,
              tonality, transit, a loaf of bread — rendered by a single WASM +
              WebGL2 engine. The surface area of the library is not a
              taxonomy; node and edge types are plain strings, and the theme
              is yours to compose.
            </p>
            <div className="enter delay-4 col-span-12 md:col-span-5 md:justify-self-end text-right">
              <span className="eyebrow block">Presented by</span>
              <div className="mt-1 font-mono text-[1.1rem] tracking-tight text-[color:var(--ink)]">
                @invariantcontinuum/graph
              </div>
              <div className="eyebrow mt-2">
                wasm · webgl2 · react · web-worker
              </div>
            </div>
          </div>
        </div>

        <div className="enter-rule mt-6 rule mx-auto max-w-[1500px]" style={{ animationDelay: "0.55s" }} />
      </header>

      {/* ── Body: 3-column atlas ──────────────────────────────────── */}
      <main className="mx-auto grid w-full max-w-[1500px] flex-1 grid-cols-12 gap-6 px-6 py-8 md:px-10">
        {/* Left rail — preset index */}
        <aside className="col-span-12 md:col-span-3 md:pr-6 md:border-r md:border-[color:var(--rule)]">
          <div className="flex items-center justify-between mb-3">
            <span className="eyebrow">The Plates</span>
            <span className="folio text-xs">i–viii</span>
          </div>
          <nav className="scroll-thin enter delay-3" aria-label="Presets">
            {PRESETS.map((p, i) => (
              <button
                key={p.slug}
                type="button"
                className="preset-row w-full text-left"
                data-active={p.slug === activeSlug}
                onClick={() => setActiveSlug(p.slug)}
                style={{ animationDelay: `${0.35 + i * 0.04}s` }}
              >
                <span className="preset-folio">{p.folio}.</span>
                <span>
                  <span className="preset-title block">{p.title}</span>
                  <span className="preset-subtitle">{p.subtitle}</span>
                </span>
              </button>
            ))}
          </nav>

          <div className="mt-8 enter delay-7">
            <span className="eyebrow">Footnotes</span>
            <p className="body-serif mt-2 text-[0.82rem] italic leading-relaxed text-[color:var(--dust)]">
              Every illustration here was painted by the same 6 400 lines of
              Rust, cross-compiled to WebAssembly and instanced through
              WebGL2. Node layout runs in a Web Worker; picking and camera
              live on the main thread.
            </p>
          </div>
        </aside>

        {/* Center — canvas */}
        <section className="col-span-12 md:col-span-6">
          <div className="flex items-baseline justify-between">
            <div>
              <span className="eyebrow">Plate {preset.folio}</span>
              <h2
                key={preset.slug}
                className="display-serif enter-fade text-[2rem] leading-[1] mt-1"
                style={{ fontVariationSettings: '"SOFT" 100, "opsz" 96' }}
              >
                {preset.title}
              </h2>
              <p
                key={`${preset.slug}-sub`}
                className="enter-fade body-serif italic text-[color:var(--ink-soft)] text-[0.95rem] mt-1"
                style={{ animationDelay: "0.08s" }}
              >
                {preset.subtitle}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="press-btn"
                onClick={() => graphRef.current?.focusFit(null, 40)}
              >
                Refit
              </button>
              <button
                type="button"
                className="press-btn"
                data-active={editorOpen}
                aria-expanded={editorOpen}
                aria-controls="source-drawer"
                onClick={() => setEditorOpen((v) => !v)}
              >
                {editorOpen ? "Hide source" : "Show source"}
              </button>
            </div>
          </div>

          <div
            key={preset.slug}
            className="enter-graph canvas-frame mt-4 aspect-[4/3] w-full overflow-hidden"
          >
            <span className="canvas-corner tl" />
            <span className="canvas-corner tr" />
            <span className="canvas-corner bl" />
            <span className="canvas-corner br" />
            <GraphScene
              ref={graphRef}
              snapshot={snapshot}
              themeMode="light"
              layout="force"
              themeOverrides={parsedOverrides}
              onNodeClick={(node) => setSelectedId(node.id)}
              onBackgroundClick={() => setSelectedId(null)}
              onLegendChange={setLegend}
              onStatsChange={setStats}
              onPositionsReady={handlePositionsReady}
            />
          </div>

          <p
            key={`${preset.slug}-essay`}
            className="enter-fade body-serif mt-5 max-w-[52ch] text-[0.96rem] leading-[1.6] text-[color:var(--ink-soft)]"
            style={{ animationDelay: "0.2s" }}
          >
            {preset.essay}
          </p>

          {/* Source drawer */}
          <div id="source-drawer" className="source-drawer mt-6" data-open={editorOpen}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="snapshot-json" className="eyebrow">snapshot.json</label>
                  <button
                    type="button"
                    className="press-btn"
                    onClick={applySnapshotFromEditor}
                  >
                    Apply
                  </button>
                </div>
                <textarea
                  id="snapshot-json"
                  className="source-pad block w-full h-64"
                  spellCheck={false}
                  value={snapshotJson}
                  onChange={(e) => setSnapshotJson(e.target.value)}
                />
                {snapshotErr && (
                  <div className="mt-2 eyebrow text-[color:var(--accent)]">
                    {snapshotErr}
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="theme-overrides-json" className="eyebrow">themeOverrides.json</label>
                  <span className="eyebrow">live</span>
                </div>
                <textarea
                  id="theme-overrides-json"
                  className="source-pad block w-full h-64"
                  spellCheck={false}
                  value={overridesJson}
                  onChange={(e) => setOverridesJson(e.target.value)}
                />
                {overridesErr && (
                  <div className="mt-2 eyebrow text-[color:var(--accent)]">
                    {overridesErr}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Right rail — field notes */}
        <aside className="col-span-12 md:col-span-3 md:pl-6 md:border-l md:border-[color:var(--rule)]">
          <div className="flex items-center justify-between mb-3">
            <span className="eyebrow">Field Notes</span>
            <span className="folio text-xs">
              {stats ? `${stats.nodeCount} · ${stats.edgeCount}` : "—"}
            </span>
          </div>

          {selectedNode ? (
            <div className="enter-fade">
              <div className="eyebrow">Selected</div>
              <h3 className="display-serif text-[1.35rem] leading-[1.1] mt-1">
                {selectedNode.name}
              </h3>
              <div className="body-serif italic text-[color:var(--ink-soft)] text-[0.88rem] mt-0.5">
                {selectedNode.type} · {selectedNode.domain}
              </div>
              <div className="mt-3 font-mono text-[0.7rem] text-[color:var(--dust)]">
                status={selectedNode.status}
              </div>
              {selectedEdges.length > 0 && (
                <div className="mt-5">
                  <span className="eyebrow">Incident edges</span>
                  <ul className="mt-2 space-y-0.5">
                    {selectedEdges.map((e) => (
                      <li
                        key={e.id}
                        className="body-serif text-[0.85rem] leading-snug text-[color:var(--ink-soft)]"
                      >
                        <span className="font-mono text-[0.7rem] text-[color:var(--dust)] mr-1">
                          {e.source === selectedId ? "→" : "←"}
                        </span>
                        <span className="italic">{e.type.replaceAll("_", " ")}</span>
                        <span className="mx-1 text-[color:var(--dust)]">·</span>
                        <span>
                          {snapshot.nodes.find(
                            (n) =>
                              n.id ===
                              (e.source === selectedId ? e.target : e.source),
                          )?.name ?? "unknown"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <button
                type="button"
                className="press-btn press-btn--accent mt-5 w-full"
                onClick={() => {
                  graphRef.current?.focusFit(selectedId ?? null, 60);
                }}
              >
                Frame neighbourhood
              </button>
            </div>
          ) : (
            <div className="body-serif italic text-[0.9rem] leading-relaxed text-[color:var(--dust)]">
              Click any node for a close reading. Its type, its domain, its
              adjacent edges — rendered as a sidebar without the engine
              touching any of this prose.
            </div>
          )}

          <div className="rule my-6" />

          <div>
            <span className="eyebrow">Legend</span>
            <ul className="mt-3 space-y-1.5">
              {(legend?.node_types ?? []).map((entry) => (
                <li key={entry.type_key} className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5"
                    style={{
                      background: entry.color,
                      border: `1px solid ${entry.border_color}`,
                      borderRadius: entry.shape === "circle" ? "50%" : "2px",
                    }}
                  />
                  <span className="body-serif text-[0.88rem]">
                    {entry.type_key.replaceAll("_", " ")}
                  </span>
                  <span className="ml-auto font-mono text-[0.7rem] text-[color:var(--dust)]">
                    ×{entry.count}
                  </span>
                </li>
              ))}
            </ul>
            {(legend?.edge_types ?? []).length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {legend!.edge_types.map((entry) => {
                  const dash = entry.dash;
                  return (
                    <li key={entry.type_key} className="flex items-center gap-2">
                      <span
                        className="inline-block h-[2px] w-5"
                        style={{
                          borderTop:
                            dash && dash !== "solid"
                              ? `2px ${dash === "dotted" ? "dotted" : "dashed"} ${entry.color}`
                              : undefined,
                          backgroundColor:
                            !dash || dash === "solid" ? entry.color : "transparent",
                        }}
                      />
                      <span className="body-serif italic text-[0.82rem] text-[color:var(--ink-soft)]">
                        {entry.type_key.replaceAll("_", " ")}
                      </span>
                      <span className="ml-auto font-mono text-[0.7rem] text-[color:var(--dust)]">
                        ×{entry.count}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>
      </main>

      {/* ── Colophon ──────────────────────────────────────────────── */}
      <footer className="border-t border-[color:var(--rule)] px-6 py-6 md:px-10">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between">
          <span className="eyebrow">
            Set in Fraunces, Newsreader &amp; JetBrains Mono
          </span>
          <span className="eyebrow">
            ©&nbsp;2026 &nbsp;·&nbsp; MIT Licensed &nbsp;·&nbsp; v0.2.3
          </span>
        </div>
      </footer>
    </div>
  );
}
