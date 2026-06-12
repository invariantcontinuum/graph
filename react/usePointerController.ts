import { useEffect, MutableRefObject, RefObject } from "react";
import type { NodeData, GraphStats, LegendSummary } from "./types";

export interface PointerControllerCallbacks {
  onNodeClick?: (node: NodeData) => void;
  onBackgroundClick?: () => void;
  onNodeHover?: (node: NodeData | null) => void;
  onStatsChange?: (stats: GraphStats) => void;
  onLegendChange?: (legend: LegendSummary) => void;
  onPositionsReady?: () => void;
}

export interface UsePointerControllerProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  engineRef: MutableRefObject<any>;
  workerRef: MutableRefObject<Worker | null>;
  callbacksRef: MutableRefObject<PointerControllerCallbacks>;
  nodeFromId: (id: string) => NodeData;
  requestRender: () => void;
  draggingNodeRef: MutableRefObject<string | null>;
}

export type PointerState = { id: number; x: number; y: number };

export function toLocalPointer(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  dpr: number
): { x: number; y: number } {
  return {
    x: (clientX - rect.left) * dpr,
    y: (clientY - rect.top) * dpr,
  };
}

export function centroid(active: Map<number, PointerState>): { x: number; y: number } {
  let x = 0;
  let y = 0;
  for (const p of active.values()) {
    x += p.x;
    y += p.y;
  }
  return { x: x / active.size, y: y / active.size };
}

export function pinchDist(active: Map<number, PointerState>): number {
  const arr = [...active.values()];
  const dx = arr[0].x - arr[1].x;
  const dy = arr[0].y - arr[1].y;
  return Math.hypot(dx, dy);
}

export function handleHoverOnly(
  local: { x: number; y: number },
  engine: any,
  canvasStyle: CSSStyleDeclaration,
  callbacks: PointerControllerCallbacks,
  nodeFromId: (id: string) => NodeData
) {
  const hoveredId = engine?.handle_hover(local.x, local.y);
  if (hoveredId !== undefined) {
    canvasStyle.cursor = hoveredId ? "pointer" : "default";
    callbacks.onNodeHover?.(hoveredId ? nodeFromId(hoveredId) : null);
  }
}

export function handleSinglePointerMove(
  local: { x: number; y: number },
  mode: "drag" | "pan" | null,
  engine: any,
  canvasStyle: CSSStyleDeclaration,
  callbacks: PointerControllerCallbacks,
  nodeFromId: (id: string) => NodeData,
  flushWorkerMessages: () => void
) {
  if (mode === "drag") {
    engine?.handle_node_drag_move(local.x, local.y);
    flushWorkerMessages();
  } else if (mode === "pan") {
    engine?.handle_pan_move(local.x, local.y);
    handleHoverOnly(local, engine, canvasStyle, callbacks, nodeFromId);
  }
}

export function handlePinchMove(
  active: Map<number, PointerState>,
  lastPinchDist: number,
  lastCentroid: { x: number; y: number } | null,
  engine: any
): { dist: number; centroid: { x: number; y: number } } {
  const d = pinchDist(active);
  const c = centroid(active);
  const deltaZoom = d / Math.max(lastPinchDist, 1e-3);
  engine?.handle_zoom(-Math.log(deltaZoom), c.x, c.y);
  if (lastCentroid) {
    engine?.handle_pan_start(lastCentroid.x, lastCentroid.y);
    engine?.handle_pan_move(c.x, c.y);
    engine?.handle_pan_end();
  }
  return { dist: d, centroid: c };
}

export function usePointerController({
  canvasRef,
  engineRef,
  workerRef,
  callbacksRef,
  nodeFromId,
  requestRender,
  draggingNodeRef,
}: UsePointerControllerProps) {
  const flushWorkerMessages = () => {
    const raw = engineRef.current?.drain_worker_messages();
    if (!raw || !workerRef.current) return;
    const msgs = Array.isArray(raw) ? raw : [];
    for (const msg of msgs) {
      workerRef.current.postMessage(msg);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const active: Map<number, PointerState> = new Map();
    let singleMode: "drag" | "pan" | null = null;
    let suppressNextClick = false;
    let lastPinchDist = 0;
    let lastCentroid: { x: number; y: number } | null = null;
    let downPos: { x: number; y: number } | null = null;

    const getLocalPointer = (e: PointerEvent | MouseEvent) => {
      return toLocalPointer(
        e.clientX,
        e.clientY,
        canvas.getBoundingClientRect(),
        window.devicePixelRatio || 1
      );
    };

    const onDown = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId);
      const local = getLocalPointer(e);
      active.set(e.pointerId, { id: e.pointerId, x: local.x, y: local.y });

      if (active.size === 1) {
        const nodeId = engineRef.current?.handle_node_drag_start(local.x, local.y);
        if (nodeId) {
          draggingNodeRef.current = nodeId;
          singleMode = "drag";
          downPos = { x: local.x, y: local.y };
          flushWorkerMessages();
        } else {
          engineRef.current?.handle_pan_start(local.x, local.y);
          singleMode = "pan";
          downPos = null;
        }
      } else if (active.size === 2) {
        if (singleMode === "drag") {
          engineRef.current?.handle_node_drag_end();
          flushWorkerMessages();
          draggingNodeRef.current = null;
          suppressNextClick = true;
        } else if (singleMode === "pan") {
          engineRef.current?.handle_pan_end();
        }
        singleMode = null;
        lastPinchDist = pinchDist(active);
        lastCentroid = centroid(active);
      }
      requestRender();
    };

    const onMove = (e: PointerEvent) => {
      const local = getLocalPointer(e);
      const existing = active.get(e.pointerId);

      if (!existing) {
        handleHoverOnly(
          local,
          engineRef.current,
          canvas.style,
          callbacksRef.current,
          nodeFromId
        );
        requestRender();
        return;
      }

      active.set(e.pointerId, { id: e.pointerId, x: local.x, y: local.y });

      if (active.size === 1) {
        handleSinglePointerMove(
          local,
          singleMode,
          engineRef.current,
          canvas.style,
          callbacksRef.current,
          nodeFromId,
          flushWorkerMessages
        );
      } else if (active.size === 2) {
        const res = handlePinchMove(active, lastPinchDist, lastCentroid, engineRef.current);
        lastPinchDist = res.dist;
        lastCentroid = res.centroid;
      }
      requestRender();
    };

    const onUp = (e: PointerEvent) => {
      if (canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }
      active.delete(e.pointerId);

      if (active.size === 0) {
        if (singleMode === "drag") {
          engineRef.current?.handle_node_drag_end();
          flushWorkerMessages();
          const movedThreshold = 4;
          const localUp = getLocalPointer(e);
          const moved = downPos
            ? Math.abs(localUp.x - downPos.x) > movedThreshold ||
              Math.abs(localUp.y - downPos.y) > movedThreshold
            : false;
          const pickedId = draggingNodeRef.current;
          if (!moved && pickedId) {
            callbacksRef.current.onNodeClick?.(nodeFromId(pickedId));
            suppressNextClick = true;
          }
          setTimeout(() => {
            draggingNodeRef.current = null;
          }, 0);
          downPos = null;
        } else if (singleMode === "pan") {
          engineRef.current?.handle_pan_end();
        }
        singleMode = null;
        lastCentroid = null;
        lastPinchDist = 0;
      } else if (active.size === 1) {
        const only = [...active.values()][0];
        engineRef.current?.handle_pan_start(only.x, only.y);
        singleMode = "pan";
        suppressNextClick = true;
      }
      requestRender();
    };

    const onClick = (e: MouseEvent) => {
      if (suppressNextClick) {
        suppressNextClick = false;
        return;
      }
      if (draggingNodeRef.current !== null) return;
      const local = getLocalPointer(e);
      const clickedId = engineRef.current?.handle_click(local.x, local.y);
      if (clickedId) {
        callbacksRef.current.onNodeClick?.(nodeFromId(clickedId));
      } else {
        callbacksRef.current.onBackgroundClick?.();
      }
      requestRender();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      let handled = false;
      if (e.key === "Escape") {
        callbacksRef.current.onBackgroundClick?.();
        handled = true;
      } else if (e.key === "+" || e.key === "=") {
        engineRef.current?.zoom_in();
        requestRender();
        handled = true;
      } else if (e.key === "-" || e.key === "_") {
        engineRef.current?.zoom_out();
        requestRender();
        handled = true;
      }

      if (handled) {
        e.preventDefault();
      }
    };

    canvas.style.touchAction = "none";
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("keydown", onKeyDown);
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("keydown", onKeyDown);
    };
  }, [canvasRef, engineRef, workerRef, callbacksRef, nodeFromId, requestRender, draggingNodeRef]);
}
