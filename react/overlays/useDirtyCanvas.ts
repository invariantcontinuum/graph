import { useCallback, useRef } from "react";

export function useDirtyCanvas() {
  const dirtyRef = useRef(true);

  // Any React prop update (theme, label data, layout bounds) should trigger
  // at least one redraw. We set this directly in the render body.
  dirtyRef.current = true;

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
  }, []);

  const checkDirtyAndClear = useCallback(() => {
    if (dirtyRef.current) {
      dirtyRef.current = false;
      return true;
    }
    return false;
  }, []);

  return { markDirty, checkDirtyAndClear };
}
