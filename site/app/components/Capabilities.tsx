import { DARK, NODE_TYPES } from "@invariantcontinuum/graph/react";
import { Reveal } from "./Reveal";
import { Tilt } from "./Tilt";

/** Shape specimens drawn from the engine's real `Shape` union. Geometry only,
 *  rendered at the same stroke weight the renderer uses for node borders. */
const SHAPES: Array<{ name: string; el: React.ReactNode }> = [
  { name: "circle", el: <circle cx="18" cy="14" r="10" /> },
  { name: "square", el: <rect x="8" y="4" width="20" height="20" /> },
  {
    name: "roundrectangle",
    el: <rect x="5" y="6" width="26" height="16" rx="5" />,
  },
  { name: "diamond", el: <path d="M18 3 L30 14 L18 25 L6 14 Z" /> },
  {
    name: "hexagon",
    el: <path d="M12 4.5 L24 4.5 L30 14 L24 23.5 L12 23.5 L6 14 Z" />,
  },
  {
    name: "octagon",
    el: <path d="M12 4 L24 4 L30 10 L30 18 L24 24 L12 24 L6 18 L6 10 Z" />,
  },
  { name: "triangle", el: <path d="M18 4 L30 24 L6 24 Z" /> },
  {
    name: "barrel",
    el: <path d="M10 5 Q5 14 10 23 L26 23 Q31 14 26 5 Z" />,
  },
];

export function Capabilities() {
  return (
    <section className="section caps" aria-labelledby="caps-h">
      <Reveal>
        <h2 id="caps-h">Built like a renderer, shipped like a package</h2>
      </Reveal>
      <div className="caps-grid">
        <Reveal className="caps-cell caps-core">
          <Tilt className="caps-tilt">
            <h3>A Rust core compiled to WASM</h3>
            <p>
              Graph model, spatial index, and force simulation run as compiled
              code, not JavaScript. Two WASM modules ship in the package: the
              render engine on the main thread and the layout engine inside a
              Web Worker.
            </p>
            <ul className="crate-list">
              <li>
                <code>graph-core</code> model, filtering, algorithms
              </li>
              <li>
                <code>graph-layout</code> Barnes-Hut force, hierarchical, grid
              </li>
              <li>
                <code>graph-render</code> WebGL2 buffers and passes
              </li>
              <li>
                <code>graph-main-wasm</code> + <code>graph-worker-wasm</code>{" "}
                the two shipped modules
              </li>
            </ul>
          </Tilt>
        </Reveal>
        <Reveal className="caps-cell caps-shapes" delay={60}>
          <Tilt className="caps-tilt">
            <h3>Eight node shapes, two edge arrows, four dash styles</h3>
            <div className="shape-row" role="img" aria-label="The eight node shapes the renderer supports: circle, square, round rectangle, diamond, hexagon, octagon, triangle, and barrel">
              {SHAPES.map((s) => (
                <svg key={s.name} viewBox="0 0 36 28" className="shape-glyph">
                  {s.el}
                </svg>
              ))}
            </div>
            <p>
              Every shape is drawn in the shader with antialiased borders and
              per-type styling.
            </p>
          </Tilt>
        </Reveal>
        <Reveal className="caps-cell caps-layout" delay={40}>
          <Tilt className="caps-tilt">
            <h3>Layout off the main thread</h3>
            <p>
              A Barnes-Hut quadtree approximates repulsion in O(n log n), so
              the simulation keeps converging while your UI thread stays free.
              Positions stream back as transferable buffers.
            </p>
          </Tilt>
        </Reveal>
        <Reveal className="caps-cell caps-react" delay={80}>
          <Tilt className="caps-tilt">
            <h3>One React component to adopt it</h3>
            <pre className="caps-code" aria-label="Minimal usage example">
              <code>
                <span className="tok-tag">&lt;GraphScene</span>{" "}
                <span className="tok-attr">themeMode</span>=
                <span className="tok-str">&quot;dark&quot;</span>{" "}
                <span className="tok-attr">snapshot</span>=
                <span className="tok-p">{"{data}"}</span>{" "}
                <span className="tok-tag">/&gt;</span>
              </code>
            </pre>
            <p>
              GraphScene wires the canvas, worker, labels, and theme in one
              drop-in. Prefer composing? Every overlay is exported separately.
            </p>
          </Tilt>
        </Reveal>
        <Reveal className="caps-cell caps-theme" delay={120}>
          <Tilt className="caps-tilt">
            <h3>A typed theme system</h3>
            <div
              className="palette-row"
              role="img"
              aria-label="The thirteen node type accent colors of the engine's built-in dark theme"
            >
              {NODE_TYPES.map((t) => (
                <span
                  key={t}
                  className="palette-chip"
                  style={{ background: DARK.typeBorders[t] }}
                  title={t}
                />
              ))}
            </div>
            <p>
              These swatches are imported from the package at build time.
              Light and dark bases ship built in; overrides are plain objects.
            </p>
          </Tilt>
        </Reveal>
      </div>
    </section>
  );
}
