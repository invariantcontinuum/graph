export function Nav({ version }: { version: string }) {
  return (
    <header className="nav">
      <div className="nav-inner">
        <a className="nav-brand" href="#top">
          <span className="nav-scope">@invariantcontinuum/</span>graph
          <span className="nav-version">v{version}</span>
        </a>
        <nav aria-label="Sections">
          <a href="#playground">Playground</a>
          <a href="#scale">Scale</a>
          <a href="#theming">Theming</a>
          <a href="#api">API</a>
          <a
            href="https://github.com/invariantcontinuum/graph"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub repository (opens in a new tab)"
          >
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}
