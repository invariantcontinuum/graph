import type { EdgeData, NodeData } from "./types";

/** One row of the details panel's connections list. */
export interface NodeConnection {
  edge: EdgeData;
  /** The node at the other end of the edge. */
  neighborId: string;
  /** "outgoing" when the inspected node is the edge source. */
  direction: "outgoing" | "incoming";
}

/**
 * Every edge touching `nodeId`, in snapshot order, with the direction
 * relative to the inspected node. Pure so hosts and the panel share one
 * derivation (and it can be unit tested without a browser).
 */
export function connectionsFor(
  nodeId: string,
  edges: readonly EdgeData[],
): NodeConnection[] {
  const out: NodeConnection[] = [];
  for (const edge of edges) {
    if (edge.source === nodeId && edge.target === nodeId) continue;
    if (edge.source === nodeId) {
      out.push({ edge, neighborId: edge.target, direction: "outgoing" });
    } else if (edge.target === nodeId) {
      out.push({ edge, neighborId: edge.source, direction: "incoming" });
    }
  }
  return out;
}

/** Resolve display names for connection neighbors, falling back to the id. */
export function neighborName(
  neighborId: string,
  nodesById: ReadonlyMap<string, NodeData>,
): string {
  return nodesById.get(neighborId)?.name ?? neighborId;
}

/** Render an arbitrary `NodeData.meta` value as compact display text. */
export function formatMetaValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
