<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Showcase Release Alignment

- The package renderer is the source of truth for graph node, edge, label, theme, and canvas behavior. Fix renderer or React wrapper issues in the root package first instead of hiding them with showcase-only workarounds.
- Do not update `site/**` to display package rendering changes until the package has a successful release and publish. The sequence is: commit package fix on `main`, wait for CI, run `gh workflow run release.yml -f bump=patch --ref main`, wait for the Release workflow, wait for the Publish workflow triggered by the tag/release, then update the showcase dependency and UI.
- Keep `site/package.json` and `site/package-lock.json` pinned to the latest released `@invariantcontinuum/graph` version used by the showcase.
- GitHub Pages deploys are path-gated to `site/**`; package-only pushes must not redeploy the showcase before the released package exists.
- Validate showcase changes with `npm --prefix site run lint`, `cd site && ./node_modules/.bin/tsc --noEmit`, `npm --prefix site run build`, and browser checks for desktop and mobile.
