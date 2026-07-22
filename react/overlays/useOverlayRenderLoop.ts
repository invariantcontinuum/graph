import { useEffect, useRef } from "react";
import { useDprCanvas } from "./useDprCanvas";

export function useOverlayRenderLoop(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  dirtyRef: React.MutableRefObject<boolean>,
  renderFrame: (ctx: CanvasRenderingContext2D, cvs: HTMLCanvasElement) => void,
) {
  useDprCanvas(canvasRef, dirtyRef);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;

    // Force a redraw whenever dependencies (like themes or node state) change
    // and recreate the effect, ensuring the UI doesn't become stale.
    dirtyRef.current = true;

    const tick = () => {
      const ctx = cvs.getContext("2d");
      if (!ctx || !dirtyRef.current) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      dirtyRef.current = false;
      ctx.clearRect(0, 0, cvs.width, cvs.height);
      renderFrame(ctx, cvs);

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [canvasRef, dirtyRef, renderFrame]);
}
