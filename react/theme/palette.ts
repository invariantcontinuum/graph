// Graph theme color tokens. Two palettes, identical key shape, so TypeScript
// and the runtime test enforce theme-inversion exhaustiveness.
//
export const NODE_TYPES = [
  "service", "source", "database", "cache", "data",
  "policy", "adr", "incident", "external",
  "config", "script", "doc", "asset",
] as const;
export type NodeType = (typeof NODE_TYPES)[number];

export const EDGE_TYPES = [
  "depends", "depends_on", "violation", "enforces", "why", "drift",
] as const;
export type EdgeType = (typeof EDGE_TYPES)[number];

export interface EdgeAccent { line: string; arrow: string; }

export interface Palette {
  canvasBg: string;
  gridLine: string;
  nodeGlassFill: string;
  nodeDefaultBorder: string;
  labelColor: string;
  labelHalo: string;
  selection: string;    // focused-node border + focused-edge accent
  dimText: string;
  edgeDefault: string;
  edgeDefaultArrow: string;
  hullFill: string;
  hullStroke: string;
  typeBorders: Record<NodeType, string>;
  edgeAccents: Record<EdgeType, EdgeAccent>;
}

export const DARK: Palette = {
  canvasBg:          "#070a12",
  gridLine:          "rgba(148, 163, 184, 0.13)",
  nodeGlassFill:     "rgba(15, 23, 42, 0.94)",
  nodeDefaultBorder: "rgba(148, 163, 184, 0.72)",
  labelColor:        "#f8fafc",
  labelHalo:         "rgba(7, 10, 18, 0.96)",
  selection:         "#22d3ee",
  dimText:           "rgba(226, 232, 240, 0.68)",
  edgeDefault:       "rgba(148, 163, 184, 0.48)",
  edgeDefaultArrow:  "rgba(226, 232, 240, 0.72)",
  hullFill:          "rgba(34, 211, 238, 0.07)",
  hullStroke:        "rgba(34, 211, 238, 0.32)",
  typeBorders: {
    service:  "#22d3ee", source:   "#60a5fa",
    database: "#f59e0b", cache:    "#a78bfa",
    data:     "#38bdf8", policy:   "#facc15",
    adr:      "#c084fc", incident: "#fb7185",
    external: "#cbd5e1", config:   "#34d399",
    script:   "#fbbf24", doc:      "#2dd4bf",
    asset:    "#94a3b8",
  },
  edgeAccents: {
    depends:    { line: "rgba(34, 211, 238, 0.72)", arrow: "rgba(34, 211, 238, 0.95)" },
    depends_on: { line: "rgba(34, 211, 238, 0.72)", arrow: "rgba(34, 211, 238, 0.95)" },
    violation:  { line: "rgba(251, 113, 133, 0.88)", arrow: "#fb7185" },
    enforces:   { line: "rgba(52, 211, 153, 0.76)", arrow: "rgba(52, 211, 153, 0.96)" },
    why:        { line: "rgba(250, 204, 21, 0.78)", arrow: "rgba(250, 204, 21, 0.98)" },
    drift:      { line: "rgba(244, 114, 182, 0.58)", arrow: "rgba(244, 114, 182, 0.84)" },
  },
};

export const LIGHT: Palette = {
  canvasBg:          "#f8fafc",
  gridLine:          "rgba(100, 116, 139, 0.16)",
  nodeGlassFill:     "rgba(255, 255, 255, 0.96)",
  nodeDefaultBorder: "rgba(71, 85, 105, 0.62)",
  labelColor:        "#0f172a",
  labelHalo:         "rgba(255, 255, 255, 0.96)",
  selection:         "#2563eb",
  dimText:           "rgba(51, 65, 85, 0.58)",
  edgeDefault:       "rgba(51, 65, 85, 0.52)",
  edgeDefaultArrow:  "rgba(51, 65, 85, 0.76)",
  hullFill:          "rgba(37, 99, 235, 0.06)",
  hullStroke:        "rgba(37, 99, 235, 0.28)",
  typeBorders: {
    service:  "#0891b2", source:   "#2563eb",
    database: "#d97706", cache:    "#7c3aed",
    data:     "#0284c7", policy:   "#ca8a04",
    adr:      "#7c3aed", incident: "#e11d48",
    external: "#475569", config:   "#059669",
    script:   "#d97706", doc:      "#0f766e",
    asset:    "#64748b",
  },
  edgeAccents: {
    depends:    { line: "rgba(8, 145, 178, 0.72)",   arrow: "rgba(8, 145, 178, 0.92)" },
    depends_on: { line: "rgba(8, 145, 178, 0.72)",   arrow: "rgba(8, 145, 178, 0.92)" },
    violation:  { line: "#e11d48",                   arrow: "#e11d48" },
    enforces:   { line: "rgba(5, 150, 105, 0.74)",  arrow: "rgba(5, 150, 105, 0.92)" },
    why:        { line: "rgba(202, 138, 4, 0.76)",  arrow: "rgba(202, 138, 4, 0.92)" },
    drift:      { line: "rgba(219, 39, 119, 0.48)", arrow: "rgba(219, 39, 119, 0.72)" },
  },
};
