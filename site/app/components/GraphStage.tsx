import { forwardRef } from "react";
import {
  GraphScene,
  type GraphHandle,
  type GraphSnapshot,
  type GraphThemeOverrides,
  type LayoutType,
  type LegendSummary,
  type NodeData,
  type ThemeMode,
  type GraphStats,
} from "@invariantcontinuum/graph/react";

type GraphStageProps = {
  snapshot: GraphSnapshot;
  themeMode: ThemeMode;
  layout: LayoutType;
  themeOverrides: GraphThemeOverrides;
  focusIds: Set<string> | null;
  presetTitle: string;
  isLoading: boolean;
  onNodeClick: (node: NodeData | null) => void;
  onBackgroundClick: () => void;
  onLegendChange: (legend: LegendSummary | null) => void;
  onStatsChange: (stats: GraphStats | null) => void;
  onPositionsReady: () => void;
  onReady: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
};

export const GraphStage = forwardRef<GraphHandle, GraphStageProps>(
  function GraphStage(
    {
      snapshot,
      themeMode,
      layout,
      themeOverrides,
      focusIds,
      presetTitle,
      isLoading,
      onNodeClick,
      onBackgroundClick,
      onLegendChange,
      onStatsChange,
      onPositionsReady,
      onReady,
      onZoomIn,
      onZoomOut,
      onFit,
    },
    ref,
  ) {
    return (
      <div id="graph-stage" className="graph-stage">
        <GraphScene
          ref={ref}
          snapshot={snapshot}
          themeMode={themeMode}
          layout={layout}
          themeOverrides={themeOverrides}
          focusIds={focusIds}
          showCommunities
          onNodeClick={onNodeClick}
          onBackgroundClick={onBackgroundClick}
          onLegendChange={onLegendChange}
          onStatsChange={onStatsChange}
          onPositionsReady={onPositionsReady}
          onReady={onReady}
          aria-label={`${presetTitle} graph`}
        />
        {isLoading && (
          <div className="stage-loading" aria-live="polite" aria-busy="true">
            <div className="stage-loading-inner">
              <div className="stage-loading-spinner" />
              <p>Initializing graph engine…</p>
            </div>
          </div>
        )}
        <div className="stage-overlay">
          <div className="graph-hint" aria-hidden="true">
            <kbd>+</kbd> <kbd>−</kbd> zoom · <kbd>F</kbd> fit · drag pan · click inspect
          </div>
          <div className="zoom-bar" role="group" aria-label="Graph camera controls">
            <button
              type="button"
              className="zoom-control"
              aria-label="Zoom in"
              title="Zoom in (+)"
              aria-keyshortcuts="Plus"
              onClick={onZoomIn}
            >
              +
            </button>
            <button
              type="button"
              className="zoom-control"
              aria-label="Zoom out"
              title="Zoom out (-)"
              aria-keyshortcuts="-"
              onClick={onZoomOut}
            >
              −
            </button>
            <button
              type="button"
              className="zoom-control"
              aria-label="Fit graph to view"
              title="Fit graph to view (F)"
              aria-keyshortcuts="F"
              onClick={onFit}
            >
              Fit
            </button>
          </div>
        </div>
      </div>
    );
  },
);
