"use client";

import { ApiSection } from "./components/ApiSection";
import { Capabilities } from "./components/Capabilities";
import { Footer } from "./components/Footer";
import { Hero } from "./components/Hero";
import { Nav } from "./components/Nav";
import { Playground } from "./components/Playground";
import { ScaleDemo } from "./components/ScaleDemo";
import { ThemingDemo } from "./components/ThemingDemo";

// Injected at build time by next.config.ts from the installed package manifest.
const PACKAGE_VERSION = process.env.NEXT_PUBLIC_GRAPH_VERSION ?? "0.2.14";

export default function Showcase() {
  return (
    <>
      <a className="skip-link" href="#graph-stage">
        Skip to the interactive playground
      </a>
      <Nav version={PACKAGE_VERSION} />
      <main>
        <Hero />
        <Capabilities />
        <Playground />
        <ScaleDemo />
        <ThemingDemo />
        <ApiSection />
      </main>
      <Footer />
    </>
  );
}
