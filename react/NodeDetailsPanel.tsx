import React, {
  useEffect,
  useMemo,
  useCallback,
  type CSSProperties,
} from "react";
import { buildGraphTheme } from "./theme/buildTheme";
import type { ThemeMode } from "./GraphScene";
import { connectionsFor, formatMetaValue, neighborName } from "./nodeDetails";
import type { EdgeData, NodeData } from "./types";

export interface NodeDetailsPanelProps {
  /** The node to inspect. `null` renders nothing — the host owns the
   *  "nothing selected" hint. */
  node: NodeData | null;
  /** Snapshot edges, used to derive the connection list. */
  edges?: readonly EdgeData[];
  /** Snapshot nodes, used to resolve neighbor display names. */
  nodes?: readonly NodeData[];
  /** Light/dark default styling, same knob as GraphScene. */
  themeMode?: ThemeMode;
  /** Called by the close button and the Escape key. */
  onClose?: () => void;
  /** When set, connection rows become buttons that hand over the neighbor. */
  onNeighborClick?: (node: NodeData) => void;
  /** Extra CSS class on the panel (for layout / sizing overrides). */
  className?: string;
  style?: CSSProperties;
}

/**
 * NodeDetailsPanel — the inspect-side companion to `onNodeClick`.
 *
 * Renders a themed card with the node's identity (name, type, domain,
 * status, community), its free-form `meta` attributes, and the list of
 * edges touching it. Purely presentational: selection state, spotlight
 * wiring, and camera moves stay in the host, exactly as with the GraphScene
 * chrome slot. Escape and the close button both fire `onClose`.
 */
export function NodeDetailsPanel({
  node,
  edges = [],
  nodes = [],
  themeMode = "dark",
  onClose,
  onNeighborClick,
  className,
  style,
}: NodeDetailsPanelProps) {
  const theme = useMemo(() => buildGraphTheme(themeMode), [themeMode]);

  const nodesById = useMemo(
    () => new Map(nodes.map((n) => [n.id, n])),
    [nodes],
  );

  const connections = useMemo(
    () => (node ? connectionsFor(node.id, edges) : []),
    [node, edges],
  );

  const handleFocus = useCallback((e: React.FocusEvent<HTMLElement>) => {
    if (e.target.matches(":focus-visible")) {
      e.target.style.outline = "2px solid #3b82f6";
      e.target.style.outlineOffset = "2px";
    }
  }, []);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLElement>) => {
    e.target.style.outline = "none";
  }, []);

  // Escape closes the panel while it is open.
  useEffect(() => {
    if (!node || !onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [node, onClose]);

  if (!node) return null;

  const text = theme.defaultNodeStyle.labelColor;
  const border = theme.gridLineColor;

  const metaEntries = Object.entries(node.meta ?? {});

  return (
    <aside
      className={`graph-node-details${className ? " " + className : ""}`}
      role="dialog"
      aria-label={`Node details: ${node.name}`}
      style={{
        position: "absolute",
        top: 12,
        right: 12,
        zIndex: 20,
        width: 280,
        maxWidth: "calc(100% - 24px)",
        maxHeight: "calc(100% - 24px)",
        overflowY: "auto",
        padding: "12px 14px",
        borderRadius: 10,
        border: `1px solid ${border}`,
        background: theme.canvasBg,
        color: text,
        fontFamily: theme.defaultNodeStyle.labelFont,
        fontSize: 13,
        lineHeight: 1.45,
        boxShadow: "0 8px 28px rgba(0, 0, 0, 0.35)",
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <strong style={{ fontSize: 15, wordBreak: "break-word" }}>
          {node.name}
        </strong>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            title="Close node details (Escape)"
            aria-label="Close node details"
            aria-keyshortcuts="Escape"
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={{
              flex: "none",
              border: `1px solid ${border}`,
              borderRadius: 6,
              background: "transparent",
              color: text,
              cursor: "pointer",
              padding: "2px 8px",
              font: "inherit",
            }}
          >
            ×
          </button>
        ) : null}
      </div>

      <div
        role="group"
        aria-label="Node properties"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          marginTop: 8,
        }}
      >
        {[
          { label: "Type", value: node.type },
          { label: "Status", value: node.status },
          { label: "Domain", value: node.domain },
        ]
          .filter((chip) => chip.value)
          .map((chip) => (
            <span
              key={chip.label}
              title={`${chip.label}: ${chip.value}`}
              aria-label={`${chip.label}: ${chip.value}`}
              style={{
                border: `1px solid ${border}`,
                borderRadius: 999,
                padding: "1px 8px",
                fontSize: 12,
                color: theme.dimText,
              }}
            >
              {chip.value}
            </span>
          ))}
        {node.community !== undefined ? (
          <span
            title={`Community: cluster ${node.community}`}
            aria-label={`Community: cluster ${node.community}`}
            style={{
              border: `1px solid ${border}`,
              borderRadius: 999,
              padding: "1px 8px",
              fontSize: 12,
              color: theme.dimText,
            }}
          >
            cluster {node.community}
          </span>
        ) : null}
      </div>

      <div role="group" aria-label="Node metadata" style={{ marginTop: 12 }}>
        {metaEntries.length > 0 ? (
          <dl style={{ margin: "0", display: "grid", rowGap: 4 }}>
            {metaEntries.map(([key, value]) => (
              <div
                key={key}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <dt style={{ color: theme.dimText }}>{key}</dt>
                <dd
                  style={{
                    margin: 0,
                    textAlign: "right",
                    wordBreak: "break-word",
                  }}
                >
                  {formatMetaValue(value)}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <div style={{ color: theme.dimText, fontStyle: "italic" }}>
            No metadata
          </div>
        )}
      </div>

      <div role="group" aria-label="Connected edges" style={{ marginTop: 12 }}>
        <div style={{ color: theme.dimText, marginBottom: 6 }}>
          {connections.length} connection{connections.length === 1 ? "" : "s"}
        </div>
        {connections.length > 0 ? (
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "grid",
              rowGap: 4,
            }}
          >
            {connections.map(({ edge, neighborId, direction }) => {
              const label = `${direction === "outgoing" ? "→" : "←"} ${neighborName(neighborId, nodesById)}`;
              const inner = (
                <>
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {label}
                  </span>
                  <span style={{ color: theme.dimText, flex: "none" }}>
                    {edge.type}
                  </span>
                </>
              );
              const rowStyle: CSSProperties = {
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                width: "100%",
                padding: "3px 6px",
                borderRadius: 6,
                border: "none",
                background: "transparent",
                color: text,
                font: "inherit",
                textAlign: "left",
              };
              const neighbor = nodesById.get(neighborId);
              const fullText = `${label} ${edge.type}`;
              return (
                <li key={edge.id} title={fullText}>
                  {onNeighborClick && neighbor ? (
                    <button
                      type="button"
                      style={{ ...rowStyle, cursor: "pointer" }}
                      onClick={() => onNeighborClick(neighbor)}
                      onFocus={handleFocus}
                      onBlur={handleBlur}
                      aria-label={`${fullText}, Inspect ${direction === "outgoing" ? "outgoing" : "incoming"} connection to ${neighbor.name}`}
                    >
                      {inner}
                    </button>
                  ) : (
                    <span style={rowStyle}>{inner}</span>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <div style={{ color: theme.dimText, fontStyle: "italic" }}>
            No connected edges
          </div>
        )}
      </div>
    </aside>
  );
}
