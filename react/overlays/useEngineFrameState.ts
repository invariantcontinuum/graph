import { useEffect, useRef } from "react";
import type { GraphHandle } from "../Graph";

export interface FrameState {
  positions: Float32Array | null;
  vpMatrix: Float32Array | null;
}

export function useEngineFrameState(
  engineRef: React.RefObject<GraphHandle | null>,
  ready: boolean,
) {
  const frameRef = useRef<FrameState>({ positions: null, vpMatrix: null });
  const dirtyRef = useRef(true);

  useEffect(() => {
    if (!ready) return;
    const engine = engineRef.current;
    if (!engine) return;
    const unsub = engine.subscribeFrame(({ positions, vpMatrix }) => {
      frameRef.current = { positions, vpMatrix };
      dirtyRef.current = true;
    });
    return unsub;
  }, [engineRef, ready]);

  return { frameRef, dirtyRef };
}
