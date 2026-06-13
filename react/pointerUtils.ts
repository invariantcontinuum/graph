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
