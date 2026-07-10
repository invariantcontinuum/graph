import { describe, test, expect } from "vitest";
import { fitLabelInBox } from "./fitLabel";

// jsdom does not provide a real Canvas2D context; mock the surface used by
// fitLabelInBox. An average of ~6 px/char is close enough for the wrap logic
// to exercise its branches meaningfully.
const ctx = {
  font: "",
  measureText: (s: string) => ({ width: s.length * 6 }),
} as unknown as CanvasRenderingContext2D;

function fit(
  text: string,
  maxWidth = 100,
  maxHeight = 40,
  fontFamily = "sans-serif",
  fontWeight = 400,
  baseFontPx = 14,
  minFontPx = 7,
  dpr = 1,
) {
  return fitLabelInBox(
    ctx,
    text,
    maxWidth,
    maxHeight,
    fontFamily,
    fontWeight,
    baseFontPx,
    minFontPx,
    dpr,
  );
}

describe("fitLabelInBox", () => {
  test("returns null for empty label", () => {
    expect(fit("")).toBeNull();
  });

  test("single short word fits unwrapped", () => {
    const r = fit("hello", 200);
    expect(r?.lines).toEqual(["hello"]);
  });

  test("very long unbroken text ellipsizes at min font", () => {
    const r = fit("a".repeat(200), 60, 14);
    expect(r?.lines[0].endsWith("...")).toBe(true);
  });
});
