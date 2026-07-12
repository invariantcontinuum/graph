import { useRef, useCallback } from "react";

/**
 * Hook to manage skipping redundant Canvas2D redraws on idle frames.
 * Returns a `markDirty` function to be called when engine data updates,
 * and a `shouldSkipDraw` function to short-circuit the requestAnimationFrame loop.
 */
export function useIdleRedraw() {
  const dirtyRef = useRef(true);
  const lastSizeRef = useRef({ w: 0, h: 0 });

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
  }, []);

  const shouldSkipDraw = useCallback((cvs: HTMLCanvasElement) => {
    if (
      !dirtyRef.current &&
      lastSizeRef.current.w === cvs.width &&
      lastSizeRef.current.h === cvs.height
    ) {
      return true;
    }
    dirtyRef.current = false;
    lastSizeRef.current.w = cvs.width;
    lastSizeRef.current.h = cvs.height;
    return false;
  }, []);

  return { markDirty, shouldSkipDraw };
}
