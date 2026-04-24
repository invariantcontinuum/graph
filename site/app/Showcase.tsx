"use client";

import { useState, useRef, useEffect } from "react";
import {
  GraphScene,
  Graph,
  type GraphSnapshot,
  type GraphHandle,
  type LegendSummary,
  type GraphStats,
  type LayoutType,
  buildGraphTheme,
  graphThemeToEngineJson,
} from "@invariantcontinuum/graph/react";
import { sampleSnapshot } from "./data";

export default function Showcase() {
  const [snapshot, setSnapshot] = useState<GraphSnapshot>(sampleSnapshot);
  const [themeMode, setThemeMode] = useState<"dark" | "light">("dark");
  const [layout, setLayout] = useState<LayoutType>("force");
  const [showCommunities, setShowCommunities] = useState(false);
  const [legend, setLegend] = useState<LegendSummary | null>(null);
  const [stats, setStats] = useState<GraphStats | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const graphRef = useRef<GraphHandle>(null);

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    console.log("Showcase component mounted, setting isClient to true");
    setIsClient(true);
  }, []);

  if (!isClient) return <div className="p-8">Loading...</div>;

  return (
    <div className={`flex flex-col h-screen ${themeMode === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      {/* Header / Toolbar */}
      <header className="p-4 border-b border-gray-700 flex flex-wrap gap-4 items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold font-mono">@invariantcontinuum/graph</h1>
          <span className="px-2 py-1 bg-blue-600 rounded text-xs font-bold uppercase">v0.2.0-preview</span>
        </div>
        
        <div className="flex gap-2">
          <select 
            value={layout} 
            onChange={(e) => setLayout(e.target.value as LayoutType)}
            className="bg-gray-800 border border-gray-600 px-2 py-1 rounded text-sm"
          >
            <option value="force">Force Directed</option>
            <option value="grid">Grid Layout</option>
            <option value="hierarchical">Hierarchical</option>
          </select>

          <button 
            onClick={() => setThemeMode(prev => prev === 'dark' ? 'light' : 'dark')}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm transition"
          >
            {themeMode === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>

          <button 
            onClick={() => setShowCommunities(prev => !prev)}
            className={`px-3 py-1 rounded text-sm transition ${showCommunities ? 'bg-green-600' : 'bg-gray-700'}`}
          >
            Communities
          </button>

          <button 
            onClick={() => graphRef.current?.fit()}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-sm transition"
          >
            Center Fit
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Main Graph Area */}
        <main className="flex-1 relative">
          <GraphScene
            ref={graphRef}
            snapshot={snapshot}
            themeMode={themeMode}
            layout={layout}
            showCommunities={showCommunities}
            onLegendChange={setLegend}
            onStatsChange={setStats}
            onNodeClick={(node) => {
              console.log("Clicked:", node);
              setSelectedNode(node.id);
              graphRef.current?.focusFit(node.id);
            }}
            onBackgroundClick={() => setSelectedNode(null)}
            chrome={
              <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4">
                {/* Top Left: Stats */}
                <div className="pointer-events-auto bg-black/50 backdrop-blur p-3 rounded-lg border border-white/10 w-48 text-xs font-mono">
                  <h3 className="font-bold border-b border-white/20 mb-2 pb-1">Graph Stats</h3>
                  <div className="flex justify-between"><span>Nodes:</span> <span>{stats?.nodeCount ?? 0}</span></div>
                  <div className="flex justify-between"><span>Edges:</span> <span>{stats?.edgeCount ?? 0}</span></div>
                  <div className="flex justify-between"><span>Violations:</span> <span className="text-red-400">{stats?.violationCount ?? 0}</span></div>
                </div>

                {/* Bottom Left: Legend */}
                <div className="pointer-events-auto bg-black/50 backdrop-blur p-3 rounded-lg border border-white/10 w-48 text-xs font-mono">
                  <h3 className="font-bold border-b border-white/20 mb-2 pb-1">Legend</h3>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {legend?.node_types.map(nt => (
                      <div key={nt.type_key} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: nt.color }}></div>
                        <span>{nt.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            }
          />
        </main>

        {/* Sidebar / Inspector */}
        <aside className="w-80 border-l border-gray-700 p-4 overflow-y-auto bg-black/20 backdrop-blur z-10">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            Inspector
          </h2>
          
          {selectedNode ? (
            <div className="space-y-4">
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="text-xs uppercase text-gray-500 font-bold mb-1">Node ID</div>
                <div className="font-mono">{selectedNode}</div>
              </div>

              {snapshot.nodes.find(n => n.id === selectedNode) && (
                <>
                  <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                    <div className="text-xs uppercase text-gray-500 font-bold mb-1">Name</div>
                    <div>{snapshot.nodes.find(n => n.id === selectedNode)?.name}</div>
                  </div>
                  <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                    <div className="text-xs uppercase text-gray-500 font-bold mb-1">Type</div>
                    <div className="capitalize">{snapshot.nodes.find(n => n.id === selectedNode)?.type}</div>
                  </div>
                  <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                    <div className="text-xs uppercase text-gray-500 font-bold mb-1">Domain</div>
                    <div className="capitalize">{snapshot.nodes.find(n => n.id === selectedNode)?.domain}</div>
                  </div>
                </>
              )}

              <button 
                onClick={() => {
                  setSelectedNode(null);
                  graphRef.current?.focusFit(null);
                }}
                className="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
              >
                Clear Selection
              </button>
            </div>
          ) : (
            <div className="text-gray-500 text-sm italic">
              Click a node to inspect its properties.
            </div>
          )}

          <div className="mt-8 pt-8 border-t border-gray-700">
            <h3 className="text-sm font-bold mb-4 uppercase text-gray-500 tracking-wider">Features Demo</h3>
            <div className="space-y-2">
              <button 
                onClick={() => {
                  const newNode = `n-${Math.random().toString(36).substr(2, 5)}`;
                  setSnapshot(prev => ({
                    ...prev,
                    nodes: [...prev.nodes, { id: newNode, name: "New Node", type: "service", domain: "added", status: "healthy", meta: {} }],
                    edges: [...prev.edges, { id: `e-${newNode}`, source: "s1", target: newNode, type: "depends", label: "new", weight: 1 }]
                  }));
                }}
                className="w-full text-left px-3 py-2 bg-blue-900/30 hover:bg-blue-900/50 border border-blue-700/50 rounded text-xs transition"
              >
                ➕ Add Random Node
              </button>
              
              <button 
                onClick={() => {
                  if (snapshot.nodes.length > 8) {
                    setSnapshot(prev => ({
                      ...prev,
                      nodes: prev.nodes.slice(0, -1),
                      edges: prev.edges.filter(e => e.target !== prev.nodes[prev.nodes.length - 1].id)
                    }));
                  }
                }}
                className="w-full text-left px-3 py-2 bg-red-900/30 hover:bg-red-900/50 border border-red-700/50 rounded text-xs transition"
              >
                🗑️ Remove Last Node
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
