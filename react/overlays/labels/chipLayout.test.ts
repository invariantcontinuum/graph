import { describe, test, expect } from "vitest";
import { layoutLabelChip, glyphSupported } from "./chipLayout";

// Same mock approach as fitLabel.test.ts: ~6px per char.
const ctx = {
  font: "",
  measureText: (s: string) => ({ width: s.length * 6 }),
} as unknown as CanvasRenderingContext2D;

describe("layoutLabelChip", () => {
  test("composes glyph + name on one line when it fits", () => {
    const text = "⚙ api-gateway";
    const c = layoutLabelChip(ctx, {
      text, chars: Array.from(text), typeTag: "SERVICE",
      maxWidthPx: 200, fontPx: 12, tagFontPx: 8, showTag: true,
    });
    expect(c).not.toBeNull();
    expect(c!.lines).toEqual(["⚙ api-gateway"]);
    expect(c!.tag).toBe("SERVICE");
    expect(c!.heightPx).toBeGreaterThan(24); // name line + tag line + padding
  });

  test("omits tag when showTag is false (zoom gate)", () => {
    const text = "⚙ api";
    const c = layoutLabelChip(ctx, {
      text, chars: Array.from(text), typeTag: "SERVICE",
      maxWidthPx: 200, fontPx: 12, tagFontPx: 8, showTag: false,
    });
    expect(c!.tag).toBeNull();
  });

  test("null glyph renders name only", () => {
    const text = "api";
    const c = layoutLabelChip(ctx, {
      text, chars: Array.from(text), typeTag: null,
      maxWidthPx: 200, fontPx: 12, tagFontPx: 8, showTag: true,
    });
    expect(c!.lines).toEqual(["api"]);
  });

  test("returns null when the name cannot fit even ellipsized", () => {
    const text = "⚙ " + "x".repeat(500);
    const c = layoutLabelChip(ctx, {
      text, chars: Array.from(text), typeTag: null,
      maxWidthPx: 12, fontPx: 12, tagFontPx: 8, showTag: false,
    });
    expect(c).toBeNull();
  });
});

describe("glyphSupported", () => {
  test("tofu-width equality marks a glyph unsupported", () => {
    // mock gives every string a distinct width by length, so a 1-char glyph
    // and 1-char U+FFFF compare equal -> unsupported. A 2-char glyph differs.
    expect(glyphSupported(ctx, "⚙")).toBe(false);
    expect(glyphSupported(ctx, "⚙x")).toBe(true);
  });
});
