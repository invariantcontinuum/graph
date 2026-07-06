import type { Preset } from "../presets";

type ScenarioRailProps = {
  presets: readonly Preset[];
  activeSlug: string;
  drawerOpen: boolean;
  packageVersion: string;
  onSelect: (slug: string) => void;
  onCloseDrawer: () => void;
};

export function ScenarioRail({
  presets,
  activeSlug,
  drawerOpen,
  packageVersion,
  onSelect,
  onCloseDrawer,
}: ScenarioRailProps) {
  return (
    <>
      {drawerOpen ? (
        <button
          type="button"
          className="drawer-backdrop"
          aria-label="Close scenario rail"
          onClick={onCloseDrawer}
        />
      ) : null}
      <aside
        id="scenario-rail"
        className="scenario-rail"
        data-open={drawerOpen}
        aria-label="Scenario catalog"
      >
        <div className="rail-heading">
          <p>Scenario catalog</p>
          <strong>{presets.length} maps</strong>
        </div>
        <nav className="scenario-list" aria-label="Graph scenarios">
          {presets.map((item) => (
            <button
              key={item.slug}
              type="button"
              className="scenario-card"
              data-active={item.slug === activeSlug}
              aria-current={item.slug === activeSlug ? "true" : undefined}
              aria-label={`${item.title}, ${item.subtitle}. ${item.snapshot.nodes.length} nodes and ${item.snapshot.edges.length} edges.`}
              onClick={() => onSelect(item.slug)}
            >
              <span aria-hidden="true">{item.folio}</span>
              <strong title={item.title}>{item.title}</strong>
              <small title={item.subtitle}>{item.subtitle}</small>
              <b>
                {item.snapshot.nodes.length}n / {item.snapshot.edges.length}e
              </b>
            </button>
          ))}
        </nav>

        <section className="rail-panel" aria-label="Package release">
          <p className="panel-label">Released package</p>
          <strong>@invariantcontinuum/graph</strong>
          <span>{packageVersion} pinned in this site</span>
        </section>
      </aside>
    </>
  );
}
