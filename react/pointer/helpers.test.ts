import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { toLocalPointer, centroid, pinchDist, PointerState } from "./helpers";

describe("pointer helpers", () => {
  let originalWindow: any;

  beforeEach(() => {
    originalWindow = global.window;
    global.window = { devicePixelRatio: 1 } as any;
  });

  afterEach(() => {
    global.window = originalWindow;
  });

  it("toLocalPointer", () => {
    const mockCanvas = {
      getBoundingClientRect: () => ({ left: 10, top: 20 }),
    } as HTMLCanvasElement;

    // Test with standard DPR
    expect(toLocalPointer(30, 50, mockCanvas)).toEqual({ x: 20, y: 30 });

    // Test with high DPR
    global.window.devicePixelRatio = 2;
    expect(toLocalPointer(30, 50, mockCanvas)).toEqual({ x: 40, y: 60 });
  });

  it("centroid", () => {
    const map = new Map<number, PointerState>([
      [1, { id: 1, x: 0, y: 0 }],
      [2, { id: 2, x: 10, y: 20 }],
    ]);
    expect(centroid(map)).toEqual({ x: 5, y: 10 });
  });

  it("pinchDist", () => {
    const map = new Map<number, PointerState>([
      [1, { id: 1, x: 0, y: 0 }],
      [2, { id: 2, x: 3, y: 4 }],
    ]);
    expect(pinchDist(map)).toBe(5);
  });
});
