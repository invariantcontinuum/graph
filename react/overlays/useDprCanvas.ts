import { useEffect, useRef } from "react";

/** Resize a canvas element to match its CSS dimensions x devicePixelRatio.
 *  Observes size changes via ResizeObserver. */
export function useDprCanvas(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  onResize?: () => void,
) {
  const onResizeRef = useRef(onResize);

  // Keep ref up to date to avoid stale closures in the ResizeObserver
  useEffect(() => {
    onResizeRef.current = onResize;
  }, [onResize]);

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      cvs.width = cvs.clientWidth * dpr;
      cvs.height = cvs.clientHeight * dpr;
      onResizeRef.current?.();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cvs);
    return () => ro.disconnect();
  }, [canvasRef]);
}
