// Procedural, domain-generic demo datasets. Everything is generated from a
// fixed seed: no external data, no implied integrations, nothing misleading.
import type {
  EdgeData,
  GraphSnapshot,
  NodeData,
} from "@invariantcontinuum/graph/react";
import { int, mulberry32, pick } from "./rand";

type NodeSeed = Omit<NodeData, "meta" | "domain" | "status"> & {
  domain?: string;
  status?: string;
  meta?: Record<string, unknown>;
};
type EdgeSeed = Omit<EdgeData, "id" | "label" | "weight"> & {
  label?: string;
  weight?: number;
};

export function snap(nodes: NodeSeed[], edges: EdgeSeed[]): GraphSnapshot {
  const seen = new Set<string>();
  const dedupedEdges = edges.filter((e) => {
    if (e.source === e.target) return false;
    const key = `${e.source}->${e.target}:${e.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return {
    nodes: nodes.map((n) => ({
      domain: "demo",
      status: "active",
      meta: {},
      ...n,
    })),
    edges: dedupedEdges.map((e, i) => ({
      id: `e${i}`,
      label: "",
      weight: 1,
      ...e,
    })),
    meta: {
      node_count: nodes.length,
      edge_count: dedupedEdges.length,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Hero: a clustered network using the engine's built-in node types,  */
/* so the default theme (zero overrides) is what the visitor sees.    */
/* ------------------------------------------------------------------ */

export function generateHero(): GraphSnapshot {
  const rng = mulberry32(20260706);
  const types = [
    "service", "source", "database", "cache", "data",
    "policy", "doc", "config", "script", "asset",
  ] as const;
  const clusters = 9;
  const perCluster = 46;
  const nodes: NodeSeed[] = [];
  const edges: EdgeSeed[] = [];

  const clusterKey = "abcdefghi";
  for (let c = 0; c < clusters; c++) {
    const hubId = `h${c}`;
    nodes.push({
      id: hubId,
      name: `core-${clusterKey[c]}`,
      type: pick(rng, ["service", "data", "source"]),
      community: c,
    });
    for (let i = 0; i < perCluster; i++) {
      const id = `n${c}-${i}`;
      const type = pick(rng, types);
      nodes.push({
        id,
        name: `${type}-${clusterKey[c]}${i}`,
        type,
        community: c,
      });
      // Preferential attachment inside the cluster.
      const target =
        i === 0 || rng() < 0.42
          ? hubId
          : `n${c}-${int(rng, 0, i - 1)}`;
      edges.push({ source: id, target, type: "depends" });
      if (rng() < 0.3) {
        edges.push({
          source: id,
          target: rng() < 0.5 ? hubId : `n${c}-${int(rng, 0, i - 1)}`,
          type: pick(rng, ["enforces", "why", "depends"]),
        });
      }
    }
  }
  // Sparse bridges between clusters keep it one connected organism.
  for (let c = 0; c < clusters; c++) {
    for (let k = 0; k < 3; k++) {
      edges.push({
        source: `h${c}`,
        target: `h${(c + k + 1) % clusters}`,
        type: "depends",
      });
    }
    edges.push({
      source: `n${c}-${int(rng, 0, perCluster - 1)}`,
      target: `n${(c + 1) % clusters}-${int(rng, 0, perCluster - 1)}`,
      type: "drift",
    });
  }
  return snap(nodes, edges);
}

/* ------------------------------------------------------------------ */
/* Scale stress test: clustered graphs from 1k to 20k nodes.          */
/* ------------------------------------------------------------------ */

export function generateScale(nodeCount: number): GraphSnapshot {
  const rng = mulberry32(97 + nodeCount);
  const types = ["service", "data", "doc", "config", "cache", "asset"] as const;
  const clusters = Math.max(8, Math.round(nodeCount / 320));
  const nodes: NodeSeed[] = new Array(nodeCount);
  const edges: EdgeSeed[] = [];
  const clusterMembers: number[][] = Array.from({ length: clusters }, () => []);

  for (let i = 0; i < nodeCount; i++) {
    const c = i % clusters;
    clusterMembers[c].push(i);
    const type = types[i % types.length];
    nodes[i] = {
      id: `s${i}`,
      name: `${type}-${i}`,
      type,
      community: c,
    };
  }
  for (let c = 0; c < clusters; c++) {
    const members = clusterMembers[c];
    for (let j = 1; j < members.length; j++) {
      // Preferential attachment: earlier members accumulate degree.
      const t = members[Math.floor(Math.pow(rng(), 2.2) * j)];
      edges.push({ source: `s${members[j]}`, target: `s${t}`, type: "depends" });
      if (rng() < 0.25) {
        const t2 = members[Math.floor(Math.pow(rng(), 2.2) * j)];
        edges.push({ source: `s${members[j]}`, target: `s${t2}`, type: "why" });
      }
    }
    // A few long-range bridges per cluster.
    for (let k = 0; k < 4; k++) {
      const other = clusterMembers[int(rng, 0, clusters - 1)];
      edges.push({
        source: `s${pick(rng, members)}`,
        target: `s${pick(rng, other)}`,
        type: "drift",
      });
    }
  }
  return snap(nodes, edges);
}

/* ------------------------------------------------------------------ */
/* Theming specimen: one small constellation with every built-in type */
/* visible, used by the theming section's light/dark/override demo.   */
/* ------------------------------------------------------------------ */

export function generateSpecimen(): GraphSnapshot {
  const rng = mulberry32(41);
  const ring = [
    "service", "source", "database", "cache",
    "data", "policy", "adr", "incident",
    "config", "script", "doc", "asset",
  ] as const;
  const nodes: NodeSeed[] = [
    { id: "core", name: "core", type: "service", community: 0 },
  ];
  const edges: EdgeSeed[] = [];
  ring.forEach((type, i) => {
    const id = `t${i}`;
    nodes.push({ id, name: type, type, community: 1 });
    edges.push({
      source: "core",
      target: id,
      type: i % 4 === 0 ? "enforces" : i % 3 === 0 ? "why" : "depends",
    });
    const satellites = int(rng, 1, 3);
    for (let sIdx = 0; sIdx < satellites; sIdx++) {
      const sid = `t${i}-${sIdx}`;
      nodes.push({ id: sid, name: `${type}-${sIdx}`, type, community: 1 });
      edges.push({ source: sid, target: id, type: "depends" });
    }
  });
  edges.push({ source: "t7", target: "t5", type: "violation" });
  edges.push({ source: "t2", target: "t9", type: "drift" });
  return snap(nodes, edges);
}

/* ------------------------------------------------------------------ */
/* Scenario generators (playground). All names below are invented,    */
/* generic stand-ins: no product, tool, or vendor is being depicted.  */
/* ------------------------------------------------------------------ */

const TOPICS = [
  "Consensus", "Vector clocks", "CRDTs", "Backpressure", "Bloom filters",
  "Merkle trees", "Sharding", "Write-ahead logs", "Gossip protocols",
  "Snapshot isolation", "Quorums", "Leader election", "Hash rings",
  "Log compaction", "Idempotency", "Clock skew",
];
const NOTE_LEADS = [
  "Why", "When", "How", "Rethinking", "Measuring", "Debugging", "Choosing",
];
const NOTE_TAILS = [
  "quorums overlap", "retries amplify load", "clocks drift", "caches lie",
  "logs converge", "partitions heal", "replicas disagree", "backfills stall",
  "batching helps", "fan-out hurts",
];
const SOURCES = [
  "Lamport 1978", "Fischer et al. 1985", "Brewer 2000", "DeCandia et al. 2007",
  "Ongaro & Ousterhout 2014", "Kleppmann 2017", "Shapiro et al. 2011",
  "Chandra & Toueg 1996", "Stonebraker 1986", "Dean & Ghemawat 2004",
];
const TAGS = ["storage", "networking", "theory", "operations", "modelling", "testing"];

export function generateKnowledge(): GraphSnapshot {
  const rng = mulberry32(7001);
  const nodes: NodeSeed[] = [];
  const edges: EdgeSeed[] = [];
  TOPICS.forEach((t, i) => nodes.push({ id: `topic${i}`, name: t, type: "topic" }));
  TAGS.forEach((t, i) => nodes.push({ id: `tag${i}`, name: t, type: "tag" }));
  SOURCES.forEach((s, i) => {
    nodes.push({ id: `src${i}`, name: s, type: "source" });
    edges.push({
      source: `topic${int(rng, 0, TOPICS.length - 1)}`,
      target: `src${i}`,
      type: "cites",
    });
  });
  for (let i = 0; i < 78; i++) {
    const id = `note${i}`;
    nodes.push({
      id,
      name: `${pick(rng, NOTE_LEADS)} ${pick(rng, NOTE_TAILS)}`,
      type: "note",
    });
    edges.push({ source: id, target: `topic${int(rng, 0, TOPICS.length - 1)}`, type: "links" });
    if (rng() < 0.55) {
      edges.push({ source: id, target: `topic${int(rng, 0, TOPICS.length - 1)}`, type: "links" });
    }
    if (rng() < 0.4) {
      edges.push({ source: id, target: `src${int(rng, 0, SOURCES.length - 1)}`, type: "cites" });
    }
    edges.push({ source: id, target: `tag${int(rng, 0, TAGS.length - 1)}`, type: "tagged" });
  }
  for (let i = 0; i < 14; i++) {
    edges.push({
      source: `topic${int(rng, 0, TOPICS.length - 1)}`,
      target: `topic${int(rng, 0, TOPICS.length - 1)}`,
      type: "links",
    });
  }
  return snap(nodes, edges);
}

const SVC_NAMES = [
  "auth", "billing", "search", "catalog", "orders", "payments", "profiles",
  "notify", "ingest", "reports", "sessions", "media", "pricing", "export",
];

export function generateServices(): GraphSnapshot {
  const rng = mulberry32(7002);
  const nodes: NodeSeed[] = [];
  const edges: EdgeSeed[] = [];
  nodes.push({ id: "gw0", name: "edge-gateway", type: "gateway" });
  nodes.push({ id: "gw1", name: "internal-gateway", type: "gateway" });
  SVC_NAMES.forEach((n, i) => {
    const id = `svc${i}`;
    nodes.push({ id, name: `${n}-service`, type: "service" });
    edges.push({ source: i % 3 === 0 ? "gw1" : "gw0", target: id, type: "routes" });
    if (rng() < 0.75) {
      nodes.push({ id: `db${i}`, name: `${n}-db`, type: "database" });
      edges.push({ source: id, target: `db${i}`, type: "reads" });
    }
    if (rng() < 0.45) {
      nodes.push({ id: `c${i}`, name: `${n}-cache`, type: "cache" });
      edges.push({ source: id, target: `c${i}`, type: "reads" });
    }
  });
  ["events", "jobs", "emails", "webhooks"].forEach((q, i) => {
    nodes.push({ id: `q${i}`, name: `${q}-queue`, type: "queue" });
  });
  for (let i = 0; i < SVC_NAMES.length; i++) {
    const calls = int(rng, 1, 3);
    for (let k = 0; k < calls; k++) {
      edges.push({
        source: `svc${i}`,
        target: `svc${int(rng, 0, SVC_NAMES.length - 1)}`,
        type: "calls",
      });
    }
    if (rng() < 0.6) {
      edges.push({ source: `svc${i}`, target: `q${int(rng, 0, 3)}`, type: "publishes" });
    }
    if (rng() < 0.35) {
      edges.push({ source: `q${int(rng, 0, 3)}`, target: `svc${i}`, type: "publishes" });
    }
  }
  return snap(nodes, edges);
}

export function generateInfra(): GraphSnapshot {
  const rng = mulberry32(7003);
  const nodes: NodeSeed[] = [];
  const edges: EdgeSeed[] = [];
  const regions = ["eu-west", "us-east", "ap-south"];
  regions.forEach((r, ri) => {
    nodes.push({ id: `r${ri}`, name: r, type: "region" });
    const zones = ri === 2 ? 2 : 3;
    for (let z = 0; z < zones; z++) {
      const zid = `r${ri}z${z}`;
      nodes.push({ id: zid, name: `${r}-${"abc"[z]}`, type: "zone" });
      edges.push({ source: `r${ri}`, target: zid, type: "contains" });
      const hosts = int(rng, 3, 5);
      for (let h = 0; h < hosts; h++) {
        const hid = `${zid}h${h}`;
        nodes.push({ id: hid, name: `host-${ri}${z}${h}`, type: "host" });
        edges.push({ source: zid, target: hid, type: "contains" });
        const pods = int(rng, 2, 5);
        for (let p = 0; p < pods; p++) {
          const pid = `${hid}p${p}`;
          nodes.push({
            id: pid,
            name: `${pick(rng, SVC_NAMES)}-${ri}${z}${h}${p}`,
            type: "workload",
          });
          edges.push({ source: hid, target: pid, type: "contains" });
        }
      }
    }
  });
  // Cross-region replication and routing links.
  for (let i = 0; i < 6; i++) {
    edges.push({
      source: `r${int(rng, 0, 2)}z${int(rng, 0, 1)}`,
      target: `r${int(rng, 0, 2)}z${int(rng, 0, 1)}`,
      type: "replicates",
    });
  }
  edges.push({ source: "r0", target: "r1", type: "routes" });
  edges.push({ source: "r1", target: "r2", type: "routes" });
  return snap(nodes, edges);
}

const PAPER_A = ["Distributed", "Incremental", "Adaptive", "Streaming", "Probabilistic", "Bounded", "Parallel"];
const PAPER_B = ["Consensus", "Layout", "Indexing", "Clustering", "Caching", "Sampling", "Scheduling"];
const PAPER_C = ["at Scale", "under Churn", "with Bounded Memory", "in Practice", "for Sparse Graphs"];

export function generateCitations(): GraphSnapshot {
  const rng = mulberry32(7004);
  const nodes: NodeSeed[] = [];
  const edges: EdgeSeed[] = [];
  const count = 150;
  for (let i = 0; i < count; i++) {
    const year = 1996 + Math.floor((i / count) * 30);
    const kind = i < 8 ? "seminal" : rng() < 0.14 ? "survey" : "paper";
    nodes.push({
      id: `p${i}`,
      name: `${pick(rng, PAPER_A)} ${pick(rng, PAPER_B)} ${pick(rng, PAPER_C)} (${year})`,
      type: kind,
      community: Math.floor(rng() * 5),
    });
    if (i === 0) continue;
    // Papers cite earlier work; seminal papers accumulate citations.
    const cites = int(rng, 1, 3);
    for (let k = 0; k < cites; k++) {
      const t = Math.floor(Math.pow(rng(), 2.6) * i);
      edges.push({ source: `p${i}`, target: `p${t}`, type: "cites" });
    }
    if (rng() < 0.2) {
      edges.push({ source: `p${i}`, target: `p${Math.floor(Math.pow(rng(), 2) * i)}`, type: "extends" });
    }
    if (rng() < 0.06) {
      edges.push({ source: `p${i}`, target: `p${Math.floor(rng() * i)}`, type: "disputes" });
    }
  }
  return snap(nodes, edges);
}

const PEOPLE = [
  "Amara Okafor", "Jonas Meier", "Priya Raghavan", "Tomás Herrera",
  "Yuki Tanaka", "Leila Haddad", "Marek Nowak", "Ifeoma Eze",
  "Sofia Lindqvist", "Daniel Kim", "Nadia Petrova", "Rafael Costa",
  "Astrid Bergman", "Kwame Mensah", "Elif Demir", "Hugo Fournier",
  "Zanele Dlamini", "Mateo Rossi", "Hana Kobayashi", "Omar Farouk",
  "Ingrid Halvorsen", "Diego Morales", "Aisha Bello", "Petr Svoboda",
  "Maya Sharma", "Lucas Weber", "Chioma Nwosu", "Emil Johansson",
];
const TEAMS = ["Platform", "Interfaces", "Data", "Reliability", "Security"];
const PROJECTS = [
  "Beacon", "Cascade", "Drift", "Ember", "Fathom",
  "Garnet", "Harbor", "Isobar", "Junction",
];

export function generateCollab(): GraphSnapshot {
  const rng = mulberry32(7005);
  const nodes: NodeSeed[] = [];
  const edges: EdgeSeed[] = [];
  TEAMS.forEach((t, i) => nodes.push({ id: `team${i}`, name: t, type: "team" }));
  PROJECTS.forEach((p, i) => {
    nodes.push({ id: `proj${i}`, name: p, type: "project" });
    edges.push({ source: `team${int(rng, 0, TEAMS.length - 1)}`, target: `proj${i}`, type: "owns" });
    if (rng() < 0.35) {
      edges.push({ source: `team${int(rng, 0, TEAMS.length - 1)}`, target: `proj${i}`, type: "owns" });
    }
  });
  PEOPLE.forEach((name, i) => {
    const id = `p${i}`;
    nodes.push({ id, name, type: "person" });
    edges.push({ source: id, target: `team${i % TEAMS.length}`, type: "member" });
    const works = int(rng, 1, 3);
    for (let k = 0; k < works; k++) {
      edges.push({
        source: id,
        target: `proj${int(rng, 0, PROJECTS.length - 1)}`,
        type: "contributes",
      });
    }
    if (rng() < 0.3) {
      edges.push({ source: id, target: `p${int(rng, 0, i)}`, type: "reviews" });
    }
  });
  return snap(nodes, edges);
}
