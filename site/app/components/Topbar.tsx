type TopbarProps = {
  packageVersion: string;
  drawerOpen: boolean;
  onToggleDrawer: () => void;
};

export function Topbar({
  packageVersion,
  drawerOpen,
  onToggleDrawer,
}: TopbarProps) {
  return (
    <header className="atlas-topbar">
      <button
        type="button"
        className="drawer-toggle"
        aria-label={drawerOpen ? "Close scenario rail" : "Open scenario rail"}
        title={drawerOpen ? "Close scenario rail" : "Open scenario rail"}
        aria-expanded={drawerOpen}
        aria-controls="scenario-rail"
        onClick={onToggleDrawer}
      >
        <span />
        <span />
        <span />
      </button>

      <div className="brand-lockup">
        <span className="brand-sigil" aria-hidden="true">
          ic
        </span>
        <div>
          <p>Invariant Continuum</p>
          <strong>Graph Atlas</strong>
        </div>
      </div>

      <nav className="top-links" aria-label="Project links">
        <a
          href="https://github.com/invariantcontinuum/graph"
          target="_blank"
          rel="noreferrer"
          aria-label="GitHub (opens in a new tab)"
        >
          GitHub
        </a>
        <span>v{packageVersion}</span>
      </nav>
    </header>
  );
}
