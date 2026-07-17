import { useRef, useCallback, useEffect, type RefObject } from "react";

export function useDirtyCanvasFrame(canvasRef: RefObject<HTMLCanvasElement | null>) {
  const dirtyRef = useRef<boolean>(true);
  const lastSizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });

  useEffect(() => {
    dirtyRef.current = true;
  });

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
  }, []);

  const checkAndClearDirty = useCallback((): boolean => {
    const cvs = canvasRef.current;
    if (cvs) {
      if (cvs.width !== lastSizeRef.current.w || cvs.height !== lastSizeRef.current.h) {
        lastSizeRef.current.w = cvs.width;
        lastSizeRef.current.h = cvs.height;
        dirtyRef.current = true;
      }
    }
    if (!dirtyRef.current) return false;
    dirtyRef.current = false;
    return true;
  }, [canvasRef]);

  return { markDirty, checkAndClearDirty };
}
