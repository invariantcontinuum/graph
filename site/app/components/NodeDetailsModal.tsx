import { useEffect, useRef } from "react";
import type { EdgeData, GraphHandle, GraphSnapshot, NodeData } from "@invariantcontinuum/graph/react";
import { ConnectionList } from "./ConnectionList";

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

type NodeDetailsModalProps = {
  node: NodeData;
  edges: EdgeData[];
  snapshot: GraphSnapshot;
  metaEntries: Array<[string, unknown]>;
  graphRef: React.RefObject<GraphHandle | null>;
  onClose: () => void;
  onSelectNeighbor: (id: string) => void;
  onFrameSelected: () => void;
};

export function NodeDetailsModal({
  node,
  edges,
  snapshot,
  metaEntries,
  graphRef,
  onClose,
  onSelectNeighbor,
  onFrameSelected,
}: NodeDetailsModalProps) {
  const modalRef = useRef<HTMLElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement;
    modalRef.current?.focus();
    return () => previousFocus.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
      if (event.key === "Tab") {
        const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="details-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        ref={modalRef}
        className="node-details-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="node-details-title"
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="details-header">
          <div>
            <p>Node record</p>
            <h2 id="node-details-title">{node.name}</h2>
            <span>{node.id}</span>
          </div>
          <button
            type="button"
            className="modal-close"
            aria-label="Close node details"
            title="Keyboard shortcut: Escape"
            aria-keyshortcuts="Escape"
            onClick={onClose}
          >
            Close
          </button>
        </header>

        <dl className="details-grid">
          <div>
            <dt>Type</dt>
            <dd>{node.type}</dd>
          </div>
          <div>
            <dt>Domain</dt>
            <dd>{node.domain}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{node.status}</dd>
          </div>
          <div>
            <dt>Community</dt>
            <dd>{node.community ?? "none"}</dd>
          </div>
        </dl>

        <section className="details-section" aria-label="Connected edges">
          <div className="panel-topline">
            <p>Adjacent records</p>
            <strong>{edges.length}</strong>
          </div>
          <ConnectionList
            edges={edges}
            selectedId={node.id}
            nodes={snapshot.nodes}
            onSelect={(id) => {
              onSelectNeighbor(id);
              onClose();
            }}
            emptyCopy="No connected edges."
          />
        </section>

        <section className="details-section" aria-label="Node metadata">
          <div className="panel-topline">
            <p>Metadata</p>
            <strong>{metaEntries.length}</strong>
          </div>
          {metaEntries.length > 0 ? (
            <pre className="meta-block">{formatJson(node.meta)}</pre>
          ) : (
            <p className="empty-copy">No metadata for this node.</p>
          )}
        </section>

        <div className="modal-actions">
          <button type="button" title="Frame selected node" onClick={onFrameSelected}>
            Frame
          </button>
          <button
            type="button"
            title="Center selected node"
            onClick={() => graphRef.current?.panToNode(node.id)}
          >
            Center
          </button>
          <button
            type="button"
            title="Close (Escape)"
            aria-keyshortcuts="Escape"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </section>
    </div>
  );
}
