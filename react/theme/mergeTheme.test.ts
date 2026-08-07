import { describe, expect, test } from "vitest";
import { buildGraphTheme, tintFill } from "./buildTheme";
import { mergeGraphTheme } from "./mergeTheme";
import { NODE_TYPES } from "./palette";

describe("mergeGraphTheme", () => {
  test("adds custom node and edge type styles without mutating base theme", () => {
    const base = buildGraphTheme("dark");
    const merged = mergeGraphTheme(base, {
      nodeTypes: {
        risk: { shape: "hexagon", borderColor: "#ff8800" },
      },
      edgeTypes: {
        blocks: { color: "#22cc88", style: "dashed", width: 3 },
      },
    });

    expect(base.nodeTypes.risk).toBeUndefined();
    expect(merged.nodeTypes.risk.shape).toBe("hexagon");
    expect(merged.nodeTypes.risk.borderColor).toBe("#ff8800");
    expect(merged.edgeTypes.blocks.color).toBe("#22cc88");
    expect(merged.edgeTypes.blocks.style).toBe("dashed");
  });

  test("returns referentially stable theme for identical inline overrides", () => {
    const base = buildGraphTheme("dark");

    // Simulate inline object literal on re-render
    const theme1 = mergeGraphTheme(base, {
      nodeTypes: {
        risk: { shape: "hexagon", borderColor: "#ff8800" },
      },
    });

    const theme2 = mergeGraphTheme(base, {
      nodeTypes: {
        risk: { shape: "hexagon", borderColor: "#ff8800" },
      },
    });

    expect(theme1).toBe(theme2);
  });

  test("nodeFillTint recomputes per-type fills from border colors", () => {
    const base = buildGraphTheme("dark");
    const merged = mergeGraphTheme(base, { nodeFillTint: 0.4 });
    for (const type of NODE_TYPES) {
      expect(merged.nodeTypes[type].color).toBe(
        tintFill(base.nodeTypes[type].borderColor, 0.4),
      );
    }
  });

  test("edgeCurvature override wins", () => {
    const merged = mergeGraphTheme(buildGraphTheme("dark"), { edgeCurvature: 0.25 });
    expect(merged.edgeCurvature).toBe(0.25);
  });
});
