// The playground's five generic scenarios. Each pairs a procedurally
// generated snapshot with GraphThemeOverrides that restyle the same engine,
// which is the point: one engine, five different-looking graphs.
import type {
  GraphSnapshot,
  GraphThemeOverrides,
  NodeTypeStyleOverride,
  EdgeTypeStyleOverride,
  Shape,
} from "@invariantcontinuum/graph/react";
import {
  generateCitations,
  generateCollab,
  generateInfra,
  generateKnowledge,
  generateServices,
} from "./lib/generate";

export interface Scenario {
  readonly slug: string;
  readonly name: string;
  readonly blurb: string;
  readonly snapshot: GraphSnapshot;
  readonly overrides: GraphThemeOverrides;
}

const GLASS = "rgba(15, 23, 42, 0.94)";
const LABEL = "#f8fafc";

function node(
  shape: Shape,
  borderColor: string,
  size: { w: number; h: number },
  extra: NodeTypeStyleOverride = {},
): NodeTypeStyleOverride {
  return {
    shape,
    color: GLASS,
    borderColor,
    borderWidth: 1.6,
    halfWidth: size.w,
    halfHeight: size.h,
    cornerRadius: 9,
    labelColor: LABEL,
    ...extra,
  };
}

function edge(
  color: string,
  style: EdgeTypeStyleOverride["style"] = "solid",
  width = 1.4,
): EdgeTypeStyleOverride {
  return { color, style, width, arrow: "triangle" };
}

const CARD = { w: 54, h: 20 };
const CHIP = { w: 34, h: 16 };
const DOTM = { w: 15, h: 15 };
const HUB = { w: 26, h: 24 };

export const SCENARIOS: readonly Scenario[] = [
  {
    slug: "knowledge",
    name: "Knowledge base",
    blurb: "Topics, notes, sources, and tags linked into one navigable map.",
    snapshot: generateKnowledge(),
    overrides: {
      nodeTypes: {
        topic: node("hexagon", "#22d3ee", HUB),
        note: node("roundrectangle", "#60a5fa", CARD),
        source: node("square", "#f59e0b", CHIP),
        tag: node("circle", "#a78bfa", DOTM),
      },
      edgeTypes: {
        links: edge("rgba(34, 211, 238, 0.55)"),
        cites: edge("rgba(245, 158, 11, 0.6)"),
        tagged: edge("rgba(167, 139, 250, 0.45)", "dotted", 1.1),
      },
    },
  },
  {
    slug: "services",
    name: "Service dependencies",
    blurb: "Gateways, services, stores, and queues in a call graph.",
    snapshot: generateServices(),
    overrides: {
      nodeTypes: {
        gateway: node("hexagon", "#60a5fa", HUB),
        service: node("roundrectangle", "#22d3ee", CARD),
        database: node("barrel", "#f59e0b", { w: 24, h: 22 }),
        cache: node("octagon", "#a78bfa", { w: 20, h: 18 }),
        queue: node("diamond", "#34d399", { w: 22, h: 20 }),
      },
      edgeTypes: {
        routes: edge("rgba(96, 165, 250, 0.6)"),
        calls: edge("rgba(34, 211, 238, 0.55)"),
        reads: edge("rgba(245, 158, 11, 0.55)"),
        publishes: edge("rgba(52, 211, 153, 0.55)", "dashed"),
      },
    },
  },
  {
    slug: "infra",
    name: "Infrastructure topology",
    blurb: "Regions containing zones, hosts, and workloads, plus replication links.",
    snapshot: generateInfra(),
    overrides: {
      nodeTypes: {
        region: node("octagon", "#60a5fa", { w: 30, h: 28 }),
        zone: node("hexagon", "#22d3ee", HUB),
        host: node("square", "#94a3b8", { w: 18, h: 18 }),
        workload: node("roundrectangle", "#34d399", { w: 40, h: 15 }),
      },
      edgeTypes: {
        contains: edge("rgba(148, 163, 184, 0.4)", "solid", 1.2),
        replicates: edge("rgba(167, 139, 250, 0.65)", "dashed", 1.6),
        routes: edge("rgba(34, 211, 238, 0.7)", "solid", 1.8),
      },
    },
  },
  {
    slug: "citations",
    name: "Citation network",
    blurb: "150 papers over three decades; influence accumulates on the early ones.",
    snapshot: generateCitations(),
    overrides: {
      nodeTypes: {
        seminal: node("diamond", "#f59e0b", { w: 24, h: 22 }),
        survey: node("hexagon", "#a78bfa", { w: 20, h: 18 }),
        paper: node("circle", "#38bdf8", DOTM),
      },
      edgeTypes: {
        cites: edge("rgba(56, 189, 248, 0.45)", "solid", 1.1),
        extends: edge("rgba(52, 211, 153, 0.6)"),
        disputes: edge("rgba(251, 113, 133, 0.75)", "dashed", 1.5),
      },
    },
  },
  {
    slug: "collab",
    name: "Collaboration graph",
    blurb: "People, teams, and projects: membership, ownership, and review flow.",
    snapshot: generateCollab(),
    overrides: {
      nodeTypes: {
        person: node("circle", "#22d3ee", { w: 16, h: 16 }),
        team: node("hexagon", "#a78bfa", HUB),
        project: node("roundrectangle", "#f59e0b", { w: 44, h: 18 }),
      },
      edgeTypes: {
        member: edge("rgba(34, 211, 238, 0.5)"),
        owns: edge("rgba(245, 158, 11, 0.6)"),
        contributes: edge("rgba(148, 163, 184, 0.45)", "solid", 1.1),
        reviews: edge("rgba(167, 139, 250, 0.55)", "dotted", 1.2),
      },
    },
  },
];

export function scenarioBySlug(slug: string): Scenario {
  return SCENARIOS.find((s) => s.slug === slug) ?? SCENARIOS[0];
}
