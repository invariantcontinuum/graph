"use client";

import { useCallback, useEffect, useState } from "react";
import type { GraphSnapshot } from "@invariantcontinuum/graph/react";
import { generateScale } from "../lib/generate";
import { useInView } from "../lib/useInView";
import { EngineFrame } from "./EngineFrame";
import { Reveal } from "./Reveal";

const SIZES = [1000, 5000, 10000, 20000] as const;
type Size = (typeof SIZES)[number];
const LABEL_LIMIT = 2000;
const EMPTY_LABELS: Record<string, string> = {};

interface Generated {
  size: Size;
  snapshot: GraphSnapshot;
  genMs: number;
}

function generate(size: Size): Generated {
  const t0 = performance.now();
  const snapshot = generateScale(size);
  return { size, snapshot, genMs: Math.round(performance.now() - t0) };
}

export function ScaleDemo() {
  const [gen, setGen] = useState<Generated | null>(null);
  const [settleMs, setSettleMs] = useState<number | null>(null);
  const [fps, setFps] = useState<number | null>(null);
  const [sectionRef, inView] = useInView<HTMLElement>("0px");

  // The initial dataset is generated off the critical path, after mount, so
  // its timing is measured the same way as every user-picked size.
  useEffect(() => {
    let alive = true;
    const id = window.setTimeout(() => {
      if (alive) setGen(generate(5000));
    }, 0);
    return () => {
      alive = false;
      window.clearTimeout(id);
    };
  }, []);

  const pickSize = useCallback((size: Size) => {
    setGen(generate(size));
    setSettleMs(null);
  }, []);

  const onSettled = useCallback((ms: number) => {
    setSettleMs(ms);
  }, []);

  // Honest main-thread FPS meter: counts real animation frames while the
  // section is on screen. Stops off-screen and under reduced motion.
  useEffect(() => {
    if (!inView) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let frames = 0;
    let last = performance.now();
    let alive = true;
    const loop = (now: number) => {
      if (!alive) return;
      frames += 1;
      if (now - last >= 500) {
        setFps(Math.round((frames * 1000) / (now - last)));
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [inView]);

  const labelsOff = (gen?.size ?? 0) > LABEL_LIMIT;

  return (
    <section
      className="section scale"
      id="scale"
      aria-labelledby="scale-h"
      ref={sectionRef}
    >
      <Reveal>
        <h2 id="scale-h">Stress test it yourself</h2>
        <p className="section-lede">
          The graph is generated in your browser the moment you pick a size,
          then handed to the layout worker. Numbers below are measured live on
          your machine, not quoted.
        </p>
      </Reveal>
      <Reveal>
        <div className="scale-bar">
          <div className="segmented" role="group" aria-label="Node count">
            {SIZES.map((s) => (
              <button
                key={s}
                type="button"
                className={gen?.size === s ? "active" : ""}
                aria-pressed={gen?.size === s}
                onClick={() => pickSize(s)}
              >
                {s.toLocaleString("en-US")}
              </button>
            ))}
          </div>
          <dl className="scale-metrics">
            <div>
              <dt>nodes / edges</dt>
              <dd>
                {gen
                  ? `${gen.snapshot.nodes.length.toLocaleString("en-US")} / ${gen.snapshot.edges.length.toLocaleString("en-US")}`
                  : "…"}
              </dd>
            </div>
            <div>
              <dt>generated in</dt>
              <dd>{gen ? `${gen.genMs} ms` : "…"}</dd>
            </div>
            <div>
              <dt>first laid-out frame</dt>
              <dd>{settleMs === null ? "…" : `${settleMs} ms`}</dd>
            </div>
            <div>
              <dt>main-thread fps</dt>
              <dd>{fps === null ? "…" : fps}</dd>
            </div>
          </dl>
        </div>
        {gen ? (
          <EngineFrame
            snapshot={gen.snapshot}
            labels={labelsOff ? EMPTY_LABELS : undefined}
            onSettled={onSettled}
            ariaLabel={`Stress test: ${gen.size.toLocaleString("en-US")} generated nodes in a clustered network`}
            fitPadding={32}
            className="scale-frame"
          >
            {labelsOff ? (
              <span className="canvas-hint" aria-hidden="true">
                labels hidden above {LABEL_LIMIT.toLocaleString("en-US")} nodes
              </span>
            ) : null}
          </EngineFrame>
        ) : (
          <div className="engine-frame scale-frame" aria-hidden="true">
            <div className="engine-boot">
              <span className="engine-boot-bar" />
            </div>
          </div>
        )}
      </Reveal>
    </section>
  );
}
