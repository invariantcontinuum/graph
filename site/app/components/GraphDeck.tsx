import type { GraphSnapshot, GraphStats, LayoutType, ThemeMode } from "@invariantcontinuum/graph/react";
import type { Preset } from "../presets";
import { MetricCard } from "./MetricCard";
import { SegmentedControl } from "./SegmentedControl";

type GraphDeckProps = {
  preset: Preset;
  layout: LayoutType;
  themeMode: ThemeMode;
  snapshot: GraphSnapshot;
  stats: GraphStats | null;
  nodeTypeCount: number;
  graphDensity: number;
  children: React.ReactNode;
  onLayoutChange: (layout: LayoutType) => void;
  onThemeModeChange: (mode: ThemeMode) => void;
};

export function GraphDeck({
  preset,
  layout,
  themeMode,
  snapshot,
  stats,
  nodeTypeCount,
  graphDensity,
  children,
  onLayoutChange,
  onThemeModeChange,
}: GraphDeckProps) {
  return (
    <section className="graph-deck" aria-label="Graph viewer">
      <div className="deck-head">
        <div className="deck-intro">
          <p className="scenario-eyebrow">{preset.subtitle}</p>
          <h1>{preset.title}</h1>
        </div>
        <div className="mode-cluster" role="group" aria-label="Graph display controls">
          <SegmentedControl<LayoutType>
            label="Layout"
            value={layout}
            options={["force", "hierarchical", "grid"]}
            onChange={onLayoutChange}
            format={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
          />
          <SegmentedControl<ThemeMode>
            label="Theme"
            value={themeMode}
            options={["dark", "light"]}
            onChange={onThemeModeChange}
            format={(v) => (v === "dark" ? "Dark" : "Light")}
          />
        </div>
      </div>

      <div className="metrics-strip" role="group" aria-label="Graph metrics">
        <MetricCard
          label="Nodes"
          value={stats?.nodeCount ?? snapshot.nodes.length}
          title="Total nodes"
        />
        <MetricCard
          label="Edges"
          value={stats?.edgeCount ?? snapshot.edges.length}
          title="Total edges"
        />
        <MetricCard
          label="Types"
          value={nodeTypeCount}
          title="Node types"
        />
        <MetricCard
          label="Density"
          value={graphDensity}
          title="Edges per node"
        />
      </div>

      {children}
    </section>
  );
}
