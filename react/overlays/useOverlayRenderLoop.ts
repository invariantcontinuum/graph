import { useEffect, useRef } from "react";
import { useDprCanvas } from "./useDprCanvas";

export function useOverlayRenderLoop(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  dirtyRef: React.MutableRefObject<boolean>,
  renderFrame: (ctx: CanvasRenderingContext2D, cvs: HTMLCanvasElement) => void,
) {
  useDprCanvas(canvasRef, dirtyRef);
  const rafRef = useRef<number | null>(null);
  const isVisibleRef = useRef<boolean>(true);

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;

    // Force a redraw whenever dependencies (like themes or node state) change
    // and recreate the effect, ensuring the UI doesn't become stale.
    dirtyRef.current = true;

    const tick = () => {
      const ctx = cvs.getContext("2d");
      if (ctx && dirtyRef.current && isVisibleRef.current) {
        dirtyRef.current = false;
        ctx.clearRect(0, 0, cvs.width, cvs.height);
        renderFrame(ctx, cvs);
      }

      if (isVisibleRef.current) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    };

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]) {
        const visible = entries[0].isIntersecting;
        isVisibleRef.current = visible;
        if (visible) {
          dirtyRef.current = true;
          if (rafRef.current === null) {
            rafRef.current = requestAnimationFrame(tick);
          }
        }
      }
    });

    observer.observe(cvs);

    if (rafRef.current === null && isVisibleRef.current) {
      rafRef.current = requestAnimationFrame(tick);
    }

    return () => {
      observer.disconnect();
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [canvasRef, dirtyRef, renderFrame]);
}
