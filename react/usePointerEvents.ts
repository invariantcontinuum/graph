import { useEffect, MutableRefObject } from "react";
import { NodeData } from "./types";

interface UsePointerEventsProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  engineRef: MutableRefObject<any>;
  callbacksRef: MutableRefObject<{
    onNodeClick?: (node: NodeData) => void;
    onBackgroundClick?: () => void;
    onNodeHover?: (node: NodeData | null) => void;
  }>;
  nodeFromId: (id: string) => NodeData;
  flushWorkerMessages: () => void;
  requestRender: () => void;
  draggingNodeRef: MutableRefObject<string | null>;
}

export function usePointerEvents({
  canvasRef,
  engineRef,
  callbacksRef,
  nodeFromId,
  flushWorkerMessages,
  requestRender,
  draggingNodeRef,
}: UsePointerEventsProps) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    type PointerState = { id: number; x: number; y: number };

    const toLocalPointer = (e: PointerEvent | MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      return {
        x: (e.clientX - rect.left) * dpr,
        y: (e.clientY - rect.top) * dpr,
      };
    };

    const active: Map<number, PointerState> = new Map();
    let singleMode: "drag" | "pan" | null = null;
    let suppressNextClick = false;
    let lastPinchDist = 0;
    let lastCentroid: { x: number; y: number } | null = null;
    let downPos: { x: number; y: number } | null = null;

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

    const handleHoverOnly = (local: { x: number; y: number }) => {
      const hoveredId = engineRef.current?.handle_hover(local.x, local.y);
      if (hoveredId !== undefined) {
        canvas.style.cursor = hoveredId ? "pointer" : "default";
        callbacksRef.current.onNodeHover?.(hoveredId ? nodeFromId(hoveredId) : null);
      }
    };

    const handleSinglePointerMove = (
      local: { x: number; y: number },
      mode: "drag" | "pan" | null,
    ) => {
      if (mode === "drag") {
        engineRef.current?.handle_node_drag_move(local.x, local.y);
        flushWorkerMessages();
      } else if (mode === "pan") {
        engineRef.current?.handle_pan_move(local.x, local.y);
        handleHoverOnly(local);
      }
    };

    const handlePinchMove = () => {
      const d = pinchDist();
      const c = centroid();
      const deltaZoom = d / Math.max(lastPinchDist, 1e-3);
      engineRef.current?.handle_zoom(-Math.log(deltaZoom), c.x, c.y);
      if (lastCentroid) {
        engineRef.current?.handle_pan_start(lastCentroid.x, lastCentroid.y);
        engineRef.current?.handle_pan_move(c.x, c.y);
        engineRef.current?.handle_pan_end();
      }
      lastPinchDist = d;
      lastCentroid = c;
    };

    const onDown = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId);
      const local = toLocalPointer(e);
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
        lastPinchDist = pinchDist();
        lastCentroid = centroid();
      }
      requestRender();
    };

    const onMove = (e: PointerEvent) => {
      const local = toLocalPointer(e);
      const existing = active.get(e.pointerId);

      if (!existing) {
        handleHoverOnly(local);
        requestRender();
        return;
      }

      active.set(e.pointerId, { id: e.pointerId, x: local.x, y: local.y });

      if (active.size === 1) {
        handleSinglePointerMove(local, singleMode);
      } else if (active.size === 2) {
        handlePinchMove();
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
          const localUp = toLocalPointer(e);
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
      const local = toLocalPointer(e);
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
    callbacksRef,
    nodeFromId,
    flushWorkerMessages,
    requestRender,
    draggingNodeRef,
  ]);
}
