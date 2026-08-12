import React, { useEffect, useRef, useCallback } from "react";
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
  const stateRef = useRef<PointerControllerState>({
    active: new Map(),
    singleMode: null,
    suppressNextClick: false,
    lastPinchDist: 0,
    lastCentroid: null,
    downPos: null,
  });

  const onDown = useCallback(
    (e: PointerEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      handlePointerDown(
        e,
        stateRef.current,
        canvas,
        engineRef.current,
        draggingNodeRef,
        flushWorkerMessages,
      );
      requestRender();
    },
    [canvasRef, engineRef, draggingNodeRef, flushWorkerMessages, requestRender],
  );

  const onMove = useCallback(
    (e: PointerEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const state = stateRef.current;
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

      state.active.set(e.pointerId, {
        id: e.pointerId,
        x: local.x,
        y: local.y,
      });

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
        handlePinchMove(state, engineRef.current);
      }
      requestRender();
    },
    [
      canvasRef,
      engineRef,
      callbacksRef,
      nodeFromId,
      flushWorkerMessages,
      requestRender,
    ],
  );

  const onUp = useCallback(
    (e: PointerEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      handlePointerUp(
        e,
        stateRef.current,
        canvas,
        engineRef.current,
        callbacksRef.current,
        nodeFromId,
        draggingNodeRef,
        flushWorkerMessages,
      );
      requestRender();
    },
    [
      canvasRef,
      engineRef,
      callbacksRef,
      nodeFromId,
      draggingNodeRef,
      flushWorkerMessages,
      requestRender,
    ],
  );

  const onClick = useCallback(
    (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      handleClick(
        e,
        stateRef.current,
        canvas,
        engineRef.current,
        callbacksRef.current,
        nodeFromId,
        draggingNodeRef,
      );
      requestRender();
    },
    [canvasRef, engineRef, callbacksRef, nodeFromId, draggingNodeRef, requestRender],
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      handleKeyDown(e, engineRef.current, callbacksRef.current, requestRender);
    },
    [engineRef, callbacksRef, requestRender],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

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
  }, [canvasRef, onDown, onMove, onUp, onClick, onKeyDown]);
}
