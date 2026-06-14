import { useEffect, useRef } from "react";
import { toLocalPointer, centroid, pinchDist, PointerState } from "./helpers";
import { NodeData } from "../types";

type EngineMethods = {
  handle_hover: (x: number, y: number) => string | undefined;
  handle_node_drag_start: (x: number, y: number) => string | undefined;
  handle_node_drag_move: (x: number, y: number) => void;
  handle_node_drag_end: () => void;
  handle_pan_start: (x: number, y: number) => void;
  handle_pan_move: (x: number, y: number) => void;
  handle_pan_end: () => void;
  handle_zoom: (delta: number, x: number, y: number) => void;
  handle_click: (x: number, y: number) => string | undefined;
  zoom_in: () => void;
  zoom_out: () => void;
};

export function usePointerController(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  engineRef: React.MutableRefObject<EngineMethods | null>,
  callbacksRef: React.MutableRefObject<{
    onNodeHover?: (node: NodeData | null) => void;
    onNodeClick?: (node: NodeData | null) => void;
    onBackgroundClick?: () => void;
  }>,
  nodeFromId: (id: string) => NodeData | null,
  flushWorkerMessages: () => void,
  requestRender: () => void,
  draggingNodeRef: React.MutableRefObject<string | null>,
) {
  const activePointersRef = useRef<Map<number, PointerState>>(new Map());
  const singleModeRef = useRef<"drag" | "pan" | null>(null);
  const suppressNextClickRef = useRef(false);
  const lastPinchDistRef = useRef(0);
  const lastCentroidRef = useRef<{ x: number; y: number } | null>(null);
  const downPosRef = useRef<{ x: number; y: number } | null>(null);


  const handleHoverOnly = (local: { x: number; y: number }, canvas: HTMLCanvasElement) => {
    const hoveredId = engineRef.current?.handle_hover(local.x, local.y);
    if (hoveredId !== undefined) {
      canvas.style.cursor = hoveredId ? "pointer" : "default";
      callbacksRef.current.onNodeHover?.(hoveredId ? nodeFromId(hoveredId) : null);
    }
  };

  const handleSinglePointerMove = (local: { x: number; y: number }, mode: "drag" | "pan" | null, canvas: HTMLCanvasElement) => {
    if (mode === "drag") {
      engineRef.current?.handle_node_drag_move(local.x, local.y);
      flushWorkerMessages();
    } else if (mode === "pan") {
      engineRef.current?.handle_pan_move(local.x, local.y);
      handleHoverOnly(local, canvas);
    }
  };

  const handlePinchMove = (activePointers: Map<number, PointerState>) => {
    const d = pinchDist(activePointers);
    const c = centroid(activePointers);
    const deltaZoom = d / Math.max(lastPinchDistRef.current, 1e-3);
    engineRef.current?.handle_zoom(-Math.log(deltaZoom), c.x, c.y);
    if (lastCentroidRef.current) {
      engineRef.current?.handle_pan_start(lastCentroidRef.current.x, lastCentroidRef.current.y);
      engineRef.current?.handle_pan_move(c.x, c.y);
      engineRef.current?.handle_pan_end();
    }
    lastPinchDistRef.current = d;
    lastCentroidRef.current = c;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const active = activePointersRef.current;

    const onDown = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId);
      const local = toLocalPointer(e.clientX, e.clientY, canvas);
      active.set(e.pointerId, { id: e.pointerId, x: local.x, y: local.y });

      if (active.size === 1) {
        const nodeId = engineRef.current?.handle_node_drag_start(local.x, local.y);
        if (nodeId) {
          draggingNodeRef.current = nodeId;
          singleModeRef.current = "drag";
          downPosRef.current = { x: local.x, y: local.y };
          flushWorkerMessages();
        } else {
          engineRef.current?.handle_pan_start(local.x, local.y);
          singleModeRef.current = "pan";
          downPosRef.current = null;
        }
      } else if (active.size === 2) {
        if (singleModeRef.current === "drag") {
          engineRef.current?.handle_node_drag_end();
          flushWorkerMessages();
          draggingNodeRef.current = null;
          suppressNextClickRef.current = true;
        } else if (singleModeRef.current === "pan") {
          engineRef.current?.handle_pan_end();
        }
        singleModeRef.current = null;
        lastPinchDistRef.current = pinchDist(active);
        lastCentroidRef.current = centroid(active);
      }
      requestRender();
    };

    const onMove = (e: PointerEvent) => {
      const local = toLocalPointer(e.clientX, e.clientY, canvas);
      const existing = active.get(e.pointerId);

      if (!existing) {
        handleHoverOnly(local, canvas);
        requestRender();
        return;
      }

      active.set(e.pointerId, { id: e.pointerId, x: local.x, y: local.y });

      if (active.size === 1) {
        handleSinglePointerMove(local, singleModeRef.current, canvas);
      } else if (active.size === 2) {
        handlePinchMove(active);
      }
      requestRender();
    };

    const onUp = (e: PointerEvent) => {
      if (canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }
      active.delete(e.pointerId);

      if (active.size === 0) {
        if (singleModeRef.current === "drag") {
          engineRef.current?.handle_node_drag_end();
          flushWorkerMessages();
          const movedThreshold = 4;
          const localUp = toLocalPointer(e.clientX, e.clientY, canvas);
          const moved = downPosRef.current
            ? Math.abs(localUp.x - downPosRef.current.x) > movedThreshold ||
              Math.abs(localUp.y - downPosRef.current.y) > movedThreshold
            : false;
          const pickedId = draggingNodeRef.current;
          if (!moved && pickedId) {
            callbacksRef.current.onNodeClick?.(nodeFromId(pickedId));
            suppressNextClickRef.current = true;
          }
          setTimeout(() => {
            draggingNodeRef.current = null;
          }, 0);
          downPosRef.current = null;
        } else if (singleModeRef.current === "pan") {
          engineRef.current?.handle_pan_end();
        }
        singleModeRef.current = null;
        lastCentroidRef.current = null;
        lastPinchDistRef.current = 0;
      } else if (active.size === 1) {
        const only = [...active.values()][0];
        engineRef.current?.handle_pan_start(only.x, only.y);
        singleModeRef.current = "pan";
        suppressNextClickRef.current = true;
      }
      requestRender();
    };
    const onClick = (e: MouseEvent) => {
      if (suppressNextClickRef.current) {
        suppressNextClickRef.current = false;
        return;
      }
      if (draggingNodeRef.current !== null) return;
      const local = toLocalPointer(e.clientX, e.clientY, canvas);
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
  }, [nodeFromId, flushWorkerMessages, requestRender, canvasRef, engineRef, callbacksRef]);

}
