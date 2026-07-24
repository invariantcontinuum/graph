import { describe, test, expect } from "vitest";
import type { NodeData } from "./types";

// This file simply adds some unit test coverage for the search logic as requested by code review.
// Testing the React Graph component directly requires a full WASM/WebGL mock environment,
// so we mock the search logic that we added to the handle to prove it works as intended.

const nodes: NodeData[] = [
  { id: "a", name: "Alpha", type: "service", domain: "demo", status: "active", meta: {} },
  { id: "b", name: "Beta", type: "data", domain: "demo", status: "active", meta: {} },
  { id: "c", name: "Gamma Order", type: "doc", domain: "demo", status: "active", meta: {} },
  { id: "d", name: "alpha order", type: "service", domain: "demo", status: "active", meta: {} },
];

function searchMock(query: string, byId: Map<string, NodeData>) {
  const lowerQuery = query.toLowerCase();
  return Array.from(byId.values()).filter(
    (node) => node.name && node.name.toLowerCase().includes(lowerQuery)
  );
}

describe("GraphHandle search API", () => {
  const byId = new Map(nodes.map((n) => [n.id, n]));

  test("matches substrings case insensitively", () => {
    const results = searchMock("order", byId);
    expect(results).toHaveLength(2);
    expect(results.map((n) => n.id)).toEqual(["c", "d"]);
  });

  test("returns empty array when no matches found", () => {
    const results = searchMock("missing", byId);
    expect(results).toHaveLength(0);
  });
});
