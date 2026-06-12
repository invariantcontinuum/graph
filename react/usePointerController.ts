import { useEffect, MutableRefObject } from "react";
import type { NodeData } from "./types";

export type PointerState = { id: number; x: number; y: number };

export function flushWorkerMessages(
  engine: any,
  worker: Worker | null,
) {
  const raw = engine?.drain_worker_messages();
  if (!raw || !worker) return;
  const msgs = Array.isArray(raw) ? raw : [];
  for (const msg of msgs) {
    worker.postMessage(msg);
  }
}

export function toLocalPointer(
  e: PointerEvent | MouseEvent,
  canvas: HTMLCanvasElement,
) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  return {
    x: (e.clientX - rect.left) * dpr,
    y: (e.clientY - rect.top) * dpr,
  };
}

export function handleHoverOnly(
  local: { x: number; y: number },
  engine: any,
  canvas: HTMLCanvasElement,
  onNodeHover: ((node: NodeData | null) => void) | undefined,
  nodeFromId: (id: string) => NodeData,
) {
  const hoveredId = engine?.handle_hover(local.x, local.y);
  if (hoveredId !== undefined) {
    canvas.style.cursor = hoveredId ? "pointer" : "default";
    onNodeHover?.(hoveredId ? nodeFromId(hoveredId) : null);
  }
}

export function handleSinglePointerMove(
  local: { x: number; y: number },
  mode: "drag" | "pan" | null,
  engine: any,
  worker: Worker | null,
  canvas: HTMLCanvasElement,
  onNodeHover: ((node: NodeData | null) => void) | undefined,
  nodeFromId: (id: string) => NodeData,
) {
  if (mode === "drag") {
    engine?.handle_node_drag_move(local.x, local.y);
    flushWorkerMessages(engine, worker);
  } else if (mode === "pan") {
    engine?.handle_pan_move(local.x, local.y);
    handleHoverOnly(local, engine, canvas, onNodeHover, nodeFromId);
  }
}

export function handlePinchMove(
  active: Map<number, PointerState>,
  lastPinchDist: number,
  lastCentroid: { x: number; y: number } | null,
  engine: any,
) {
  function centroid(): { x: number; y: number } {
    let x = 0;
    let y = 0;
    for (const p of active.values()) {
      x += p.x;
      y += p.y;
    }
    return { x: x / active.size, y: y / active.size };
  }
  function pinchDist(): number {
    const arr = [...active.values()];
    const dx = arr[0].x - arr[1].x;
    const dy = arr[0].y - arr[1].y;
    return Math.hypot(dx, dy);
  }

  const d = pinchDist();
  const c = centroid();
  const deltaZoom = d / Math.max(lastPinchDist, 1e-3);
  engine?.handle_zoom(-Math.log(deltaZoom), c.x, c.y);
  if (lastCentroid) {
    engine?.handle_pan_start(lastCentroid.x, lastCentroid.y);
    engine?.handle_pan_move(c.x, c.y);
    engine?.handle_pan_end();
  }
  return { newPinchDist: d, newCentroid: c };
}

export function usePointerController({
  canvasRef,
  engineRef,
  workerRef,
  callbacksRef,
  draggingNodeRef,
  nodeFromId,
  requestRender,
}: {
  canvasRef: MutableRefObject<HTMLCanvasElement | null>;
  engineRef: MutableRefObject<any>;
  workerRef: MutableRefObject<Worker | null>;
  callbacksRef: MutableRefObject<{
    onNodeClick?: (node: NodeData) => void;
    onBackgroundClick?: () => void;
    onNodeHover?: (node: NodeData | null) => void;
  }>;
  draggingNodeRef: MutableRefObject<string | null>;
  nodeFromId: (id: string) => NodeData;
  requestRender: () => void;
}) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const active: Map<number, PointerState> = new Map();
    let singleMode: "drag" | "pan" | null = null;
    let suppressNextClick = false;
    let lastPinchDist = 0;
    let lastCentroid: { x: number; y: number } | null = null;
    let downPos: { x: number; y: number } | null = null;

    function getPinchDist(): number {
      const arr = [...active.values()];
      const dx = arr[0].x - arr[1].x;
      const dy = arr[0].y - arr[1].y;
      return Math.hypot(dx, dy);
    }

    function getCentroid(): { x: number; y: number } {
      let x = 0;
      let y = 0;
      for (const p of active.values()) {
        x += p.x;
        y += p.y;
      }
      return { x: x / active.size, y: y / active.size };
    }

    const onDown = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId);
      const local = toLocalPointer(e, canvas);
      active.set(e.pointerId, { id: e.pointerId, x: local.x, y: local.y });

      if (active.size === 1) {
        const nodeId = engineRef.current?.handle_node_drag_start(local.x, local.y);
        if (nodeId) {
          draggingNodeRef.current = nodeId;
          singleMode = "drag";
          downPos = { x: local.x, y: local.y };
          flushWorkerMessages(engineRef.current, workerRef.current);
        } else {
          engineRef.current?.handle_pan_start(local.x, local.y);
          singleMode = "pan";
          downPos = null;
        }
      } else if (active.size === 2) {
        if (singleMode === "drag") {
          engineRef.current?.handle_node_drag_end();
          flushWorkerMessages(engineRef.current, workerRef.current);
          draggingNodeRef.current = null;
          suppressNextClick = true;
        } else if (singleMode === "pan") {
          engineRef.current?.handle_pan_end();
        }
        singleMode = null;
        lastPinchDist = getPinchDist();
        lastCentroid = getCentroid();
      }
      requestRender();
    };

    const onMove = (e: PointerEvent) => {
      const local = toLocalPointer(e, canvas);
      const existing = active.get(e.pointerId);

      if (!existing) {
        handleHoverOnly(
          local,
          engineRef.current,
          canvas,
          callbacksRef.current.onNodeHover,
          nodeFromId,
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
          workerRef.current,
          canvas,
          callbacksRef.current.onNodeHover,
          nodeFromId,
        );
      } else if (active.size === 2) {
        const { newPinchDist, newCentroid } = handlePinchMove(
          active,
          lastPinchDist,
          lastCentroid,
          engineRef.current,
        );
        lastPinchDist = newPinchDist;
        lastCentroid = newCentroid;
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
          flushWorkerMessages(engineRef.current, workerRef.current);
          const movedThreshold = 4;
          const localUp = toLocalPointer(e, canvas);
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
      const local = toLocalPointer(e, canvas);
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
  }, [
    canvasRef,
    engineRef,
    workerRef,
    callbacksRef,
    draggingNodeRef,
    nodeFromId,
    requestRender,
  ]);
}
