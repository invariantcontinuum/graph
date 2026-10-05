import { afterEach, beforeEach, expect, test, vi } from "vitest";

const wasm = vi.hoisted(() => ({
  init: vi.fn(async () => undefined),
  handle_message: vi.fn(),
  tick: vi.fn(() => false),
}));
vi.mock("../graph_worker_wasm.js", () => ({ default: wasm.init, ...wasm }));

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubGlobal("location", { origin: "https://example.test" });
  vi.stubGlobal("onmessage", null);
  await import("./worker");
});
afterEach(() => vi.unstubAllGlobals());

const send = (origin: string, data: unknown) =>
  (globalThis.onmessage as Function)({ origin, data });

test("foreign messages cannot configure the WASM URL or reach the engine", async () => {
  await send("https://foreign.test", { type: "configure", wasmBasePath: "https://foreign.test" });
  await send("https://foreign.test", { type: "clear_snapshot" });
  expect(wasm.init).not.toHaveBeenCalled();
  expect(wasm.handle_message).not.toHaveBeenCalled();
  await send("", { type: "clear_snapshot" });
  expect(wasm.init).toHaveBeenCalledWith({ module_or_path: "/graph/graph_worker_wasm_bg.wasm" });
});

test.each(["", "https://example.test"])("accepts worker messages with origin %j", async origin => {
  await send(origin, { type: "configure", wasmBasePath: "/showcase/" });
  const data = { type: "clear_snapshot" };
  await send(origin, data);
  expect(wasm.init).toHaveBeenCalledWith({ module_or_path: "/showcase/graph_worker_wasm_bg.wasm" });
  expect(wasm.handle_message).toHaveBeenCalledWith(data);
});
