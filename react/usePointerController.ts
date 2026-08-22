import React, { useEffect } from "react";
import {
  toLocalPointer,
  handleHoverOnly,
  handleSinglePointerMove,
  handlePinchMove,
  handlePointerDown,
  handlePointerUp,
  handleClick,
  handleKeyDown,
  PointerControllerState,
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

    const state: PointerControllerState = {
      active: new Map(),
      singleMode: null,
      suppressNextClick: false,
      lastPinchDist: 0,
      lastCentroid: null,
      downPos: null,
    };

    const onDown = (e: PointerEvent) => {
      handlePointerDown(
        e,
        state,
        canvas,
        engineRef.current,
        draggingNodeRef,
        flushWorkerMessages,
      );
      requestRender();
    };

    const onMove = (e: PointerEvent) => {
      const local = toLocalPointer(e.clientX, e.clientY, canvas);
      const existing = state.active.get(e.pointerId);

      if (!existing) {
        // Hovering without a button pressed
        handleHoverOnly(
          local,
          engineRef.current,
          canvas,
          callbacksRef.current,
          nodeFromId,
        );
        requestRender();
        return;
      }

      existing.x = local.x;
      existing.y = local.y;

      if (state.active.size === 1) {
        handleSinglePointerMove(
          local,
          state.singleMode,
          engineRef.current,
          canvas,
          callbacksRef.current,
          nodeFromId,
          flushWorkerMessages,
        );
      } else if (state.active.size === 2) {
        const { d, c } = handlePinchMove(
          state.active,
          engineRef.current,
          state.lastPinchDist,
          state.lastCentroid,
        );
        state.lastPinchDist = d;
        state.lastCentroid = c;
      }
      requestRender();
    };

    const onUp = (e: PointerEvent) => {
      handlePointerUp(
        e,
        state,
        canvas,
        engineRef.current,
        callbacksRef.current,
        nodeFromId,
        draggingNodeRef,
        flushWorkerMessages,
      );
      requestRender();
    };

    const onClick = (e: MouseEvent) => {
      handleClick(
        e,
        state,
        canvas,
        engineRef.current,
        callbacksRef.current,
        nodeFromId,
        draggingNodeRef,
      );
      requestRender();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      handleKeyDown(e, engineRef.current, callbacksRef.current, requestRender);
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
