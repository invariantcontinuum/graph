import type {
  GraphSnapshot,
  GraphThemeOverrides,
} from "@invariantcontinuum/graph/react";

export interface Preset {
  readonly slug: string;
  readonly folio: string;
  readonly title: string;
  readonly subtitle: string;
  readonly essay: string;
  readonly snapshot: GraphSnapshot;
  readonly overrides: GraphThemeOverrides;
}

type RawNode = Omit<GraphSnapshot["nodes"][number], "meta"> & {
  meta?: Record<string, unknown>;
};
type RawEdge = Omit<GraphSnapshot["edges"][number], "id" | "label" | "weight"> & {
  id?: string;
  label?: string;
  weight?: number;
};

const LABEL_FONT = "Inter, -apple-system, BlinkMacSystemFont, sans-serif";
const MONO_FONT = "JetBrains Mono, ui-monospace, monospace";

function snap(nodes: RawNode[], edges: RawEdge[]): GraphSnapshot {
  return {
    nodes: nodes.map((node) => ({ ...node, meta: node.meta ?? {} })),
    edges: edges.map((edge, index) => ({
      ...edge,
      id: edge.id ?? `e${index + 1}`,
      label: edge.label ?? "",
      weight: edge.weight ?? 1,
    })),
    meta: {
      node_count: nodes.length,
      edge_count: edges.length,
      last_updated: "2026-05-06T00:00:00Z",
    },
  };
}

const gitRepository: Preset = {
  slug: "git-repository",
  folio: "GIT",
  title: "Tiny Repo",
  subtitle: "Commits, files, checks, and releases",
  essay:
    "A small Git repository graph showing how commits touch source files, tests, packages, and CI gates before a release is cut.",
  snapshot: snap(
    [
      { id: "main", name: "main", type: "branch", domain: "git", status: "protected", community: 1 },
      { id: "c1", name: "c1 init", type: "commit", domain: "git", status: "merged", community: 1, meta: { sha: "7a31f04" } },
      { id: "c2", name: "c2 graph api", type: "commit", domain: "git", status: "merged", community: 1, meta: { sha: "b91d22f" } },
      { id: "c3", name: "c3 renderer", type: "commit", domain: "git", status: "merged", community: 1, meta: { sha: "fd0a6cb" } },
      { id: "c4", name: "c4 release", type: "commit", domain: "git", status: "tagged", community: 1, meta: { sha: "9cb1e8a" } },
      { id: "pkg", name: "package.json", type: "manifest", domain: "repo", status: "tracked", community: 2 },
      { id: "core", name: "graph.ts", type: "source", domain: "repo", status: "tracked", community: 2 },
      { id: "scene", name: "GraphScene.tsx", type: "source", domain: "repo", status: "tracked", community: 2 },
      { id: "worker", name: "worker.ts", type: "source", domain: "repo", status: "tracked", community: 2 },
      { id: "tests", name: "graph.test.ts", type: "test", domain: "quality", status: "passing", community: 3 },
      { id: "lint", name: "lint", type: "check", domain: "quality", status: "passing", community: 3 },
      { id: "build", name: "build", type: "check", domain: "quality", status: "passing", community: 3 },
      { id: "release", name: "v0.2.3", type: "release", domain: "delivery", status: "published", community: 4 },
    ],
    [
      { source: "main", target: "c1", type: "points_to", label: "history" },
      { source: "c1", target: "c2", type: "parent", label: "parent" },
      { source: "c2", target: "c3", type: "parent", label: "parent" },
      { source: "c3", target: "c4", type: "parent", label: "parent" },
      { source: "c1", target: "pkg", type: "touches", label: "adds" },
      { source: "c2", target: "core", type: "touches", label: "edits" },
      { source: "c3", target: "scene", type: "touches", label: "edits" },
      { source: "c3", target: "worker", type: "touches", label: "edits" },
      { source: "scene", target: "worker", type: "imports", label: "uses" },
      { source: "core", target: "tests", type: "covered_by", label: "spec" },
      { source: "tests", target: "build", type: "gates", label: "required" },
      { source: "lint", target: "build", type: "gates", label: "required" },
      { source: "c4", target: "release", type: "tags", label: "tag" },
      { source: "build", target: "release", type: "publishes", label: "artifact" },
    ],
  ),
  overrides: {
    canvasBg: "#071014",
    gridLineColor: "#13252c",
    labelHalo: "#071014",
    selectionBorder: "#38f5b6",
    selectionFill: "rgba(56, 245, 182, 0.18)",
    hullFill: "rgba(56, 245, 182, 0.06)",
    hullStroke: "rgba(56, 245, 182, 0.26)",
    dimOpacity: 0.12,
    defaultNodeStyle: {
      color: "#0f1d24",
      borderColor: "#4f6b75",
      labelColor: "#ecfeff",
      labelFont: LABEL_FONT,
      labelSize: 11,
      labelWeight: 700,
    },
    defaultEdgeStyle: { color: "#5c7c88", width: 1.3, arrow: "triangle" },
    nodeTypes: {
      branch: { shape: "hexagon", color: "#102c36", borderColor: "#38f5b6", halfWidth: 54, halfHeight: 28 },
      commit: { shape: "circle", color: "#111c26", borderColor: "#64a8ff", halfWidth: 33, halfHeight: 33, labelFont: MONO_FONT, labelSize: 10 },
      manifest: { shape: "roundrectangle", color: "#241b33", borderColor: "#b98cff", halfWidth: 58, halfHeight: 22 },
      source: { shape: "roundrectangle", color: "#122238", borderColor: "#64a8ff", halfWidth: 66, halfHeight: 22 },
      test: { shape: "diamond", color: "#24220f", borderColor: "#ffd166", halfWidth: 58, halfHeight: 30 },
      check: { shape: "square", color: "#13271d", borderColor: "#38f5b6", halfWidth: 42, halfHeight: 24 },
      release: { shape: "octagon", color: "#31121f", borderColor: "#ff4d8d", halfWidth: 58, halfHeight: 28 },
    },
    edgeTypes: {
      points_to: { color: "#38f5b6", width: 2.2 },
      parent: { color: "#4f6b75", width: 1.4, style: "solid" },
      touches: { color: "#64a8ff", width: 1.8, style: "dashed" },
      imports: { color: "#b98cff", width: 1.6 },
      covered_by: { color: "#ffd166", width: 1.7, style: "short-dashed" },
      gates: { color: "#38f5b6", width: 1.9 },
      tags: { color: "#ff4d8d", width: 2 },
      publishes: { color: "#ff4d8d", width: 1.8, style: "dotted" },
    },
  },
};

const slackThread: Preset = {
  slug: "slack-thread",
  folio: "SLK",
  title: "Incident Thread",
  subtitle: "Messages, people, decisions, and links",
  essay:
    "A Slack incident thread where replies, mentions, runbook links, and final decisions become navigable graph structure.",
  snapshot: snap(
    [
      { id: "channel", name: "#ops-war-room", type: "channel", domain: "slack", status: "active", community: 1 },
      { id: "alex", name: "Alex", type: "person", domain: "team", status: "oncall", community: 2 },
      { id: "mira", name: "Mira", type: "person", domain: "team", status: "engaged", community: 2 },
      { id: "sam", name: "Sam", type: "person", domain: "team", status: "reviewing", community: 2 },
      { id: "bot", name: "Deploy Bot", type: "bot", domain: "automation", status: "active", community: 3 },
      { id: "m1", name: "checkout 500s", type: "message", domain: "thread", status: "root", community: 1, meta: { time: "09:42" } },
      { id: "m2", name: "rollback?", type: "message", domain: "thread", status: "question", community: 1, meta: { time: "09:44" } },
      { id: "m3", name: "cache miss spike", type: "message", domain: "thread", status: "evidence", community: 1, meta: { time: "09:47" } },
      { id: "m4", name: "hold rollback", type: "decision", domain: "thread", status: "accepted", community: 4, meta: { time: "09:51" } },
      { id: "m5", name: "purge sessions", type: "decision", domain: "thread", status: "accepted", community: 4, meta: { time: "09:54" } },
      { id: "dash", name: "Latency dashboard", type: "link", domain: "observability", status: "open", community: 3 },
      { id: "runbook", name: "Session runbook", type: "link", domain: "docs", status: "current", community: 3 },
      { id: "deploy", name: "deploy-8142", type: "event", domain: "delivery", status: "suspect", community: 3 },
    ],
    [
      { source: "alex", target: "m1", type: "posted", label: "opened" },
      { source: "channel", target: "m1", type: "contains", label: "thread" },
      { source: "mira", target: "m2", type: "posted", label: "reply" },
      { source: "sam", target: "m3", type: "posted", label: "reply" },
      { source: "bot", target: "deploy", type: "posted", label: "event" },
      { source: "m1", target: "m2", type: "reply", label: "reply" },
      { source: "m2", target: "m3", type: "reply", label: "evidence" },
      { source: "m3", target: "m4", type: "supports", label: "supports" },
      { source: "m4", target: "m5", type: "next_step", label: "then" },
      { source: "m3", target: "dash", type: "links", label: "dashboard" },
      { source: "m5", target: "runbook", type: "links", label: "runbook" },
      { source: "deploy", target: "m1", type: "mentioned_by", label: "suspect" },
      { source: "m2", target: "alex", type: "mentions", label: "@alex" },
      { source: "m4", target: "sam", type: "assigned_to", label: "owner" },
    ],
  ),
  overrides: {
    canvasBg: "#fbfbff",
    gridLineColor: "#e7e9f4",
    labelHalo: "#fbfbff",
    selectionBorder: "#5b5df7",
    selectionFill: "rgba(91, 93, 247, 0.14)",
    hullFill: "rgba(91, 93, 247, 0.05)",
    hullStroke: "rgba(91, 93, 247, 0.2)",
    dimOpacity: 0.16,
    defaultNodeStyle: {
      color: "#ffffff",
      borderColor: "#aeb6ce",
      labelColor: "#101426",
      labelFont: LABEL_FONT,
      labelSize: 11,
      labelWeight: 750,
    },
    defaultEdgeStyle: { color: "#7a8199", width: 1.25, arrow: "triangle" },
    nodeTypes: {
      channel: { shape: "hexagon", color: "#eef1ff", borderColor: "#5b5df7", halfWidth: 72, halfHeight: 28 },
      person: { shape: "circle", color: "#ffffff", borderColor: "#10a37f", halfWidth: 34, halfHeight: 34 },
      bot: { shape: "octagon", color: "#fff7e6", borderColor: "#f4a62a", halfWidth: 54, halfHeight: 26 },
      message: { shape: "roundrectangle", color: "#ffffff", borderColor: "#7a8199", halfWidth: 70, halfHeight: 24, labelSize: 10 },
      decision: { shape: "diamond", color: "#f0fff9", borderColor: "#10a37f", halfWidth: 64, halfHeight: 32 },
      link: { shape: "barrel", color: "#f8f4ff", borderColor: "#9a63ff", halfWidth: 70, halfHeight: 24 },
      event: { shape: "triangle", color: "#fff0f4", borderColor: "#ff4d8d", halfWidth: 48, halfHeight: 32 },
    },
    edgeTypes: {
      posted: { color: "#10a37f", width: 1.7 },
      contains: { color: "#5b5df7", width: 1.7 },
      reply: { color: "#7a8199", width: 1.4 },
      supports: { color: "#10a37f", width: 2 },
      next_step: { color: "#5b5df7", width: 2 },
      links: { color: "#9a63ff", width: 1.7, style: "dashed" },
      mentioned_by: { color: "#ff4d8d", width: 1.8, style: "short-dashed" },
      mentions: { color: "#f4a62a", width: 1.5, style: "dotted" },
      assigned_to: { color: "#10a37f", width: 1.6, style: "dashed" },
    },
  },
};

const confluenceDocs: Preset = {
  slug: "confluence-docs",
  folio: "DOC",
  title: "Docs Mesh",
  subtitle: "Confluence pages, owners, ADRs, and runbooks",
  essay:
    "A Confluence knowledge graph showing how onboarding pages, ADRs, API docs, and runbooks cite each other and expose ownership gaps.",
  snapshot: snap(
    [
      { id: "space", name: "Platform Space", type: "space", domain: "confluence", status: "active", community: 1 },
      { id: "home", name: "Team Home", type: "page", domain: "confluence", status: "current", community: 1 },
      { id: "onboard", name: "Onboarding", type: "page", domain: "confluence", status: "current", community: 1 },
      { id: "adr1", name: "ADR-014 Events", type: "adr", domain: "architecture", status: "accepted", community: 2 },
      { id: "adr2", name: "ADR-018 Graph", type: "adr", domain: "architecture", status: "accepted", community: 2 },
      { id: "api", name: "API Contract", type: "spec", domain: "engineering", status: "current", community: 3 },
      { id: "schema", name: "Event Schema", type: "spec", domain: "engineering", status: "current", community: 3 },
      { id: "runbook", name: "Replay Runbook", type: "runbook", domain: "operations", status: "current", community: 4 },
      { id: "retro", name: "Incident Retro", type: "retro", domain: "operations", status: "stale", community: 4 },
      { id: "owner1", name: "Nadia", type: "owner", domain: "people", status: "active", community: 5 },
      { id: "owner2", name: "Priya", type: "owner", domain: "people", status: "active", community: 5 },
      { id: "gap", name: "Untended FAQ", type: "page", domain: "confluence", status: "stale", community: 1 },
    ],
    [
      { source: "space", target: "home", type: "contains", label: "root" },
      { source: "home", target: "onboard", type: "links_to", label: "start here" },
      { source: "onboard", target: "api", type: "links_to", label: "api" },
      { source: "api", target: "schema", type: "defines", label: "schema" },
      { source: "adr1", target: "schema", type: "decides", label: "event shape" },
      { source: "adr2", target: "api", type: "decides", label: "graph api" },
      { source: "runbook", target: "schema", type: "references", label: "payload" },
      { source: "retro", target: "runbook", type: "updates", label: "action item" },
      { source: "owner1", target: "adr1", type: "owns", label: "owner" },
      { source: "owner1", target: "api", type: "owns", label: "owner" },
      { source: "owner2", target: "runbook", type: "owns", label: "owner" },
      { source: "gap", target: "home", type: "links_to", label: "linked" },
      { source: "gap", target: "retro", type: "stale_after", label: "stale" },
    ],
  ),
  overrides: {
    canvasBg: "#f5f7fb",
    gridLineColor: "#dde4f2",
    labelHalo: "#f5f7fb",
    selectionBorder: "#246bfe",
    selectionFill: "rgba(36, 107, 254, 0.13)",
    hullFill: "rgba(36, 107, 254, 0.05)",
    hullStroke: "rgba(36, 107, 254, 0.2)",
    dimOpacity: 0.15,
    defaultNodeStyle: {
      color: "#ffffff",
      borderColor: "#9aa8c2",
      labelColor: "#111827",
      labelFont: LABEL_FONT,
      labelSize: 11,
      labelWeight: 750,
    },
    defaultEdgeStyle: { color: "#74839b", width: 1.3, arrow: "triangle" },
    nodeTypes: {
      space: { shape: "hexagon", color: "#e8efff", borderColor: "#246bfe", halfWidth: 70, halfHeight: 30 },
      page: { shape: "roundrectangle", color: "#ffffff", borderColor: "#9aa8c2", halfWidth: 70, halfHeight: 24 },
      adr: { shape: "diamond", color: "#f1f0ff", borderColor: "#725cff", halfWidth: 58, halfHeight: 32 },
      spec: { shape: "square", color: "#ecfeff", borderColor: "#0891b2", halfWidth: 54, halfHeight: 26 },
      runbook: { shape: "octagon", color: "#f0fdf4", borderColor: "#16a34a", halfWidth: 66, halfHeight: 28 },
      retro: { shape: "triangle", color: "#fff7ed", borderColor: "#f97316", halfWidth: 58, halfHeight: 34 },
      owner: { shape: "circle", color: "#ffffff", borderColor: "#111827", halfWidth: 34, halfHeight: 34 },
    },
    edgeTypes: {
      contains: { color: "#246bfe", width: 1.8 },
      links_to: { color: "#74839b", width: 1.4 },
      defines: { color: "#0891b2", width: 1.8 },
      decides: { color: "#725cff", width: 2 },
      references: { color: "#16a34a", width: 1.7, style: "dashed" },
      updates: { color: "#f97316", width: 1.8, style: "short-dashed" },
      owns: { color: "#111827", width: 1.5, style: "dotted" },
      stale_after: { color: "#ef4444", width: 2, style: "dashed" },
    },
  },
};

const jiraBoard: Preset = {
  slug: "jira-board",
  folio: "JRA",
  title: "Sprint Board",
  subtitle: "Epics, stories, tasks, bugs, and blockers",
  essay:
    "A Jira kanban board converted into graph form so product scope, engineering tasks, blockers, owners, and sprint risk are visible together.",
  snapshot: snap(
    [
      { id: "board", name: "Platform Sprint", type: "board", domain: "jira", status: "active", community: 1 },
      { id: "epic", name: "Graph Importer", type: "epic", domain: "product", status: "in_progress", community: 2 },
      { id: "story1", name: "Upload JSON", type: "story", domain: "product", status: "done", community: 2 },
      { id: "story2", name: "Preview Diff", type: "story", domain: "product", status: "in_review", community: 2 },
      { id: "story3", name: "Undo Import", type: "story", domain: "product", status: "blocked", community: 2 },
      { id: "task1", name: "Parser", type: "task", domain: "engineering", status: "done", community: 3 },
      { id: "task2", name: "Diff Engine", type: "task", domain: "engineering", status: "in_progress", community: 3 },
      { id: "task3", name: "Command Stack", type: "task", domain: "engineering", status: "blocked", community: 3 },
      { id: "bug1", name: "Cycles Crash", type: "bug", domain: "quality", status: "open", community: 4 },
      { id: "qa", name: "QA Matrix", type: "test", domain: "quality", status: "planned", community: 4 },
      { id: "sprint", name: "Sprint 18", type: "sprint", domain: "delivery", status: "current", community: 1 },
      { id: "ana", name: "Ana", type: "owner", domain: "people", status: "assigned", community: 5 },
      { id: "leo", name: "Leo", type: "owner", domain: "people", status: "assigned", community: 5 },
      { id: "risk", name: "Ship Risk", type: "risk", domain: "delivery", status: "elevated", community: 4 },
    ],
    [
      { source: "board", target: "sprint", type: "tracks", label: "current" },
      { source: "sprint", target: "epic", type: "contains", label: "scope" },
      { source: "epic", target: "story1", type: "contains", label: "story" },
      { source: "epic", target: "story2", type: "contains", label: "story" },
      { source: "epic", target: "story3", type: "contains", label: "story" },
      { source: "story1", target: "task1", type: "implemented_by", label: "task" },
      { source: "story2", target: "task2", type: "implemented_by", label: "task" },
      { source: "story3", target: "task3", type: "implemented_by", label: "task" },
      { source: "bug1", target: "task2", type: "blocks", label: "blocks" },
      { source: "task3", target: "risk", type: "raises", label: "risk" },
      { source: "qa", target: "story2", type: "verifies", label: "qa" },
      { source: "qa", target: "story3", type: "verifies", label: "qa" },
      { source: "ana", target: "story2", type: "owns", label: "owner" },
      { source: "leo", target: "task3", type: "owns", label: "owner" },
      { source: "risk", target: "sprint", type: "threatens", label: "timeline" },
    ],
  ),
  overrides: {
    canvasBg: "#0b1020",
    gridLineColor: "#1b2747",
    labelHalo: "#0b1020",
    selectionBorder: "#67e8f9",
    selectionFill: "rgba(103, 232, 249, 0.16)",
    hullFill: "rgba(103, 232, 249, 0.06)",
    hullStroke: "rgba(103, 232, 249, 0.22)",
    dimOpacity: 0.12,
    defaultNodeStyle: {
      color: "#111a2f",
      borderColor: "#64748b",
      labelColor: "#f8fafc",
      labelFont: LABEL_FONT,
      labelSize: 11,
      labelWeight: 750,
    },
    defaultEdgeStyle: { color: "#7686a8", width: 1.3, arrow: "triangle" },
    nodeTypes: {
      board: { shape: "hexagon", color: "#16213d", borderColor: "#67e8f9", halfWidth: 70, halfHeight: 30 },
      sprint: { shape: "octagon", color: "#18213a", borderColor: "#38bdf8", halfWidth: 58, halfHeight: 28 },
      epic: { shape: "diamond", color: "#2b1645", borderColor: "#c084fc", halfWidth: 64, halfHeight: 34 },
      story: { shape: "roundrectangle", color: "#10293a", borderColor: "#38bdf8", halfWidth: 66, halfHeight: 24 },
      task: { shape: "square", color: "#102a22", borderColor: "#34d399", halfWidth: 52, halfHeight: 26 },
      bug: { shape: "triangle", color: "#32131c", borderColor: "#fb7185", halfWidth: 52, halfHeight: 34 },
      test: { shape: "barrel", color: "#2d230f", borderColor: "#fbbf24", halfWidth: 58, halfHeight: 26 },
      owner: { shape: "circle", color: "#172033", borderColor: "#f8fafc", halfWidth: 32, halfHeight: 32 },
      risk: { shape: "diamond", color: "#32131c", borderColor: "#fb7185", halfWidth: 58, halfHeight: 32 },
    },
    edgeTypes: {
      tracks: { color: "#67e8f9", width: 1.9 },
      contains: { color: "#c084fc", width: 1.7 },
      implemented_by: { color: "#34d399", width: 1.7 },
      blocks: { color: "#fb7185", width: 2.3, style: "dashed" },
      raises: { color: "#fb7185", width: 2 },
      verifies: { color: "#fbbf24", width: 1.7, style: "short-dashed" },
      owns: { color: "#f8fafc", width: 1.3, style: "dotted" },
      threatens: { color: "#fb7185", width: 2.2 },
    },
  },
};

const serviceLogs: Preset = {
  slug: "service-logs",
  folio: "LOG",
  title: "Trace Storm",
  subtitle: "Logs, services, traces, deploys, and alerts",
  essay:
    "A cross-service log graph that connects trace IDs, deploy events, queues, databases, and alerts to explain why errors fan out.",
  snapshot: snap(
    [
      { id: "trace", name: "trace 8f21", type: "trace", domain: "observability", status: "hot", community: 1 },
      { id: "gateway", name: "gateway", type: "service", domain: "edge", status: "warning", community: 2 },
      { id: "auth", name: "auth", type: "service", domain: "identity", status: "healthy", community: 2 },
      { id: "billing", name: "billing", type: "service", domain: "payments", status: "critical", community: 2 },
      { id: "ledger", name: "ledger-db", type: "database", domain: "storage", status: "slow", community: 3 },
      { id: "queue", name: "invoice-queue", type: "queue", domain: "messaging", status: "backlog", community: 3 },
      { id: "worker", name: "invoice-worker", type: "service", domain: "payments", status: "degraded", community: 2 },
      { id: "deploy", name: "deploy 2026.05.06", type: "deploy", domain: "delivery", status: "suspect", community: 4 },
      { id: "log1", name: "401 spike", type: "log", domain: "logs", status: "warning", community: 5 },
      { id: "log2", name: "timeout", type: "log", domain: "logs", status: "error", community: 5 },
      { id: "log3", name: "retry flood", type: "log", domain: "logs", status: "error", community: 5 },
      { id: "alert", name: "SLO burn", type: "alert", domain: "pager", status: "firing", community: 6 },
      { id: "dashboard", name: "Golden Signals", type: "dashboard", domain: "observability", status: "open", community: 6 },
      { id: "stripe", name: "Stripe API", type: "external", domain: "vendor", status: "healthy", community: 7 },
    ],
    [
      { source: "trace", target: "gateway", type: "passes_through", label: "span" },
      { source: "gateway", target: "auth", type: "calls", label: "token" },
      { source: "gateway", target: "billing", type: "calls", label: "charge" },
      { source: "billing", target: "ledger", type: "writes", label: "ledger" },
      { source: "billing", target: "queue", type: "enqueues", label: "invoice" },
      { source: "queue", target: "worker", type: "feeds", label: "jobs" },
      { source: "worker", target: "stripe", type: "calls", label: "capture" },
      { source: "deploy", target: "billing", type: "changed", label: "new build" },
      { source: "gateway", target: "log1", type: "emits", label: "401" },
      { source: "billing", target: "log2", type: "emits", label: "timeout" },
      { source: "worker", target: "log3", type: "emits", label: "retry" },
      { source: "log2", target: "alert", type: "triggers", label: "burn" },
      { source: "log3", target: "alert", type: "triggers", label: "burn" },
      { source: "dashboard", target: "trace", type: "correlates", label: "trace id" },
      { source: "deploy", target: "log2", type: "precedes", label: "5m before" },
      { source: "ledger", target: "log2", type: "correlates", label: "slow query" },
    ],
  ),
  overrides: {
    canvasBg: "#050816",
    gridLineColor: "#151a34",
    labelHalo: "#050816",
    selectionBorder: "#00e5ff",
    selectionFill: "rgba(0, 229, 255, 0.18)",
    hullFill: "rgba(0, 229, 255, 0.06)",
    hullStroke: "rgba(0, 229, 255, 0.24)",
    dimOpacity: 0.1,
    defaultNodeStyle: {
      color: "#0f172a",
      borderColor: "#64748b",
      labelColor: "#f8fafc",
      labelFont: LABEL_FONT,
      labelSize: 10,
      labelWeight: 750,
    },
    defaultEdgeStyle: { color: "#64748b", width: 1.35, arrow: "triangle" },
    nodeTypes: {
      trace: { shape: "hexagon", color: "#062c36", borderColor: "#00e5ff", halfWidth: 58, halfHeight: 30 },
      service: { shape: "roundrectangle", color: "#101a33", borderColor: "#60a5fa", halfWidth: 66, halfHeight: 24 },
      database: { shape: "barrel", color: "#201a0c", borderColor: "#f59e0b", halfWidth: 62, halfHeight: 28 },
      queue: { shape: "octagon", color: "#1a1531", borderColor: "#a78bfa", halfWidth: 66, halfHeight: 28 },
      deploy: { shape: "diamond", color: "#27142a", borderColor: "#f472b6", halfWidth: 66, halfHeight: 34 },
      log: { shape: "square", color: "#2b1018", borderColor: "#fb7185", halfWidth: 54, halfHeight: 26, labelFont: MONO_FONT },
      alert: { shape: "triangle", color: "#35150b", borderColor: "#fb923c", halfWidth: 58, halfHeight: 36 },
      dashboard: { shape: "roundrectangle", color: "#101f19", borderColor: "#34d399", halfWidth: 72, halfHeight: 24 },
      external: { shape: "circle", color: "#111827", borderColor: "#e5e7eb", halfWidth: 36, halfHeight: 36 },
    },
    edgeTypes: {
      passes_through: { color: "#00e5ff", width: 2 },
      calls: { color: "#60a5fa", width: 1.7 },
      writes: { color: "#f59e0b", width: 1.8 },
      enqueues: { color: "#a78bfa", width: 1.8 },
      feeds: { color: "#a78bfa", width: 1.5, style: "dashed" },
      changed: { color: "#f472b6", width: 2.2, style: "short-dashed" },
      emits: { color: "#fb7185", width: 1.6, style: "dotted" },
      triggers: { color: "#fb923c", width: 2.2 },
      correlates: { color: "#34d399", width: 1.7, style: "dashed" },
      precedes: { color: "#f472b6", width: 1.8 },
    },
  },
};

export const PRESETS: readonly Preset[] = [
  gitRepository,
  slackThread,
  confluenceDocs,
  jiraBoard,
  serviceLogs,
] as const;

export function presetBySlug(slug: string): Preset {
  return PRESETS.find((preset) => preset.slug === slug) ?? PRESETS[0];
}
