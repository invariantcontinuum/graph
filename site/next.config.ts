import type { NextConfig } from "next";
import path from "node:path";
import { createRequire } from "node:module";

const req = createRequire(import.meta.url);
// Read the installed package version at build time so NEXT_PUBLIC_GRAPH_VERSION
// is always accurate without manual updates.
const graphPkg = req("../package.json") as { version: string };

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_GRAPH_VERSION: graphPkg.version,
  },
  output: 'export',
  outputFileTracingRoot: path.join(process.cwd(), ".."),
  basePath: '/graph',
  transpilePackages: ["@invariantcontinuum/graph"],
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
    // Enable WASM support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // Fix for "Module not found: Can't resolve 'fs'" errors often seen with WASM/Rust
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }

    return config;
  },
};

export default nextConfig;
