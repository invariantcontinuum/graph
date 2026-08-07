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
  rawText: string,
  maxWidth = 100,
  maxHeight = 40,
  fontFamily = "sans-serif",
  fontWeight = 400,
  baseFontPx = 14,
  minFontPx = 7,
  dpr = 1,
) {
  const text = rawText.replaceAll(/\s+/g, " ").trim();
  const chars = Array.from(text);
  return fitLabelInBox(
    ctx,
    text,
    chars,
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
    expect(r?.lines[0].endsWith("…")).toBe(true);
  });

  test("ellipsization never splits surrogate pairs (emoji)", () => {
    // Each emoji is one code point but two UTF-16 code units; truncating by
    // code unit would leave a lone surrogate in the output.
    const r = fit("🎉".repeat(100), 60, 14);
    const line = r?.lines[0] ?? "";
    expect(line.endsWith("…")).toBe(true);
    const body = line.slice(0, -1);
    expect([...body].every((ch) => ch === "🎉")).toBe(true);
    expect(body.length % 2).toBe(0);
  });
});
