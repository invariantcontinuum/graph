// Copies the WASM binaries from the installed @invariantcontinuum/graph
// package into public/ so the runtime always serves the binaries that match
// the installed JS bindings. The engine's JS glue fetches these by URL
// (/graph/graph_*_wasm_bg.wasm), so a stale committed copy silently runs a
// mismatched engine and panics unpredictably. Runs via pre{dev,build}.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// The exports map only defines "import" conditions, so resolve the package
// root through ESM resolution of the main entry (graph_main_wasm.js).
const pkgRoot = dirname(
  fileURLToPath(import.meta.resolve("@invariantcontinuum/graph")),
);
const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
mkdirSync(publicDir, { recursive: true });

for (const file of ["graph_main_wasm_bg.wasm", "graph_worker_wasm_bg.wasm"]) {
  copyFileSync(join(pkgRoot, file), join(publicDir, file));
  console.log(`synced ${file} from installed package`);
}
