export type PointerState = { id: number; x: number; y: number };

export function toLocalPointer(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  return {
    x: (clientX - rect.left) * dpr,
    y: (clientY - rect.top) * dpr,
  };
}

export function centroid(
  activePointers: Map<number, PointerState>,
): { x: number; y: number } {
  let x = 0;
  let y = 0;
  for (const p of activePointers.values()) {
    x += p.x;
    y += p.y;
  }
  return { x: x / activePointers.size, y: y / activePointers.size };
}

export function pinchDist(
  activePointers: Map<number, PointerState>,
): number {
  const arr = [...activePointers.values()];
  const dx = arr[0].x - arr[1].x;
  const dy = arr[0].y - arr[1].y;
  return Math.hypot(dx, dy);
}

export function handleHoverOnly(
  local: { x: number; y: number },
  engine: any,
  canvas: HTMLCanvasElement,
  callbacks: {
    onNodeHover?: (node: any) => void;
  },
  nodeFromId: (id: string) => any,
) {
  const hoveredId = engine?.handle_hover(local.x, local.y);
  if (hoveredId !== undefined) {
    canvas.style.cursor = hoveredId ? "pointer" : "default";
    callbacks.onNodeHover?.(hoveredId ? nodeFromId(hoveredId) : null);
  }
}

export function handleSinglePointerMove(
  local: { x: number; y: number },
  mode: "drag" | "pan" | null,
  engine: any,
  canvas: HTMLCanvasElement,
  callbacks: {
    onNodeHover?: (node: any) => void;
  },
  nodeFromId: (id: string) => any,
  flushWorkerMessages: () => void,
) {
  if (mode === "drag") {
    engine?.handle_node_drag_move(local.x, local.y);
    flushWorkerMessages();
  } else if (mode === "pan") {
    engine?.handle_pan_move(local.x, local.y);
    handleHoverOnly(local, engine, canvas, callbacks, nodeFromId);
  }
}

export function handlePinchMove(
  activePointers: Map<number, PointerState>,
  engine: any,
  lastPinchDist: number,
  lastCentroid: { x: number; y: number } | null,
) {
  const d = pinchDist(activePointers);
  const c = centroid(activePointers);
  const deltaZoom = d / Math.max(lastPinchDist, 1e-3);
  // handle_zoom(delta, x, y) — delta > 0 → zoom out, < 0 → zoom in.
  // Invert via -log so a growing distance zooms in.
  engine?.handle_zoom(-Math.log(deltaZoom), c.x, c.y);
  if (lastCentroid) {
    engine?.handle_pan_start(lastCentroid.x, lastCentroid.y);
    engine?.handle_pan_move(c.x, c.y);
    engine?.handle_pan_end();
  }
  return { d, c };
}


export interface GestureState {
  singleMode: "drag" | "pan" | null;
  suppressNextClick: boolean;
  lastPinchDist: number;
  lastCentroid: { x: number; y: number } | null;
  downPos: { x: number; y: number } | null;
}


export function handlePointerDown(
  e: PointerEvent,
  canvas: HTMLCanvasElement,
  active: Map<number, PointerState>,
  engine: any,
  draggingNodeRef: { current: string | null },
  state: GestureState,
  flushWorkerMessages: () => void,
) {
  canvas.setPointerCapture(e.pointerId);
  const local = toLocalPointer(e.clientX, e.clientY, canvas);
  active.set(e.pointerId, { id: e.pointerId, x: local.x, y: local.y });

  if (active.size === 1) {
    const nodeId = engine?.handle_node_drag_start(local.x, local.y);
    if (nodeId) {
      draggingNodeRef.current = nodeId;
      state.singleMode = "drag";
      state.downPos = { x: local.x, y: local.y };
      flushWorkerMessages();
    } else {
      engine?.handle_pan_start(local.x, local.y);
      state.singleMode = "pan";
      state.downPos = null;
    }
  } else if (active.size === 2) {
    if (state.singleMode === "drag") {
      engine?.handle_node_drag_end();
      flushWorkerMessages();
      draggingNodeRef.current = null;
      state.suppressNextClick = true;
    } else if (state.singleMode === "pan") {
      engine?.handle_pan_end();
    }
    state.singleMode = null;
    state.lastPinchDist = pinchDist(active);
    state.lastCentroid = centroid(active);
  }
}


export function handlePointerUp(
  e: PointerEvent,
  canvas: HTMLCanvasElement,
  active: Map<number, PointerState>,
  engine: any,
  draggingNodeRef: { current: string | null },
  state: GestureState,
  callbacks: {
    onNodeClick?: (node: any) => void;
  },
  nodeFromId: (id: string) => any,
  flushWorkerMessages: () => void,
) {
  if (canvas.hasPointerCapture(e.pointerId)) {
    canvas.releasePointerCapture(e.pointerId);
  }
  active.delete(e.pointerId);

  if (active.size === 0) {
    if (state.singleMode === "drag") {
      engine?.handle_node_drag_end();
      flushWorkerMessages();
      const movedThreshold = 4;
      const localUp = toLocalPointer(e.clientX, e.clientY, canvas);
      const moved = state.downPos
        ? Math.abs(localUp.x - state.downPos.x) > movedThreshold ||
          Math.abs(localUp.y - state.downPos.y) > movedThreshold
        : false;
      const pickedId = draggingNodeRef.current;
      if (!moved && pickedId) {
        callbacks.onNodeClick?.(nodeFromId(pickedId));
        state.suppressNextClick = true;
      }
      setTimeout(() => {
        draggingNodeRef.current = null;
      }, 0);
      state.downPos = null;
    } else if (state.singleMode === "pan") {
      engine?.handle_pan_end();
    }
    state.singleMode = null;
    state.lastCentroid = null;
    state.lastPinchDist = 0;
  } else if (active.size === 1) {
    const only = [...active.values()][0];
    engine?.handle_pan_start(only.x, only.y);
    state.singleMode = "pan";
    state.suppressNextClick = true;
  }
}


export function handleClick(
  e: MouseEvent,
  canvas: HTMLCanvasElement,
  engine: any,
  draggingNodeRef: { current: string | null },
  state: GestureState,
  callbacks: {
    onNodeClick?: (node: any) => void;
    onBackgroundClick?: () => void;
  },
  nodeFromId: (id: string) => any,
) {
  if (state.suppressNextClick) {
    state.suppressNextClick = false;
    return;
  }
  if (draggingNodeRef.current !== null) return;
  const local = toLocalPointer(e.clientX, e.clientY, canvas);
  const clickedId = engine?.handle_click(local.x, local.y);
  if (clickedId) {
    callbacks.onNodeClick?.(nodeFromId(clickedId));
  } else {
    callbacks.onBackgroundClick?.();
  }
}
