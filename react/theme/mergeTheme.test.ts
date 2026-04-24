import { describe, expect, test } from "vitest";
import { buildGraphTheme } from "./buildTheme";
import { mergeGraphTheme } from "./mergeTheme";

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
});
