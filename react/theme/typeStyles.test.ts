import { describe, test, expect } from "vitest";
import { TYPE_STYLES, DEFAULT_STYLE } from "./typeStyles";
import { NODE_TYPES } from "./palette";

describe("TYPE_STYLES shape coding", () => {
  test("every node type has a glyph", () => {
    for (const t of NODE_TYPES) {
      expect(TYPE_STYLES[t].glyph.length, `${t} glyph`).toBeGreaterThan(0);
    }
  });

  test("shape encodes type: no longer uniform roundrectangle", () => {
    const shapes = new Set(NODE_TYPES.map((t) => TYPE_STYLES[t].shape));
    expect(shapes.size).toBeGreaterThanOrEqual(7);
    expect(TYPE_STYLES.database.shape).toBe("barrel");
    expect(TYPE_STYLES.incident.shape).toBe("triangle");
    expect(TYPE_STYLES.cache.shape).toBe("hexagon");
    expect(TYPE_STYLES.service.shape).toBe("roundrectangle");
  });

  test("non-card shapes have balanced extents (not wide boxes)", () => {
    for (const t of NODE_TYPES) {
      const s = TYPE_STYLES[t];
      if (s.shape === "circle" || s.shape === "square" || s.shape === "diamond") {
        expect(s.halfWidth).toBe(s.halfHeight);
      }
    }
  });

  test("DEFAULT_STYLE keeps roundrectangle + glyph", () => {
    expect(DEFAULT_STYLE.shape).toBe("roundrectangle");
    expect(DEFAULT_STYLE.glyph.length).toBeGreaterThan(0);
  });
});
