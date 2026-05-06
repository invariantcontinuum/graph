# @invariantcontinuum/graph Scenario Lab

This is the GitHub Pages scenario lab for `@invariantcontinuum/graph`. It demonstrates practical graph data instead of abstract showcase samples: a small Git repository, a Slack incident thread, Confluence documentation, a Jira sprint board, and correlated service logs.

The UI keeps the graph canvas as the primary surface and uses a responsive side panel for scenarios, layouts, modern light/dark theme profiles, generated node and edge mutations, selection inspection, and direct JSON editing.

## Development

```bash
cd site
npm install
npm run dev
```

The application is available at `http://localhost:3000/graph`.

The site uses `basePath: "/graph"` and `output: "export"` in `next.config.ts` so the build output can be published directly to GitHub Pages.

## Build

```bash
npm run build
```

The static export is emitted to `site/out`.

## Release Alignment

The showcase must match the latest released package state. Renderer and React wrapper visual fixes land in `@invariantcontinuum/graph` first, then a package release is cut and published, and only after the Release and Publish workflows are successful should `site/package.json` and `site/package-lock.json` move to that version.

Current showcase package target: `@invariantcontinuum/graph@^0.2.4`.

## Stack

- Next.js App Router static export
- React client component for the interactive scenario lab
- Tailwind CSS entrypoint plus custom global CSS
- `@invariantcontinuum/graph` React wrapper, WASM renderer, and worker layout pipeline
