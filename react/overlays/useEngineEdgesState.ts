import { useEffect, useRef } from "react";
import type { GraphHandle } from "../Graph";

export interface EdgesState {
  edgeData: Float32Array | null;
  edgeTypeKeys: string[];
  focusIdx: number;
}

export function useEngineEdgesState(
  engineRef: React.RefObject<GraphHandle | null>,
  ready: boolean,
  dirtyRef: React.MutableRefObject<boolean>,
) {
  const edgesRef = useRef<EdgesState>({
    edgeData: null,
    edgeTypeKeys: [],
    focusIdx: -1,
  });

  useEffect(() => {
    if (!ready) return;
    const engine = engineRef.current;
    if (!engine) return;
    const unsub = engine.subscribeEdges(
      ({ edgeData, focusIdx, edgeTypeKeys }) => {
        edgesRef.current = { edgeData, focusIdx, edgeTypeKeys };
        dirtyRef.current = true;
      },
    );
    return unsub;
  }, [engineRef, ready, dirtyRef]);

  return edgesRef;
}
