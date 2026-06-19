import React, { useEffect } from "react";
import {
  toLocalPointer,
  centroid,
  pinchDist,
  handleHoverOnly,
  handleSinglePointerMove,
  handlePinchMove,
  handlePointerDown,
  handlePointerUp,
  handleClick,
  PointerState,
  GestureState,
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
    const state: GestureState = {
      singleMode: null,
      suppressNextClick: false,
      lastPinchDist: 0,
      lastCentroid: null,
      downPos: null,
    };

    const onDown = (e: PointerEvent) => {
      handlePointerDown(
        e,
        canvas,
        active,
        engineRef.current,
        draggingNodeRef,
        state,
        flushWorkerMessages,
      );
      requestRender();
    };

    const onMove = (e: PointerEvent) => {
      const local = toLocalPointer(e.clientX, e.clientY, canvas);
      const existing = active.get(e.pointerId);

      if (!existing) {
        handleHoverOnly(local, engineRef.current, canvas, callbacksRef.current, nodeFromId);
        requestRender();
        return;
      }

      active.set(e.pointerId, { id: e.pointerId, x: local.x, y: local.y });

      if (active.size === 1) {
        handleSinglePointerMove(local, state.singleMode, engineRef.current, canvas, callbacksRef.current, nodeFromId, flushWorkerMessages);
      } else if (active.size === 2) {
        const { d, c } = handlePinchMove(active, engineRef.current, state.lastPinchDist, state.lastCentroid);
        state.lastPinchDist = d;
        state.lastCentroid = c;
      }
      requestRender();
    };

    const onUp = (e: PointerEvent) => {
      handlePointerUp(
        e,
        canvas,
        active,
        engineRef.current,
        draggingNodeRef,
        state,
        callbacksRef.current,
        nodeFromId,
        flushWorkerMessages,
      );
      requestRender();
    };

    const onClick = (e: MouseEvent) => {
      handleClick(
        e,
        canvas,
        engineRef.current,
        draggingNodeRef,
        state,
        callbacksRef.current,
        nodeFromId,
      );
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
    draggingNodeRef,
    flushWorkerMessages,
    requestRender,
  ]);
}
