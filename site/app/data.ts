import { GraphSnapshot } from "@invariantcontinuum/graph/react";

export const sampleSnapshot: GraphSnapshot = {
  nodes: [
    { id: "s1", name: "User Service", type: "service", domain: "auth", status: "healthy", meta: {} },
    { id: "s2", name: "Auth API", type: "service", domain: "auth", status: "healthy", meta: {} },
    { id: "db1", name: "Users DB", type: "database", domain: "storage", status: "healthy", meta: {} },
    { id: "c1", name: "Session Cache", type: "cache", domain: "storage", status: "warning", meta: {} },
    { id: "src1", name: "GitHub Repo", type: "source", domain: "vcs", status: "healthy", meta: {} },
    { id: "ext1", name: "Stripe API", type: "external", domain: "payments", status: "healthy", meta: {} },
    { id: "adr1", name: "ADR-001", type: "adr", domain: "docs", status: "healthy", meta: {} },
    { id: "pol1", name: "Auth Policy", type: "policy", domain: "security", status: "violation", meta: {} },
    { id: "inc1", name: "Latency Spike", type: "incident", domain: "ops", status: "critical", meta: {} },
    { id: "db2", name: "Metrics Store", type: "database", domain: "ops", status: "healthy", meta: {} },
  ],
  edges: [
    { id: "e1", source: "s1", target: "s2", type: "depends", label: "calls", weight: 1 },
    { id: "e2", source: "s2", target: "db1", type: "depends", label: "queries", weight: 1 },
    { id: "e3", source: "s2", target: "c1", type: "depends", label: "caches", weight: 1 },
    { id: "e4", source: "s1", target: "ext1", type: "depends", label: "pays", weight: 1 },
    { id: "e5", source: "s1", target: "src1", type: "depends_on", label: "hosted on", weight: 1 },
    { id: "e6", source: "s1", target: "adr1", type: "why", label: "documented in", weight: 1 },
    { id: "e7", source: "s1", target: "pol1", type: "violation", label: "breaks", weight: 1 },
    { id: "e8", source: "inc1", target: "s1", type: "why", label: "affects", weight: 1 },
    { id: "e9", source: "s1", target: "db2", type: "depends", label: "reports", weight: 1 },
  ],
  meta: {
    node_count: 10,
    edge_count: 9,
    last_updated: new Date().toISOString(),
  },
};
