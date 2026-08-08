import { useState, useCallback } from "react";
import type { GraphHandle, LayoutType } from "./index";

export interface GraphToolbarProps {
  graphRef: React.RefObject<GraphHandle | null>;
  layout?: LayoutType;
  onLayoutChange?: (layout: LayoutType) => void;
  themeMode?: "light" | "dark";
  onThemeToggle?: () => void;
}

export function GraphToolbar({
  graphRef,
  layout = "force",
  onLayoutChange,
  themeMode = "dark",
  onThemeToggle,
}: GraphToolbarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleFocus = useCallback((e: React.FocusEvent<HTMLElement>) => {
    if (e.currentTarget.matches(":focus-visible")) {
      e.currentTarget.style.outline = "2px solid #3b82f6";
      e.currentTarget.style.outlineOffset = "2px";
    }
  }, []);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLElement>) => {
    e.currentTarget.style.outline = "";
    e.currentTarget.style.outlineOffset = "";
  }, []);

  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.opacity = "0.8";
  }, []);

  const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.opacity = "";
  }, []);

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!graphRef.current || !searchQuery.trim()) return;
      const found = graphRef.current.search(searchQuery.trim());
      if (found.length > 0) {
        graphRef.current.focusFit(found[0].id, 40);
      }
    },
    [graphRef, searchQuery],
  );

  return (
    <div
      role="toolbar"
      aria-label="Graph controls"
      style={{
        position: "absolute",
        top: 12,
        left: 12,
        display: "flex",
        gap: 8,
        alignItems: "center",
        background: themeMode === "dark" ? "#1e293b" : "#ffffff",
        padding: "6px 12px",
        borderRadius: 8,
        border: `1px solid ${themeMode === "dark" ? "#334155" : "#e2e8f0"}`,
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        zIndex: 10,
        color: themeMode === "dark" ? "#f8fafc" : "#0f172a",
        fontSize: 14,
      }}
    >
      <form onSubmit={handleSearch} style={{ display: "flex", gap: 4 }}>
        <input
          type="search"
          placeholder="Search nodes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search nodes"
          onFocus={handleFocus}
          onBlur={handleBlur}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{
            padding: "4px 8px",
            borderRadius: 4,
            border: `1px solid ${themeMode === "dark" ? "#475569" : "#cbd5e1"}`,
            background: themeMode === "dark" ? "#0f172a" : "#f1f5f9",
            color: "inherit",
            transition: "opacity 0.2s",
          }}
        />
        <button
          type="submit"
          aria-label="Submit search"
          onFocus={handleFocus}
          onBlur={handleBlur}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{
            padding: "4px 8px",
            borderRadius: 4,
            border: `1px solid ${themeMode === "dark" ? "#475569" : "#cbd5e1"}`,
            background: themeMode === "dark" ? "#334155" : "#e2e8f0",
            color: "inherit",
            cursor: "pointer",
            transition: "opacity 0.2s",
          }}
        >
          🔍
        </button>
      </form>
      <div
        style={{
          width: 1,
          height: 24,
          background: themeMode === "dark" ? "#475569" : "#cbd5e1",
          margin: "0 4px",
        }}
      />
      <button
        onClick={() => graphRef.current?.zoomIn()}
        aria-label="Zoom in"
        aria-keyshortcuts="Plus ="
        title="Zoom in (+ or =)"
        onFocus={handleFocus}
        onBlur={handleBlur}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          padding: "4px 8px",
          borderRadius: 4,
          border: `1px solid ${themeMode === "dark" ? "#475569" : "#cbd5e1"}`,
          background: themeMode === "dark" ? "#334155" : "#e2e8f0",
          color: "inherit",
          cursor: "pointer",
          transition: "opacity 0.2s",
        }}
      >
        ＋
      </button>
      <button
        onClick={() => graphRef.current?.zoomOut()}
        aria-label="Zoom out"
        aria-keyshortcuts="Minus _"
        title="Zoom out (- or _)"
        onFocus={handleFocus}
        onBlur={handleBlur}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          padding: "4px 8px",
          borderRadius: 4,
          border: `1px solid ${themeMode === "dark" ? "#475569" : "#cbd5e1"}`,
          background: themeMode === "dark" ? "#334155" : "#e2e8f0",
          color: "inherit",
          cursor: "pointer",
          transition: "opacity 0.2s",
        }}
      >
        －
      </button>
      <button
        onClick={() => graphRef.current?.fit(40)}
        aria-label="Fit graph to view"
        aria-keyshortcuts="F"
        title="Fit graph to view (F)"
        onFocus={handleFocus}
        onBlur={handleBlur}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          padding: "4px 8px",
          borderRadius: 4,
          border: `1px solid ${themeMode === "dark" ? "#475569" : "#cbd5e1"}`,
          background: themeMode === "dark" ? "#334155" : "#e2e8f0",
          color: "inherit",
          cursor: "pointer",
          transition: "opacity 0.2s",
        }}
      >
        ⛶
      </button>
      <div
        style={{
          width: 1,
          height: 24,
          background: themeMode === "dark" ? "#475569" : "#cbd5e1",
          margin: "0 4px",
        }}
      />
      {onLayoutChange && (
        <select
          value={layout}
          onChange={(e) => onLayoutChange(e.target.value as LayoutType)}
          aria-label="Select layout"
          onFocus={handleFocus}
          onBlur={handleBlur}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{
            padding: "4px 8px",
            borderRadius: 4,
            border: `1px solid ${themeMode === "dark" ? "#475569" : "#cbd5e1"}`,
            background: themeMode === "dark" ? "#0f172a" : "#f1f5f9",
            color: "inherit",
            transition: "opacity 0.2s",
          }}
        >
          <option value="force">Force</option>
          <option value="hierarchical">Hierarchy</option>
          <option value="grid">Grid</option>
        </select>
      )}
      {onThemeToggle && (
        <button
          onClick={onThemeToggle}
          aria-label={
            themeMode === "dark"
              ? "Switch to light theme"
              : "Switch to dark theme"
          }
          title={
            themeMode === "dark"
              ? "Switch to light theme"
              : "Switch to dark theme"
          }
          onFocus={handleFocus}
          onBlur={handleBlur}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{
            padding: "4px 8px",
            borderRadius: 4,
            border: `1px solid ${themeMode === "dark" ? "#475569" : "#cbd5e1"}`,
            background: themeMode === "dark" ? "#334155" : "#e2e8f0",
            color: "inherit",
            cursor: "pointer",
            transition: "opacity 0.2s",
          }}
        >
          {themeMode === "dark" ? "☀️" : "🌙"}
        </button>
      )}
    </div>
  );
}
