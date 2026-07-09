import init, { handle_message, tick } from "../graph_worker_wasm.js";

let initPromise: Promise<void> | null = null;
let layoutRunning = false;
let tickScheduled = false;
// Default matches ≤0.2.x behavior; hosts override via the "configure"
// message Graph.tsx sends immediately after creating the worker.
let wasmBasePath = "/graph";

globalThis.onmessage = async (e: MessageEvent) => {
  if (e.data?.type === "configure") {
    if (typeof e.data.wasmBasePath === "string") {
      wasmBasePath = e.data.wasmBasePath.replace(/\/+$/, "");
    }
    return;
  }

  initPromise ??= init({
    module_or_path: `${wasmBasePath}/graph_worker_wasm_bg.wasm`,
  }).then(() => undefined);
  await initPromise;

  handle_message(e.data);

  if (
    e.data.type === "load_snapshot" ||
    e.data.type === "set_layout"
  ) {
    layoutRunning = true;
    scheduleTick();
  }
};

function scheduleTick() {
  if (tickScheduled) return;
  tickScheduled = true;

  setTimeout(() => {
    tickScheduled = false;
    if (!layoutRunning) return;

    const stillMoving = tick();
    if (stillMoving) {
      scheduleTick();
    } else {
      layoutRunning = false;
    }
  }, 16);
}
