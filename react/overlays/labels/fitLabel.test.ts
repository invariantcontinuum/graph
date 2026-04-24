import { describe, test, expect } from "vitest";
import { fitLabelInBox, type FitLabelOptions } from "./fitLabel";

// jsdom does not provide a real Canvas2D context; mock the surface used by
// fitLabelInBox. An average of ~6 px/char is close enough for the wrap logic
// to exercise its branches meaningfully.
const ctx = {
  font: "",
  measureText: (s: string) => ({ width: s.length * 6 }),
} as unknown as CanvasRenderingContext2D;

function opts(overrides: Partial<FitLabelOptions>): FitLabelOptions {
  return {
    ctx,
    text: "",
    maxWidth: 100,
    maxHeight: 40,
    fontFamily: "sans-serif",
    fontWeight: 400,
    baseFontPx: 14,
    minFontPx: 7,
    dpr: 1,
    ...overrides,
  };
}

describe("fitLabelInBox", () => {
  test("returns null for empty label", () => {
    expect(fitLabelInBox(opts({ text: "" }))).toBeNull();
  });

  test("single short word fits unwrapped", () => {
    const r = fitLabelInBox(opts({ text: "hello", maxWidth: 200 }));
    expect(r?.lines).toEqual(["hello"]);
  });

  test("very long unbroken text ellipsizes at min font", () => {
    const r = fitLabelInBox(
      opts({ text: "a".repeat(200), maxWidth: 60, maxHeight: 14 }),
    );
    expect(r?.lines[0].endsWith("...")).toBe(true);
  });
});
