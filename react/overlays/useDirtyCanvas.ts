import { useRef, useCallback, type MutableRefObject } from "react";

export function useDirtyCanvas() {
  const dirtyRef = useRef(true);
  const lastDim = useRef({ w: -1, h: -1 });

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
  }, []);

  const renderFrame = useCallback(
    (
      cvs: HTMLCanvasElement,
      rafRef: MutableRefObject<number | null>,
      tick: () => void,
      draw: (ctx: CanvasRenderingContext2D) => void,
    ) => {
      if (cvs.width !== lastDim.current.w || cvs.height !== lastDim.current.h) {
        dirtyRef.current = true;
        lastDim.current.w = cvs.width;
        lastDim.current.h = cvs.height;
      }
      const dirty = dirtyRef.current;
      dirtyRef.current = false;

      if (dirty) {
        const ctx = cvs.getContext("2d");
        if (ctx) {
          draw(ctx);
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    },
    [],
  );

  return { renderFrame, markDirty };
}
