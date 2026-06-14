import type { EdgeData, GraphSnapshot } from "@invariantcontinuum/graph/react";

type ConnectionListProps = {
  edges: EdgeData[];
  selectedId: string | null;
  nodes: GraphSnapshot["nodes"];
  onSelect: (id: string) => void;
  className?: string;
  emptyCopy?: string;
};

function compactLabel(value: string): string {
  return value.replaceAll("_", " ");
}

export function ConnectionList({
  edges,
  selectedId,
  nodes,
  onSelect,
  className = "",
  emptyCopy = "Select a node to view connections.",
}: ConnectionListProps) {
  if (edges.length === 0) {
    return <p className="empty-copy">{emptyCopy}</p>;
  }

  return (
    <ul className={`connection-list ${className}`.trim()} aria-label="Node connections">
      {edges.map((edge) => {
        const neighborId = edge.source === selectedId ? edge.target : edge.source;
        const neighbor = nodes.find((node) => node.id === neighborId);
        const neighborName = neighbor?.name ?? neighborId;
        return (
          <li key={edge.id}>
            <span title={edge.type}>{compactLabel(edge.type)}</span>
            <button
              type="button"
              title={neighborName}
              aria-label={`Select neighbor ${neighborName}`}
              onClick={() => onSelect(neighborId)}
            >
              {neighborName}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
