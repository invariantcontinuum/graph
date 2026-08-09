import { describe, test, expect } from "vitest";
import { buildGraphTheme, tintFill } from "./buildTheme";
import { LIGHT, DARK, NODE_TYPES } from "./palette";
import { TYPE_STYLES } from "./typeStyles";

describe("buildGraphTheme", () => {
  test("dark: every node type fill is a tint of its border color", () => {
    const t = buildGraphTheme("dark");
    for (const type of NODE_TYPES) {
      expect(t.nodeTypes[type].color, `${type} fill`).toBe(
        tintFill(DARK.typeBorders[type], 0.2),
      );
    }
  });

  test("light: every node type fill is a tint of its border color", () => {
    const t = buildGraphTheme("light");
    for (const type of NODE_TYPES) {
      expect(t.nodeTypes[type].color).toBe(
        tintFill(LIGHT.typeBorders[type], 0.12),
      );
    }
  });

  test("per-type borders come from the matching palette", () => {
    const dark = buildGraphTheme("dark");
    const light = buildGraphTheme("light");
    for (const type of NODE_TYPES) {
      expect(dark.nodeTypes[type].borderColor).toBe(DARK.typeBorders[type]);
      expect(light.nodeTypes[type].borderColor).toBe(LIGHT.typeBorders[type]);
    }
  });

  test("shape + size come from TYPE_STYLES", () => {
    const t = buildGraphTheme("dark");
    for (const type of NODE_TYPES) {
      expect(t.nodeTypes[type].shape).toBe(TYPE_STYLES[type].shape);
      expect(t.nodeTypes[type].halfWidth).toBe(TYPE_STYLES[type].halfWidth);
      expect(t.nodeTypes[type].halfHeight).toBe(TYPE_STYLES[type].halfHeight);
    }
  });

  test("spotlight dim opacity preserves context while highlighting focus", () => {
    expect(buildGraphTheme("dark").dimOpacity).toBeCloseTo(0.14);
  });

  test("canvasBg flips on theme switch", () => {
    expect(buildGraphTheme("dark").canvasBg).toBe(DARK.canvasBg);
    expect(buildGraphTheme("light").canvasBg).toBe(LIGHT.canvasBg);
  });
});
