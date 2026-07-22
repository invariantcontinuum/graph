import { useEffect } from "react";

/** Resize a canvas element to match its CSS dimensions x devicePixelRatio.
 *  Observes size changes via ResizeObserver. */
export function useDprCanvas(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  dirtyRef?: React.MutableRefObject<boolean>,
) {
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const newWidth = cvs.clientWidth * dpr;
      const newHeight = cvs.clientHeight * dpr;
      if (cvs.width !== newWidth || cvs.height !== newHeight) {
        cvs.width = newWidth;
        cvs.height = newHeight;
        if (dirtyRef) dirtyRef.current = true;
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cvs);
    return () => ro.disconnect();
  }, [canvasRef]);
}
