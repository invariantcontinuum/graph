import { useRef } from "react";

export function useDirtyCanvas(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
) {
  const dirtyRef = useRef(true);
  const lastSizeRef = useRef({ w: 0, h: 0 });

  const checkDirty = () => {
    const cvs = canvasRef.current;
    if (!cvs) return false;
    const { w, h } = lastSizeRef.current;
    if (w !== cvs.width || h !== cvs.height) {
      lastSizeRef.current = { w: cvs.width, h: cvs.height };
      dirtyRef.current = true;
    }
    return dirtyRef.current;
  };

  return { dirtyRef, checkDirty };
}
