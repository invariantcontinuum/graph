"use client";

import { useCallback, useMemo, useState } from "react";
import type { GraphSnapshot } from "@invariantcontinuum/graph/react";
import { generateHero } from "../lib/generate";
import { EngineFrame } from "./EngineFrame";

const INSTALL = "npm install @invariantcontinuum/graph";

export function Hero() {
  const snapshot: GraphSnapshot = useMemo(() => generateHero(), []);
  const [copied, setCopied] = useState(false);

  const copyInstall = useCallback(() => {
    navigator.clipboard?.writeText(INSTALL).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    });
  }, []);

  return (
    <section className="hero" id="top">
      <div className="hero-copy">
        <h1>
          20,000 nodes.
          <br />
          One component.
        </h1>
        <p>
          Rust WASM core, WebGL2 rendering, Web Worker physics, one React
          component. Every canvas on this page is live.
        </p>
        <div className="hero-actions">
          <button type="button" className="install-pill" onClick={copyInstall}>
            <code>{INSTALL}</code>
            <span className="install-copy">{copied ? "Copied" : "Copy"}</span>
          </button>
          <a className="btn-secondary" href="#playground">
            Open the playground
          </a>
        </div>
      </div>
      <div className="hero-stage">
        <EngineFrame
          eager
          snapshot={snapshot}
          ariaLabel="Live demo: a 423-node clustered graph rendered by the engine with its default dark theme"
          fitPadding={40}
        >
          <span className="canvas-hint" aria-hidden="true">
            drag to pan, wheel to zoom
          </span>
        </EngineFrame>
      </div>
    </section>
  );
}
