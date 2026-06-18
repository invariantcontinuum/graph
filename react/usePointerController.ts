import React, { useEffect } from "react";
import {
  toLocalPointer,
  handleHoverOnly,
  handleSinglePointerMove,
  handlePinchMove,
  handlePointerDown,
  handlePointerUp,
  handleClick,
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
      const res = handlePointerDown(e, canvas, active, engineRef.current, draggingNodeRef, flushWorkerMessages);
      if (res.newSingleMode !== null) singleMode = res.newSingleMode;
      if (res.newDownPos !== null || singleMode === "pan") downPos = res.newDownPos;
      if (active.size === 2) {
        singleMode = null;
        lastPinchDist = res.newPinchDist;
        lastCentroid = res.newCentroid;
      }
      if (res.suppressNextClick) suppressNextClick = true;
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
      const res = handlePointerUp(
        e,
        canvas,
        active,
        engineRef.current,
        singleMode,
        downPos,
        draggingNodeRef,
        callbacksRef.current,
        nodeFromId,
        flushWorkerMessages
      );
      singleMode = res.newSingleMode;
      if (res.newSuppressNextClick) suppressNextClick = true;
      if (active.size === 0) {
        lastCentroid = null;
        lastPinchDist = 0;
        downPos = null;
      }
      requestRender();
    };

    const onClick = (e: MouseEvent) => {
      if (suppressNextClick) {
        suppressNextClick = false;
        return;
      }
      handleClick(e, canvas, engineRef.current, draggingNodeRef, callbacksRef.current, nodeFromId);
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
