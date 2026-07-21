import { useRef, useCallback } from "react";

export function useDirtyCanvas() {
  const dirtyRef = useRef(true);
  const lastDim = useRef({ w: -1, h: -1 });

  const checkDirty = useCallback((cvs: HTMLCanvasElement) => {
    if (cvs.width !== lastDim.current.w || cvs.height !== lastDim.current.h) {
      dirtyRef.current = true;
      lastDim.current.w = cvs.width;
      lastDim.current.h = cvs.height;
    }
    const dirty = dirtyRef.current;
    dirtyRef.current = false;
    return dirty;
  }, []);

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
  }, []);

  return { checkDirty, markDirty };
}
