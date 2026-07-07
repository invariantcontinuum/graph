"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  GraphScene,
  type GraphHandle,
  type GraphSnapshot,
  type GraphStats,
  type GraphThemeOverrides,
  type LayoutType,
  type NodeData,
  type ThemeMode,
} from "@invariantcontinuum/graph/react";
import { useInView } from "../lib/useInView";

function webgl2Available(): boolean {
  try {
    return document.createElement("canvas").getContext("webgl2") !== null;
  } catch {
    return false;
  }
}

export interface EngineFrameProps {
  snapshot: GraphSnapshot;
  ariaLabel: string;
  themeMode?: ThemeMode;
  themeOverrides?: GraphThemeOverrides | null;
  layout?: LayoutType;
  focusIds?: Set<string> | null;
  labels?: Record<string, string>;
  /** Mount immediately instead of waiting for the viewport (hero). */
  eager?: boolean;
  /** Borderless full-bleed variant for the hero backdrop. */
  bleed?: boolean;
  fitPadding?: number;
  onNodeClick?: (node: NodeData | null) => void;
  onBackgroundClick?: () => void;
  onStatsChange?: (stats: GraphStats) => void;
  /** Fires when the worker hands the first laid-out frame for the current
   *  snapshot back to the renderer, with the milliseconds elapsed since the
   *  snapshot reached the mounted engine. The scale demo displays this. */
  onSettled?: (ms: number) => void;
  /** Overlay chrome (hints, controls) rendered above the canvas. */
  children?: ReactNode;
  className?: string;
}

export const EngineFrame = forwardRef<GraphHandle | null, EngineFrameProps>(
  function EngineFrame(
    {
      snapshot,
      ariaLabel,
      themeMode = "dark",
      themeOverrides,
      layout = "force",
      focusIds,
      labels,
      eager = false,
      bleed = false,
      fitPadding = 56,
      onNodeClick,
      onBackgroundClick,
      onStatsChange,
      onSettled,
      children,
      className = "",
    },
    ref,
  ) {
    const [containerRef, nearViewport] = useInView<HTMLDivElement>("600px");
    const [supported, setSupported] = useState<boolean | null>(null);
    // "Settled" is derived per snapshot: swapping data restarts the boot
    // shimmer without an effect-driven reset.
    const [settledFor, setSettledFor] = useState<GraphSnapshot | null>(null);
    const settled = settledFor === snapshot;
    const handleRef = useRef<GraphHandle | null>(null);

    // Mirror the engine handle into both the local ref (for focusFit) and the
    // forwarded ref, without useImperativeHandle's stale-capture problem.
    const attachHandle = useCallback(
      (h: GraphHandle | null) => {
        handleRef.current = h;
        if (typeof ref === "function") ref(h);
        else if (ref) ref.current = h;
      },
      [ref],
    );

    // Deferred a frame so the first client render matches the prerendered
    // HTML (no WebGL knowledge on the server) before the engine mounts.
    useEffect(() => {
      const id = requestAnimationFrame(() => setSupported(webgl2Available()));
      return () => cancelAnimationFrame(id);
    }, []);

    const mount = (eager || nearViewport) && supported === true;

    const appliedAt = useRef(0);
    const userTookOver = useRef(false);

    // Stamp the data-handoff time and re-arm the camera follow whenever a
    // snapshot reaches a mounted engine.
    useEffect(() => {
      if (!mount) return;
      appliedAt.current = performance.now();
      userTookOver.current = false;
    }, [snapshot, mount]);

    // The visitor grabbing the canvas ends any automatic camera work.
    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;
      const takeOver = () => {
        userTookOver.current = true;
      };
      el.addEventListener("pointerdown", takeOver);
      el.addEventListener("wheel", takeOver, { passive: true });
      return () => {
        el.removeEventListener("pointerdown", takeOver);
        el.removeEventListener("wheel", takeOver);
      };
    }, [containerRef]);

    const handlePositions = useCallback(() => {
      setSettledFor(snapshot);
      onSettled?.(Math.round(performance.now() - appliedAt.current));
      requestAnimationFrame(() => handleRef.current?.fit(fitPadding));
    }, [snapshot, onSettled, fitPadding]);

    // The force layout keeps moving well past the first frame (large graphs
    // run their full iteration budget for a minute or more). Re-fitting is a
    // cheap idempotent snap, so keep the whole graph framed until the sim's
    // outside window passes, unless the visitor has taken the camera.
    useEffect(() => {
      if (!settled) return;
      let ticks = 0;
      const id = window.setInterval(() => {
        ticks += 1;
        if (userTookOver.current || ticks > 110) {
          window.clearInterval(id);
          return;
        }
        handleRef.current?.fit(fitPadding);
      }, 800);
      return () => window.clearInterval(id);
    }, [settled, fitPadding]);

    return (
      <div
        ref={containerRef}
        className={`engine-frame${bleed ? " engine-frame-bleed" : ""} ${className}`}
        data-settled={settled ? "true" : "false"}
      >
        {mount ? (
          <GraphScene
            ref={attachHandle}
            snapshot={snapshot}
            themeMode={themeMode}
            themeOverrides={themeOverrides}
            layout={layout}
            focusIds={focusIds}
            labels={labels}
            onNodeClick={onNodeClick}
            onBackgroundClick={onBackgroundClick}
            onStatsChange={onStatsChange}
            onPositionsReady={handlePositions}
            aria-label={ariaLabel}
          />
        ) : null}
        {supported === false ? (
          <div className="engine-fallback" role="note">
            <p>
              This demo needs WebGL2, which this browser does not expose. The
              engine renders nodes and edges on a WebGL2 canvas with layout
              computed in a Web Worker.
            </p>
          </div>
        ) : null}
        {supported !== false && !settled ? (
          <div className="engine-boot" aria-hidden="true">
            <span className="engine-boot-bar" />
          </div>
        ) : null}
        {children}
      </div>
    );
  },
);
