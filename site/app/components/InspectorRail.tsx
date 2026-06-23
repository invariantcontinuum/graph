import type { EdgeData, GraphHandle, GraphSnapshot, LegendSummary, NodeData } from "@invariantcontinuum/graph/react";
import { ConnectionList } from "./ConnectionList";
import { TypeCloud } from "./TypeCloud";

type InspectorRailProps = {
  selectedNode: NodeData | null;
  selectedEdges: EdgeData[];
  selectedEdgeCount: number;
  snapshot: GraphSnapshot;
  nodeTypes: Array<{ key: string; count: number }>;
  edgeTypes: Array<{ key: string; count: number }>;
  legend: LegendSummary | null;
  graphRef: React.RefObject<GraphHandle | null>;
  onClearSelection: () => void;
  onSelectNeighbor: (id: string) => void;
  onFrameSelected: () => void;
  onRemoveSelected: () => void;
  onFitAll: () => void;
  onAddProbe: () => void;
};

export function InspectorRail({
  selectedNode,
  selectedEdges,
  selectedEdgeCount,
  snapshot,
  nodeTypes,
  edgeTypes,
  legend,
  graphRef,
  onClearSelection,
  onSelectNeighbor,
  onFrameSelected,
  onRemoveSelected,
  onFitAll,
  onAddProbe,
}: InspectorRailProps) {
  return (
    <aside className="insight-rail" aria-label="Graph inspector">
      <section className="inspector-panel selected-panel" aria-label="Selected node details">
        <div className="panel-topline">
          <p>Selection</p>
          <strong title={selectedNode?.id ?? undefined}>
            {selectedNode ? selectedNode.id : "none"}
          </strong>
        </div>
        {selectedNode ? (
          <>
            <h2>{selectedNode.name}</h2>
            <dl className="node-facts">
              <div>
                <dt>Type</dt>
                <dd>{selectedNode.type}</dd>
              </div>
              <div>
                <dt>Domain</dt>
                <dd>{selectedNode.domain}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{selectedNode.status}</dd>
              </div>
              <div>
                <dt>Edges</dt>
                <dd>{selectedEdgeCount}</dd>
              </div>
            </dl>
            <div className="action-grid">
              <button type="button" title="Frame selected node" aria-label="Frame selected node" onClick={onFrameSelected}>
                Frame
              </button>
              <button
                type="button"
                title="Center selected node"
                aria-label="Center selected node"
                onClick={() => graphRef.current?.panToNode(selectedNode.id)}
              >
                Center
              </button>
              <button
                type="button"
                title="Clear selection (Escape)"
                aria-label="Clear selection (Escape)"
                aria-keyshortcuts="Escape"
                onClick={onClearSelection}
              >
                Clear
              </button>
              <button
                type="button"
                title="Remove selected node"
                aria-label="Remove selected node"
                className="danger-action"
                onClick={onRemoveSelected}
              >
                Remove
              </button>
            </div>
          </>
        ) : (
          <p className="empty-copy">Click a node to view details.</p>
        )}
      </section>

      <section className="inspector-panel" aria-label="Connected edges">
        <div className="panel-topline">
          <p>Connections</p>
          <strong>{selectedEdgeCount}</strong>
        </div>
        <ConnectionList
          edges={selectedEdges}
          selectedId={selectedNode?.id ?? null}
          nodes={snapshot.nodes}
          onSelect={onSelectNeighbor}
          emptyCopy={selectedNode ? "No connected edges." : undefined}
        />
      </section>

      <section className="inspector-panel" aria-label="Graph composition">
        <div className="panel-topline">
          <p>Composition</p>
          <strong>{legend?.edge_types.length ?? edgeTypes.length} edge types</strong>
        </div>
        <TypeCloud items={nodeTypes} label="Node type counts" />
        <TypeCloud items={edgeTypes} variant="muted" maxItems={8} label="Edge type counts" />
      </section>

      <section className="inspector-panel controls-panel" aria-label="Graph controls">
        <button type="button" title="Fit all nodes in view (F)" aria-label="Fit all nodes in view" aria-keyshortcuts="F" onClick={onFitAll}>
          Fit all
        </button>
        <button type="button" title="Add a new probe node" aria-label="Add probe node" onClick={onAddProbe}>
          Add probe
        </button>
      </section>
    </aside>
  );
}
