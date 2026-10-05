import React from "react";

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

export function centroid(activePointers: Map<number, PointerState>): {
  x: number;
  y: number;
} {
  let x = 0;
  let y = 0;
  for (const p of activePointers.values()) {
    x += p.x;
    y += p.y;
  }
  return { x: x / activePointers.size, y: y / activePointers.size };
}

export function pinchDist(activePointers: Map<number, PointerState>): number {
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
  updateCursor: boolean = true,
) {
  const hoveredId = engine?.handle_hover(local.x, local.y);
  if (hoveredId !== undefined) {
    if (updateCursor) {
      canvas.style.cursor = hoveredId ? "pointer" : "default";
    }
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
    handleHoverOnly(local, engine, canvas, callbacks, nodeFromId, false);
  }
}

export interface PointerControllerState {
  active: Map<number, PointerState>;
  singleMode: "drag" | "pan" | null;
  suppressNextClick: boolean;
  lastPinchDist: number;
  lastCentroid: { x: number; y: number } | null;
  downPos: { x: number; y: number } | null;
}

export function handlePinchMove(
  state: PointerControllerState,
  engine: any,
) {
  const d = pinchDist(state.active);
  const c = centroid(state.active);
  const deltaZoom = d / Math.max(state.lastPinchDist, 1e-3);
  // handle_zoom(delta, x, y) — delta > 0 → zoom out, < 0 → zoom in.
  // Invert via -log so a growing distance zooms in.
  engine?.handle_zoom(-Math.log(deltaZoom), c.x, c.y);
  if (state.lastCentroid) {
    engine?.handle_pan_start(state.lastCentroid.x, state.lastCentroid.y);
    engine?.handle_pan_move(c.x, c.y);
    engine?.handle_pan_end();
  }
  state.lastPinchDist = d;
  state.lastCentroid = c;
}

export function handlePointerDown(
  e: PointerEvent,
  state: PointerControllerState,
  canvas: HTMLCanvasElement,
  engine: any,
  draggingNodeRef: React.MutableRefObject<string | null>,
  flushWorkerMessages: () => void,
) {
  canvas.setPointerCapture(e.pointerId);
  const local = toLocalPointer(e.clientX, e.clientY, canvas);
  state.active.set(e.pointerId, { id: e.pointerId, x: local.x, y: local.y });

  if (state.active.size === 1) {
    // Hit-test: if the pointer lands on a node, start a node-drag;
    // otherwise start a camera pan.
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
    canvas.style.cursor = "grabbing";
  } else if (state.active.size === 2) {
    // Second pointer joined — end any single-pointer gesture and begin pinch.
    if (state.singleMode === "drag") {
      engine?.handle_node_drag_end();
      flushWorkerMessages();
      draggingNodeRef.current = null;
      state.suppressNextClick = true;
    } else if (state.singleMode === "pan") {
      engine?.handle_pan_end();
    }
    state.singleMode = null;
    state.lastPinchDist = pinchDist(state.active);
    state.lastCentroid = centroid(state.active);
  }
}

export function handlePointerUp(
  e: PointerEvent,
  state: PointerControllerState,
  canvas: HTMLCanvasElement,
  engine: any,
  callbacks: {
    onNodeClick?: (node: any) => void;
    onNodeHover?: (node: any) => void;
  },
  nodeFromId: (id: string) => any,
  draggingNodeRef: React.MutableRefObject<string | null>,
  flushWorkerMessages: () => void,
) {
  if (canvas.hasPointerCapture(e.pointerId)) {
    canvas.releasePointerCapture(e.pointerId);
  }
  state.active.delete(e.pointerId);

  if (state.active.size === 0) {
    if (state.singleMode === "drag") {
      engine?.handle_node_drag_end();
      flushWorkerMessages();
      // A "click on node" also begins with a drag-start (because the
      // pointer-down hit-tested a node). If the pointer never moved
      // beyond the threshold, fire onNodeClick directly here — the
      // synthetic `click` event that follows would otherwise be
      // swallowed by the draggingNodeRef guard inside onClick.
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
      // Clear on next tick to suppress the synthetic click that fires
      // immediately after pointerup on the same element.
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
    handleHoverOnly(
      toLocalPointer(e.clientX, e.clientY, canvas),
      engine,
      canvas,
      callbacks,
      nodeFromId,
    );
  } else if (state.active.size === 1) {
    // Transitioned from pinch back to single pointer — resume panning from
    // the remaining pointer. Treat as a new pan gesture (not a drag).
    const only = [...state.active.values()][0];
    engine?.handle_pan_start(only.x, only.y);
    state.singleMode = "pan";
    canvas.style.cursor = "grabbing";
    // The next click would be a pinch-release → suppress.
    state.suppressNextClick = true;
  }
}

export function handleClick(
  e: MouseEvent,
  state: PointerControllerState,
  canvas: HTMLCanvasElement,
  engine: any,
  callbacks: {
    onNodeClick?: (node: any) => void;
    onBackgroundClick?: () => void;
  },
  nodeFromId: (id: string) => any,
  draggingNodeRef: React.MutableRefObject<string | null>,
) {
  if (state.suppressNextClick) {
    state.suppressNextClick = false;
    return;
  }
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

export function handleKeyDown(
  e: KeyboardEvent,
  engine: any,
  callbacks: {
    onBackgroundClick?: () => void;
  },
  requestRender: () => void,
) {
  // Don't intercept shortcuts like Ctrl+C or Cmd+R
  if (e.ctrlKey || e.metaKey || e.altKey) return;

  let handled = false;
  if (e.key === "Escape") {
    engine?.set_focus(undefined);
    callbacks.onBackgroundClick?.();
    requestRender();
    handled = true;
  } else if (e.key === "+" || e.key === "=") {
    engine?.zoom_in();
    requestRender();
    handled = true;
  } else if (e.key === "-" || e.key === "_") {
    engine?.zoom_out();
    requestRender();
    handled = true;
  } else if (e.key === "ArrowUp") {
    engine?.pan_by(0, -40);
    requestRender();
    handled = true;
  } else if (e.key === "ArrowDown") {
    engine?.pan_by(0, 40);
    requestRender();
    handled = true;
  } else if (e.key === "ArrowLeft") {
    engine?.pan_by(-40, 0);
    requestRender();
    handled = true;
  } else if (e.key === "ArrowRight") {
    engine?.pan_by(40, 0);
    requestRender();
    handled = true;
  } else if (e.key === "f" || e.key === "F") {
    engine?.fit(40);
    requestRender();
    handled = true;
  }

  if (handled) {
    e.preventDefault();
  }
}
