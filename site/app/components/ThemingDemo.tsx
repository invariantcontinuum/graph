"use client";

import { useMemo, useState } from "react";
import type {
  GraphSnapshot,
  GraphThemeOverrides,
  ThemeMode,
} from "@invariantcontinuum/graph/react";
import { generateSpecimen } from "../lib/generate";
import { CodeBlock } from "./CodeBlock";
import { EngineFrame } from "./EngineFrame";
import { Reveal } from "./Reveal";

type Mode = "dark" | "light" | "custom";

const CUSTOM_OVERRIDES: GraphThemeOverrides = {
  nodeTypes: {
    incident: {
      shape: "diamond",
      borderColor: "#fb7185",
      borderWidth: 2.2,
      halfWidth: 24,
      halfHeight: 22,
    },
    policy: {
      shape: "hexagon",
      borderColor: "#facc15",
      halfWidth: 26,
      halfHeight: 22,
    },
  },
  edgeTypes: {
    violation: { color: "#fb7185", style: "dashed", width: 2 },
    enforces: { color: "#34d399", width: 1.8 },
  },
};

const SNIPPETS: Record<Mode, { code: string; display: React.ReactNode }> = {
  dark: {
    code: `<GraphScene themeMode="dark" snapshot={specimen} />`,
    display: (
      <>
        <span className="tok-tag">&lt;GraphScene</span>{" "}
        <span className="tok-attr">themeMode</span>=
        <span className="tok-str">&quot;dark&quot;</span>{" "}
        <span className="tok-attr">snapshot</span>=
        <span className="tok-p">{"{specimen}"}</span>{" "}
        <span className="tok-tag">/&gt;</span>
      </>
    ),
  },
  light: {
    code: `<GraphScene themeMode="light" snapshot={specimen} />`,
    display: (
      <>
        <span className="tok-tag">&lt;GraphScene</span>{" "}
        <span className="tok-attr">themeMode</span>=
        <span className="tok-str">&quot;light&quot;</span>{" "}
        <span className="tok-attr">snapshot</span>=
        <span className="tok-p">{"{specimen}"}</span>{" "}
        <span className="tok-tag">/&gt;</span>
      </>
    ),
  },
  custom: {
    code: `<GraphScene
  themeMode="dark"
  snapshot={specimen}
  themeOverrides={{
    nodeTypes: {
      incident: { shape: "diamond", borderColor: "#fb7185" },
      policy:   { shape: "hexagon", borderColor: "#facc15" },
    },
    edgeTypes: {
      violation: { color: "#fb7185", style: "dashed", width: 2 },
      enforces:  { color: "#34d399", width: 1.8 },
    },
  }}
/>`,
    display: (
      <>
        <span className="tok-tag">&lt;GraphScene</span>
        {"\n  "}
        <span className="tok-attr">themeMode</span>=
        <span className="tok-str">&quot;dark&quot;</span>
        {"\n  "}
        <span className="tok-attr">snapshot</span>=
        <span className="tok-p">{"{specimen}"}</span>
        {"\n  "}
        <span className="tok-attr">themeOverrides</span>=<span className="tok-p">{"{{"}</span>
        {"\n    "}nodeTypes: {"{"}
        {"\n      "}incident: {"{"} shape: <span className="tok-str">&quot;diamond&quot;</span>, borderColor:{" "}
        <span className="tok-str">&quot;#fb7185&quot;</span> {"}"},
        {"\n      "}policy:   {"{"} shape: <span className="tok-str">&quot;hexagon&quot;</span>, borderColor:{" "}
        <span className="tok-str">&quot;#facc15&quot;</span> {"}"},
        {"\n    "}
        {"},"}
        {"\n    "}edgeTypes: {"{"}
        {"\n      "}violation: {"{"} color: <span className="tok-str">&quot;#fb7185&quot;</span>, style:{" "}
        <span className="tok-str">&quot;dashed&quot;</span>, width: <span className="tok-num">2</span> {"}"},
        {"\n      "}enforces:  {"{"} color: <span className="tok-str">&quot;#34d399&quot;</span>, width:{" "}
        <span className="tok-num">1.8</span> {"}"},
        {"\n    "}
        {"},"}
        {"\n  "}
        <span className="tok-p">{"}}"}</span>
        {"\n"}
        <span className="tok-tag">/&gt;</span>
      </>
    ),
  },
};

const MODES: Array<{ id: Mode; label: string }> = [
  { id: "dark", label: "Dark base" },
  { id: "light", label: "Light base" },
  { id: "custom", label: "With overrides" },
];

export function ThemingDemo() {
  const specimen: GraphSnapshot = useMemo(() => generateSpecimen(), []);
  const [mode, setMode] = useState<Mode>("dark");

  const themeMode: ThemeMode = mode === "light" ? "light" : "dark";
  const overrides = mode === "custom" ? CUSTOM_OVERRIDES : null;

  return (
    <section className="section theming" id="theming" aria-labelledby="th-h">
      <Reveal>
        <h2 id="th-h">Two base themes, override anything</h2>
        <p className="section-lede">
          The specimen graph shows every built-in node type. Both base themes
          ship in the package; overrides are plain typed objects merged per
          node or edge type. The code on the right is exactly what drives the
          canvas on the left.
        </p>
      </Reveal>
      <Reveal className="theming-grid">
        <div className="theming-stage">
          <EngineFrame
            snapshot={specimen}
            themeMode={themeMode}
            themeOverrides={overrides}
            ariaLabel={`Theme specimen graph rendered with the ${mode === "custom" ? "dark base theme plus custom overrides" : `${themeMode} base theme`}`}
            fitPadding={44}
            className="theming-frame"
          />
          <div className="segmented" role="group" aria-label="Theme selection">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                className={mode === m.id ? "active" : ""}
                aria-pressed={mode === m.id}
                onClick={() => setMode(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <div className="theming-code">
          <CodeBlock
            label="specimen.tsx"
            code={SNIPPETS[mode].code}
            display={SNIPPETS[mode].display}
          />
          <p className="theming-note">
            Overrides merge into the base theme per node or edge type, and the
            merged result is referentially stable, so React consumers rerender
            only when something actually changed. Apps that need the resolved
            colors for a legend can call <code>buildGraphTheme</code> and{" "}
            <code>mergeGraphTheme</code> themselves.
          </p>
        </div>
      </Reveal>
    </section>
  );
}
