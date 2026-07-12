import { useRef, useCallback, useEffect } from "react";

/**
 * Hook to manage skipping redundant Canvas2D redraws on idle frames.
 * Encapsulates the requestAnimationFrame loop, dirty state tracking, and canvas clearing.
 */
export function useCanvasRenderLoop(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  drawFn: (ctx: CanvasRenderingContext2D, cvs: HTMLCanvasElement) => void,
  deps: unknown[],
) {
  const dirtyRef = useRef(true);
  const lastSizeRef = useRef({ w: 0, h: 0 });
  const rafRef = useRef<number | null>(null);

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
  }, []);

  useEffect(() => {
    dirtyRef.current = true;
    const cvs = canvasRef.current;
    if (!cvs) return;

    const tick = () => {
      if (
        !dirtyRef.current &&
        lastSizeRef.current.w === cvs.width &&
        lastSizeRef.current.h === cvs.height
      ) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      dirtyRef.current = false;
      lastSizeRef.current.w = cvs.width;
      lastSizeRef.current.h = cvs.height;

      const ctx = cvs.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, cvs.width, cvs.height);
        drawFn(ctx, cvs);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return markDirty;
}
