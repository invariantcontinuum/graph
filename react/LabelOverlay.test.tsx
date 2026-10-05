import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, test, vi } from "vitest";
import { LabelOverlay } from "./LabelOverlay";
import { buildGraphTheme } from "./theme/buildTheme";

const renderLoop = vi.hoisted(() => ({ render: null as any }));
vi.mock("./overlays/useOverlayRenderLoop", () => ({
  useOverlayRenderLoop: (_canvas: unknown, _dirty: unknown, render: unknown) => {
    renderLoop.render = render;
  },
}));
vi.mock("./overlays/useEngineFrameState", () => ({
  useEngineFrameState: () => ({
    frameRef: { current: {
      positions: new Float32Array([0, 0, 68, 0]),
      vpMatrix: new Float32Array([0.0025, 0, 0, 0, 0, 0.003333, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]),
    } },
    dirtyRef: { current: true },
  }),
}));

afterEach(() => vi.unstubAllGlobals());

test("cached labels retain their glyph and refresh when the node type changes", () => {
  vi.stubGlobal("window", { devicePixelRatio: 1 });
  const theme = buildGraphTheme("dark");
  theme.nodeTypes.service.glyph = "S";
  theme.nodeTypes.data.glyph = "D";
  const nodeTypes = { a: "service" };
  const labels = { a: "  API   gateway  " };
  renderToStaticMarkup(<LabelOverlay engineRef={{ current: null }} theme={theme}
    nodeIds={["a"]} labels={labels} nodeTypes={nodeTypes} ready={true} />);
  const fillText = vi.fn();
  const ctx = new Proxy({
    fillText,
    measureText: (text: string) => ({ width: text === "\uFFFF" ? 9 : text.length * 6 }),
  }, { get: (target, key) => Reflect.get(target, key) ?? (() => {}) });
  const draw = () => renderLoop.render(ctx, { width: 800, height: 600 });
  draw();
  expect(fillText.mock.calls.map(call => call[0])).toEqual(["S API gateway", "SERVICE"]);
  fillText.mockClear();
  draw();
  expect(fillText.mock.calls.map(call => call[0])).toEqual(["S API gateway", "SERVICE"]);
  fillText.mockClear();
  nodeTypes.a = "data";
  labels.a = "Store";
  draw();
  expect(fillText.mock.calls.map(call => call[0])).toEqual(["D Store", "DATA"]);
});
