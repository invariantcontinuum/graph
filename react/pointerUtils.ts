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

export function handlePointerDown(
  e: PointerEvent,
  canvas: HTMLCanvasElement,
  active: Map<number, PointerState>,
  engine: any,
  draggingNodeRef: React.MutableRefObject<string | null>,
  flushWorkerMessages: () => void,
) {
  canvas.setPointerCapture(e.pointerId);
  const local = toLocalPointer(e.clientX, e.clientY, canvas);
  active.set(e.pointerId, { id: e.pointerId, x: local.x, y: local.y });

  let newSingleMode: "drag" | "pan" | null = null;
  let newDownPos: { x: number; y: number } | null = null;
  let newPinchDist = 0;
  let newCentroid: { x: number; y: number } | null = null;
  let suppressNextClick = false;

  if (active.size === 1) {
    // Hit-test: if the pointer lands on a node, start a node-drag;
    // otherwise start a camera pan.
    const nodeId = engine?.handle_node_drag_start(local.x, local.y);
    if (nodeId) {
      draggingNodeRef.current = nodeId;
      newSingleMode = "drag";
      newDownPos = { x: local.x, y: local.y };
      flushWorkerMessages();
    } else {
      engine?.handle_pan_start(local.x, local.y);
      newSingleMode = "pan";
    }
  } else if (active.size === 2) {
    // Second pointer joined — end any single-pointer gesture and begin pinch.
    const currentMode = draggingNodeRef.current ? "drag" : "pan"; // Approximation of singleMode
    if (currentMode === "drag" && draggingNodeRef.current) {
      engine?.handle_node_drag_end();
      flushWorkerMessages();
      draggingNodeRef.current = null;
      suppressNextClick = true;
    } else {
      engine?.handle_pan_end();
    }
    newPinchDist = pinchDist(active);
    newCentroid = centroid(active);
  }

  return { newSingleMode, newDownPos, newPinchDist, newCentroid, suppressNextClick };
}

export function handlePointerUp(
  e: PointerEvent,
  canvas: HTMLCanvasElement,
  active: Map<number, PointerState>,
  engine: any,
  singleMode: "drag" | "pan" | null,
  downPos: { x: number; y: number } | null,
  draggingNodeRef: React.MutableRefObject<string | null>,
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

  let newSingleMode = singleMode;
  let newSuppressNextClick = false;

  if (active.size === 0) {
    if (singleMode === "drag") {
      engine?.handle_node_drag_end();
      flushWorkerMessages();
      // A "click on node" also begins with a drag-start (because the
      // pointer-down hit-tested a node). If the pointer never moved
      // beyond the threshold, fire onNodeClick directly here — the
      // synthetic `click` event that follows would otherwise be
      // swallowed by the draggingNodeRef guard inside onClick.
      const movedThreshold = 4;
      const localUp = toLocalPointer(e.clientX, e.clientY, canvas);
      const moved = downPos
        ? Math.abs(localUp.x - downPos.x) > movedThreshold ||
          Math.abs(localUp.y - downPos.y) > movedThreshold
        : false;
      const pickedId = draggingNodeRef.current;
      if (!moved && pickedId) {
        callbacks.onNodeClick?.(nodeFromId(pickedId));
        newSuppressNextClick = true;
      }
      // Clear on next tick to suppress the synthetic click that fires
      // immediately after pointerup on the same element.
      setTimeout(() => {
        draggingNodeRef.current = null;
      }, 0);
    } else if (singleMode === "pan") {
      engine?.handle_pan_end();
    }
    newSingleMode = null;
  } else if (active.size === 1) {
    // Transitioned from pinch back to single pointer — resume panning from
    // the remaining pointer. Treat as a new pan gesture (not a drag).
    const only = [...active.values()][0];
    engine?.handle_pan_start(only.x, only.y);
    newSingleMode = "pan";
    // The next click would be a pinch-release → suppress.
    newSuppressNextClick = true;
  }

  return { newSingleMode, newSuppressNextClick };
}

export function handleClick(
  e: MouseEvent,
  canvas: HTMLCanvasElement,
  engine: any,
  draggingNodeRef: React.MutableRefObject<string | null>,
  callbacks: {
    onNodeClick?: (node: any) => void;
    onBackgroundClick?: () => void;
  },
  nodeFromId: (id: string) => any,
) {
  if (draggingNodeRef.current !== null) return; // consumed by drag
  const local = toLocalPointer(e.clientX, e.clientY, canvas);
  const clickedId = engine?.handle_click(local.x, local.y);
  if (clickedId) {
    callbacks.onNodeClick?.(nodeFromId(clickedId));
  } else {
    // Clicking empty canvas clears spotlight — Cytoscape parity. Hosts
    // that wire `onBackgroundClick` to `setSelectedNodeId(null)` get the
    // full escape-without-keyboard behavior users expect on touch
    // devices where there is no Esc key.
    callbacks.onBackgroundClick?.();
  }
}
