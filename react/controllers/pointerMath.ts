export type PointerState = { id: number; x: number; y: number };

export function toLocalPointer(
  e: PointerEvent | MouseEvent,
  canvas: HTMLCanvasElement,
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  return {
    x: (e.clientX - rect.left) * dpr,
    y: (e.clientY - rect.top) * dpr,
  };
}

export function centroid(active: Map<number, PointerState>): {
  x: number;
  y: number;
} {
  let x = 0;
  let y = 0;
  for (const p of active.values()) {
    x += p.x;
    y += p.y;
  }
  return { x: x / active.size, y: y / active.size };
}

export function pinchDist(active: Map<number, PointerState>): number {
  if (active.size < 2) return 0;
  const arr = [...active.values()];
  const dx = arr[0].x - arr[1].x;
  const dy = arr[0].y - arr[1].y;
  return Math.hypot(dx, dy);
}
