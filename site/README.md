# @invariantcontinuum/graph Showcase

This is the GitHub Pages showcase for `@invariantcontinuum/graph`. It is a graph-first workbench with a responsive side panel for presets, layouts, theme profiles, generated node and edge mutations, selection inspection, and direct JSON editing.

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

## Stack

- Next.js App Router static export
- React client component for the interactive workbench
- Tailwind CSS entrypoint plus custom global CSS
- `@invariantcontinuum/graph` React wrapper, WASM renderer, and worker layout pipeline
