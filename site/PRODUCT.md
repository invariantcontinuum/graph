# Product

## Register

brand

## Users

Engineers and technical leads evaluating a graph-rendering dependency. They arrive
from the README or the npm/GitHub Packages listing, usually mid-task ("can this
render our graph?"). They judge by seeing the engine run, not by marketing prose.

## Product Purpose

The showcase site for `@invariantcontinuum/graph`, a WASM + WebGL2 graph rendering
engine with Web Worker force layout and React bindings. The site has exactly one
job: demonstrate the package's functionality and feature set, and show how it can
be employed across different scenarios, kept generic. Success: a visitor can judge
rendering quality, interaction feel, theming range, and scale limits within two
minutes, then copy the install command.

## Brand Personality

Precise, engineered, quietly confident. The engine does the talking; the chrome
recedes. Voice in three words: instrument, not brochure.

## Anti-references

- The previous showcase: a fake product dashboard ("probes", "violations",
  Jira/Slack/Confluence-mimicking presets) that implied integrations the package
  does not ship. Nothing on this site may pretend to be a product feature.
- Generic SaaS landing pages: gradient blobs, three equal feature cards,
  screenshot mockups, invented metrics.
- Anything where the visitor cannot tell what is a live demo and what is decoration.

## Design Principles

1. **The engine is the imagery.** Every visual on the page is either the real
   engine rendering real data, or real package facts (palette, shapes, API).
   No stock photos, no fake screenshots.
2. **Show, then tell.** Each capability is demonstrated live before it is described.
3. **Generic scenarios only.** Demo datasets are procedurally generated and
   domain-generic (knowledge base, dependencies, topology, citations,
   collaboration). No named tools, no implied integrations.
4. **Honest numbers.** Every count, timing, or metric shown is measured in the
   visitor's browser at that moment, or is a verifiable package fact.
5. **Chrome recedes.** The UI around the canvases stays quiet: the engine's own
   palette, restrained motion, no ornament that competes with the render.

## Accessibility & Inclusion

WCAG AA contrast throughout. Full keyboard operability for all controls; canvas
demos get aria-labels and skip targets. All motion (including tilt and reveals)
collapses under prefers-reduced-motion. Demos degrade to informative static
states when WebGL2 is unavailable.
