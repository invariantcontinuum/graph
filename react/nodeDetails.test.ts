import { describe, test, expect } from "vitest";
import {
  connectionsFor,
  formatMetaValue,
  neighborName,
} from "./nodeDetails";
import type { EdgeData, NodeData } from "./types";

const nodes: NodeData[] = [
  { id: "a", name: "alpha", type: "service", domain: "demo", status: "active", meta: {} },
  { id: "b", name: "beta", type: "data", domain: "demo", status: "active", meta: {} },
  { id: "c", name: "gamma", type: "doc", domain: "demo", status: "active", meta: {} },
];

const edges: EdgeData[] = [
  { id: "e1", source: "a", target: "b", type: "depends", label: "", weight: 1 },
  { id: "e2", source: "c", target: "a", type: "why", label: "", weight: 1 },
  { id: "e3", source: "b", target: "c", type: "drift", label: "", weight: 1 },
  { id: "e4", source: "a", target: "a", type: "self", label: "", weight: 1 },
];

describe("connectionsFor", () => {
  test("collects outgoing and incoming edges with direction", () => {
    const conns = connectionsFor("a", edges);
    expect(conns).toHaveLength(2);
    expect(conns[0]).toMatchObject({
      neighborId: "b",
      direction: "outgoing",
    });
    expect(conns[1]).toMatchObject({
      neighborId: "c",
      direction: "incoming",
    });
  });

  test("skips self-loops", () => {
    const conns = connectionsFor("a", edges);
    expect(conns.some((c) => c.edge.id === "e4")).toBe(false);
  });

  test("returns empty for an isolated node", () => {
    expect(connectionsFor("zzz", edges)).toEqual([]);
  });
});

describe("neighborName", () => {
  test("resolves the display name and falls back to the id", () => {
    const byId = new Map(nodes.map((n) => [n.id, n]));
    expect(neighborName("b", byId)).toBe("beta");
    expect(neighborName("missing", byId)).toBe("missing");
  });
});

describe("formatMetaValue", () => {
  test("renders primitives directly", () => {
    expect(formatMetaValue("x")).toBe("x");
    expect(formatMetaValue(42)).toBe("42");
    expect(formatMetaValue(false)).toBe("false");
  });

  test("renders nullish as a dash", () => {
    expect(formatMetaValue(null)).toBe("—");
    expect(formatMetaValue(undefined)).toBe("—");
  });

  test("serializes objects as JSON", () => {
    expect(formatMetaValue({ a: 1 })).toBe('{"a":1}');
    expect(formatMetaValue([1, 2])).toBe("[1,2]");
  });
});
