with open("react/Graph.tsx", "r") as f:
    content = f.read()

helpers = """
// Pure pointer event helpers

export function toLocalPointer(clientX: number, clientY: number, canvas: HTMLCanvasElement): { x: number, y: number } {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  return {
    x: (clientX - rect.left) * dpr,
    y: (clientY - rect.top) * dpr,
  };
}

export function handleHoverOnly(
  localX: number,
  localY: number,
  engine: any,
  canvas: HTMLCanvasElement,
  callbacks: { onNodeHover?: (node: any | null) => void },
  nodeFromId: (id: string) => any
): void {
  const hoveredId = engine?.handle_hover(localX, localY);
  if (hoveredId !== undefined) {
    canvas.style.cursor = hoveredId ? "pointer" : "default";
    callbacks.onNodeHover?.(hoveredId ? nodeFromId(hoveredId) : null);
  }
}

export function handleSinglePointerMove(
  localX: number,
  localY: number,
  singleMode: "drag" | "pan" | null,
  engine: any,
  canvas: HTMLCanvasElement,
  callbacks: { onNodeHover?: (node: any | null) => void },
  nodeFromId: (id: string) => any,
  flushWorkerMessages: () => void
): void {
  if (singleMode === "drag") {
    engine?.handle_node_drag_move(localX, localY);
    flushWorkerMessages();
  } else if (singleMode === "pan") {
    engine?.handle_pan_move(localX, localY);
    handleHoverOnly(localX, localY, engine, canvas, callbacks, nodeFromId);
  }
}

export function handlePinchMove(
  activePointers: Map<number, { id: number; x: number; y: number }>,
  lastPinchDist: number,
  lastCentroid: { x: number; y: number } | null,
  engine: any
): { dist: number; centroid: { x: number; y: number } } {
  const arr = [...activePointers.values()];
  const dx = arr[0].x - arr[1].x;
  const dy = arr[0].y - arr[1].y;
  const dist = Math.hypot(dx, dy);

  let cx = 0;
  let cy = 0;
  for (const p of activePointers.values()) {
    cx += p.x;
    cy += p.y;
  }
  cx /= activePointers.size;
  cy /= activePointers.size;
  const centroid = { x: cx, y: cy };

  const deltaZoom = dist / Math.max(lastPinchDist, 1e-3);
  engine?.handle_zoom(-Math.log(deltaZoom), centroid.x, centroid.y);
  if (lastCentroid) {
    engine?.handle_pan_start(lastCentroid.x, lastCentroid.y);
    engine?.handle_pan_move(centroid.x, centroid.y);
    engine?.handle_pan_end();
  }

  return { dist, centroid };
}
"""

idx = content.find("export const Graph = forwardRef")

content = content[:idx] + helpers + "\n" + content[idx:]

with open("react/Graph.tsx", "w") as f:
    f.write(content)
