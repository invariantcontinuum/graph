import React, { useEffect } from "react";
import {
  toLocalPointer,
  centroid,
  pinchDist,
  handleHoverOnly,
  handleSinglePointerMove,
  handlePinchMove,
  PointerState,
} from "./pointerUtils";

interface UsePointerControllerProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  engineRef: React.MutableRefObject<any>;
  callbacksRef: React.MutableRefObject<{
    onNodeClick?: (node: any) => void;
    onBackgroundClick?: () => void;
    onNodeHover?: (node: any) => void;
  }>;
  nodeFromId: (id: string) => any;
  draggingNodeRef: React.MutableRefObject<string | null>;
  flushWorkerMessages: () => void;
  requestRender: () => void;
}

export function usePointerController({
  canvasRef,
  engineRef,
  callbacksRef,
  nodeFromId,
  draggingNodeRef,
  flushWorkerMessages,
  requestRender,
}: UsePointerControllerProps) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const active: Map<number, PointerState> = new Map();
    // Track whether the current single-pointer gesture is dragging a node,
    // panning the camera, or neither (pre-hit-test state). Resets on release.
    let singleMode: "drag" | "pan" | null = null;
    let suppressNextClick = false;
    let lastPinchDist = 0;
    let lastCentroid: { x: number; y: number } | null = null;
    // Records the local pointerdown position so onUp can distinguish a pure
    // click (no movement) from a drag. Without this, a click-on-node never
    // fires onNodeClick because onUp always installs the click-suppression
    // timeout before the synthetic click event runs.
    let downPos: { x: number; y: number } | null = null;

    const onDown = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId);
      const local = toLocalPointer(e.clientX, e.clientY, canvas);
      active.set(e.pointerId, { id: e.pointerId, x: local.x, y: local.y });

      if (active.size === 1) {
        // Hit-test: if the pointer lands on a node, start a node-drag;
        // otherwise start a camera pan.
        const nodeId = engineRef.current?.handle_node_drag_start(
          local.x,
          local.y,
        );
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
        // Second pointer joined — end any single-pointer gesture and begin pinch.
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
      const local = toLocalPointer(e.clientX, e.clientY, canvas);
      const existing = active.get(e.pointerId);

      if (!existing) {
        // Hovering without a button pressed
        handleHoverOnly(local, engineRef.current, canvas, callbacksRef.current, nodeFromId);
        requestRender();
        return;
      }

      active.set(e.pointerId, { id: e.pointerId, x: local.x, y: local.y });

      if (active.size === 1) {
        handleSinglePointerMove(local, singleMode, engineRef.current, canvas, callbacksRef.current, nodeFromId, flushWorkerMessages);
      } else if (active.size === 2) {
        const { d, c } = handlePinchMove(active, engineRef.current, lastPinchDist, lastCentroid);
        lastPinchDist = d;
        lastCentroid = c;
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
          // A "click on node" also begins with a drag-start (because the
          // pointer-down hit-tested a node). If the pointer never moved
          // beyond the threshold, fire onNodeClick directly here — the
          // synthetic `click` event that follows would otherwise be
          // swallowed by the draggingNodeRef guard inside onClick.
          const movedThreshold = 4;
          const localUp = toLocalPointer(e.clientX, e.clientY, canvas);
          const moved = downPos
            ? Math.abs(localUp.x - downPos.x) > movedThreshold ||
              Math.abs(localUp.y - downPos.y) > movedThreshold
            : false;
          const pickedId = draggingNodeRef.current;
          if (!moved && pickedId) {
            callbacksRef.current.onNodeClick?.(nodeFromId(pickedId));
            suppressNextClick = true;
          }
          // Clear on next tick to suppress the synthetic click that fires
          // immediately after pointerup on the same element.
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
        // Transitioned from pinch back to single pointer — resume panning from
        // the remaining pointer. Treat as a new pan gesture (not a drag).
        const only = [...active.values()][0];
        engineRef.current?.handle_pan_start(only.x, only.y);
        singleMode = "pan";
        // The next click would be a pinch-release → suppress.
        suppressNextClick = true;
      }
      requestRender();
    };

    const onClick = (e: MouseEvent) => {
      if (suppressNextClick) {
        suppressNextClick = false;
        return;
      }
      if (draggingNodeRef.current !== null) return; // consumed by drag
      const local = toLocalPointer(e.clientX, e.clientY, canvas);
      const clickedId = engineRef.current?.handle_click(local.x, local.y);
      if (clickedId) {
        callbacksRef.current.onNodeClick?.(nodeFromId(clickedId));
      } else {
        // Clicking empty canvas clears spotlight — Cytoscape parity. Hosts
        // that wire `onBackgroundClick` to `setSelectedNodeId(null)` get the
        // full escape-without-keyboard behavior users expect on touch
        // devices where there is no Esc key.
        callbacksRef.current.onBackgroundClick?.();
      }
      requestRender();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      // Don't intercept shortcuts like Ctrl+C or Cmd+R
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
    draggingNodeRef,
    flushWorkerMessages,
    requestRender,
  ]);
}
