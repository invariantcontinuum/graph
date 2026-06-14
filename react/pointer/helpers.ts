export type PointerState = { id: number; x: number; y: number };

export const toLocalPointer = (
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
) => {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  return {
    x: (clientX - rect.left) * dpr,
    y: (clientY - rect.top) * dpr,
  };
};

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

export function pinchDist(activePointers: Map<number, PointerState>): number {
  const arr = [...activePointers.values()];
  const dx = arr[0].x - arr[1].x;
  const dy = arr[0].y - arr[1].y;
  return Math.hypot(dx, dy);
}
