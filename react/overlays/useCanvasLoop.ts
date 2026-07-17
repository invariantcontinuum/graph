import { useEffect, useRef } from "react";

export function useCanvasLoop(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  checkDirtyAndClear: () => boolean,
  renderFn: (ctx: CanvasRenderingContext2D, cvs: HTMLCanvasElement) => void,
  deps: React.DependencyList
) {
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;

    const tick = () => {
      const ctx = cvs.getContext("2d");
      if (!ctx) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      if (!checkDirtyAndClear()) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      ctx.clearRect(0, 0, cvs.width, cvs.height);
      renderFn(ctx, cvs);

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, deps);
}
