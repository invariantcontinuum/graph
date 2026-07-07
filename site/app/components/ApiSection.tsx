import { CodeBlock } from "./CodeBlock";
import { Reveal } from "./Reveal";

const INSTALL_CODE = `# .npmrc: the package is published to GitHub Packages
@invariantcontinuum:registry=https://npm.pkg.github.com

npm install @invariantcontinuum/graph`;

const USAGE_CODE = `import { GraphScene } from "@invariantcontinuum/graph/react";

export function MyGraph({ data }) {
  return (
    <div style={{ height: 480 }}>
      <GraphScene
        themeMode="dark"
        snapshot={data}
        layout="force"
        onNodeClick={(node) => console.log(node?.name)}
      />
    </div>
  );
}`;

const HANDLE_CODE = `const graph = useRef<GraphHandle>(null);

graph.current?.relayout("hierarchical");
graph.current?.focusFit(nodeId, 72);
graph.current?.selectNode(nodeId);

// 60fps position stream for custom overlays
const stop = graph.current?.subscribeFrame(({ positions, vpMatrix }) => {
  drawMyOverlay(positions, vpMatrix);
});`;

export function ApiSection() {
  return (
    <section className="section api" id="api" aria-labelledby="api-h">
      <Reveal>
        <h2 id="api-h">The whole API fits on one screen</h2>
        <p className="section-lede">
          Install from GitHub Packages, drop the scene into a sized box, and
          reach for the imperative handle when you need camera or layout
          control.
        </p>
      </Reveal>
      <Reveal className="api-blocks">
        <CodeBlock
          label="install"
          code={INSTALL_CODE}
          display={
            <>
              <span className="tok-cm">
                # .npmrc: the package is published to GitHub Packages
              </span>
              {"\n"}
              @invariantcontinuum:registry=https://npm.pkg.github.com
              {"\n\n"}
              <span className="tok-fn">npm</span> install
              @invariantcontinuum/graph
            </>
          }
        />
        <CodeBlock
          label="minimal usage"
          code={USAGE_CODE}
          display={
            <>
              <span className="tok-kw">import</span> {"{ GraphScene }"}{" "}
              <span className="tok-kw">from</span>{" "}
              <span className="tok-str">
                &quot;@invariantcontinuum/graph/react&quot;
              </span>
              ;{"\n\n"}
              <span className="tok-kw">export function</span>{" "}
              <span className="tok-fn">MyGraph</span>({"{ data }"}) {"{"}
              {"\n  "}
              <span className="tok-kw">return</span> (
              {"\n    "}
              <span className="tok-tag">&lt;div</span>{" "}
              <span className="tok-attr">style</span>=
              <span className="tok-p">{"{{ height: 480 }}"}</span>
              <span className="tok-tag">&gt;</span>
              {"\n      "}
              <span className="tok-tag">&lt;GraphScene</span>
              {"\n        "}
              <span className="tok-attr">themeMode</span>=
              <span className="tok-str">&quot;dark&quot;</span>
              {"\n        "}
              <span className="tok-attr">snapshot</span>=
              <span className="tok-p">{"{data}"}</span>
              {"\n        "}
              <span className="tok-attr">layout</span>=
              <span className="tok-str">&quot;force&quot;</span>
              {"\n        "}
              <span className="tok-attr">onNodeClick</span>=
              <span className="tok-p">
                {"{(node) => console.log(node?.name)}"}
              </span>
              {"\n      "}
              <span className="tok-tag">/&gt;</span>
              {"\n    "}
              <span className="tok-tag">&lt;/div&gt;</span>
              {"\n  "});{"\n"}
              {"}"}
            </>
          }
        />
        <CodeBlock
          label="imperative handle"
          code={HANDLE_CODE}
          display={
            <>
              <span className="tok-kw">const</span> graph ={" "}
              <span className="tok-fn">useRef</span>&lt;GraphHandle&gt;(
              <span className="tok-kw">null</span>);{"\n\n"}
              graph.current?.<span className="tok-fn">relayout</span>(
              <span className="tok-str">&quot;hierarchical&quot;</span>);{"\n"}
              graph.current?.<span className="tok-fn">focusFit</span>(nodeId,{" "}
              <span className="tok-num">72</span>);{"\n"}
              graph.current?.<span className="tok-fn">selectNode</span>
              (nodeId);
              {"\n\n"}
              <span className="tok-cm">
                {"// 60fps position stream for custom overlays"}
              </span>
              {"\n"}
              <span className="tok-kw">const</span> stop = graph.current?.
              <span className="tok-fn">subscribeFrame</span>((
              {"{ positions, vpMatrix }"}) <span className="tok-kw">=&gt;</span>{" "}
              {"{"}
              {"\n  "}
              <span className="tok-fn">drawMyOverlay</span>(positions,
              vpMatrix);
              {"\n"}
              {"});"}
            </>
          }
        />
      </Reveal>
      <Reveal className="api-surface">
        <div>
          <h3>Components</h3>
          <p>
            <code>GraphScene</code> is the batteries-included composite.{" "}
            <code>Graph</code> is the bare engine canvas, and{" "}
            <code>GridOverlay</code>, <code>LabelOverlay</code>,{" "}
            <code>EdgeLabelsOverlay</code>, and{" "}
            <code>CompoundFramesOverlay</code> are exported separately for
            custom composition.
          </p>
        </div>
        <div>
          <h3>Theme utilities</h3>
          <p>
            <code>buildGraphTheme(mode)</code> returns a full typed theme,{" "}
            <code>mergeGraphTheme(base, overrides)</code> layers your changes,
            and <code>LIGHT</code>, <code>DARK</code>, and{" "}
            <code>TYPE_STYLES</code> expose the raw tokens for legends and
            side panels.
          </p>
        </div>
        <div>
          <h3>Data in, events out</h3>
          <p>
            Feed a <code>GraphSnapshot</code> of typed nodes and edges, or
            point <code>snapshotUrl</code> and <code>wsUrl</code> at a server.
            Events cover clicks, hover, background clicks, legend changes, and
            live stats.
          </p>
        </div>
      </Reveal>
    </section>
  );
}
