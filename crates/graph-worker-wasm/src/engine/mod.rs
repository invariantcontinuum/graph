//! Worker-side engine that owns the graph store and coordinates layouts.
//!
//! The struct lives here; its behavior is split across submodules:
//! - `snapshot` — `load_snapshot`, `clear_snapshot`, add/remove.
//! - `layout` — `set_layout`, `tick`, pin/unpin, viewport ratio.
//! - `view` — filter / spotlight / community toggles + visible-set helpers.
//! - `buffers` — per-frame position/edge/visual-flag buffer assembly.
//! - `type_keys` — insertion-ordered dedup helpers used by snapshot + buffers.
//! - `config` — grid-layout tuning constants.

mod buffers;
mod config;
mod layout;
mod snapshot;
mod type_keys;
mod view;

use std::collections::{HashMap, HashSet};

use graph_core::graph::GraphStore;
use graph_core::search::SearchIndex;
use graph_layout::{ForceLayout, GridLayout, HierarchicalLayout};

use config::{GRID_NODE_H, GRID_NODE_W, GRID_PADDING, GRID_VIEWPORT_RATIO};
use layout::LayoutKind;

pub struct WorkerEngine {
    store: GraphStore,
    search: SearchIndex,
    positions: HashMap<String, (f32, f32)>,
    node_order: Vec<String>,
    node_type_keys: Vec<String>,
    edge_type_keys: Vec<String>,

    force_layout: ForceLayout,
    hier_layout: HierarchicalLayout,
    grid_layout: GridLayout,
    active_layout: LayoutKind,
    layout_running: bool,

    visible_nodes: Option<HashSet<String>>,
    spotlight_ids: HashSet<String>,
    show_hulls: bool,

    visual_flags: Vec<u8>,

    pinned: HashSet<usize>,
}

impl Default for WorkerEngine {
    fn default() -> Self {
        Self::new()
    }
}

impl WorkerEngine {
    #[must_use]
    pub fn new() -> Self {
        Self {
            store: GraphStore::new(),
            search: SearchIndex::new(),
            positions: HashMap::new(),
            node_order: Vec::new(),
            node_type_keys: Vec::new(),
            edge_type_keys: Vec::new(),
            force_layout: ForceLayout::new(),
            hier_layout: HierarchicalLayout::new(),
            grid_layout: GridLayout::new(
                GRID_PADDING,
                GRID_NODE_W,
                GRID_NODE_H,
                GRID_VIEWPORT_RATIO,
            ),
            active_layout: LayoutKind::Force,
            layout_running: false,
            visible_nodes: None,
            spotlight_ids: HashSet::new(),
            show_hulls: false,
            visual_flags: Vec::new(),
            pinned: HashSet::new(),
        }
    }

    #[must_use]
    pub fn node_count(&self) -> usize {
        self.store.node_count()
    }

    #[must_use]
    pub fn edge_count(&self) -> usize {
        self.store.edge_count()
    }

    #[must_use]
    pub fn is_layout_running(&self) -> bool {
        self.layout_running
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::protocol::FilterIn;
    use graph_core::types::{EdgeData, NodeData};

    fn make_node(id: &str) -> NodeData {
        NodeData {
            id: id.to_string(),
            name: id.to_string(),
            node_type: "service".to_string(),
            domain: "test".to_string(),
            status: "healthy".to_string(),
            community: None,
            meta: std::collections::HashMap::new(),
        }
    }

    fn make_edge(id: &str, src: &str, tgt: &str) -> EdgeData {
        EdgeData {
            id: id.to_string(),
            source: src.to_string(),
            target: tgt.to_string(),
            edge_type: "depends".to_string(),
            label: "depends".to_string(),
            weight: 1.0,
        }
    }

    #[test]
    fn load_snapshot_produces_positions() {
        let mut engine = WorkerEngine::new();
        let nodes = vec![make_node("a"), make_node("b"), make_node("c")];
        let edges = vec![make_edge("e1", "a", "b")];
        engine.load_snapshot(nodes, edges);

        assert_eq!(engine.node_count(), 3);
        assert_eq!(engine.edge_count(), 1);

        let positions = engine.get_position_buffer();
        assert_eq!(positions.len(), 3 * 4);
        assert!(positions.iter().all(|v| v.is_finite()));
    }

    #[test]
    fn layout_tick_returns_positions() {
        let mut engine = WorkerEngine::new();
        let nodes = vec![make_node("a"), make_node("b")];
        engine.load_snapshot(nodes, vec![]);

        let _still_moving = engine.tick();
        let positions = engine.get_position_buffer();
        assert_eq!(positions.len(), 2 * 4);
    }

    #[test]
    fn filter_reduces_visible_set() {
        let mut engine = WorkerEngine::new();
        let mut node_a = make_node("a");
        node_a.node_type = "service".to_string();
        let mut node_b = make_node("b");
        node_b.node_type = "database".to_string();
        engine.load_snapshot(vec![node_a, node_b], vec![]);

        engine.set_filter(Some(FilterIn {
            types: Some(vec!["service".to_string()]),
            domains: None,
            status: None,
        }));

        let positions = engine.get_position_buffer();
        assert_eq!(positions.len(), 4);
    }

    #[test]
    fn edge_buffer_only_includes_visible_edges() {
        let mut engine = WorkerEngine::new();
        engine.load_snapshot(
            vec![make_node("a"), make_node("b"), make_node("c")],
            vec![make_edge("e1", "a", "b"), make_edge("e2", "b", "c")],
        );

        let buf = engine.get_edge_buffer();
        assert_eq!(buf.len(), 2 * 6);
    }

    #[test]
    fn add_ws_nodes_places_near_neighbors() {
        let mut engine = WorkerEngine::new();
        engine.load_snapshot(vec![make_node("a")], vec![]);

        let added = engine.add_ws_nodes(vec![make_node("b")], vec![make_edge("e1", "a", "b")]);
        assert_eq!(added, 1);
        assert_eq!(engine.node_count(), 2);

        let positions = engine.get_position_buffer();
        assert_eq!(positions.len(), 2 * 4);
    }

    #[test]
    fn spotlight_sets_visual_flags() {
        let mut engine = WorkerEngine::new();
        engine.load_snapshot(vec![make_node("a"), make_node("b")], vec![]);

        engine.set_spotlight(Some(vec!["a".to_string()]));
        let flags = engine.get_visual_flags();
        assert_eq!(flags.len(), 2);
        assert_eq!(flags[0], 0);
        assert_eq!(flags[1], 1);
    }

    #[test]
    fn pin_and_unpin_tracked() {
        let mut engine = WorkerEngine::new();
        engine.load_snapshot(vec![make_node("a"), make_node("b")], vec![]);

        engine.pin_node(0, 5.0, 5.0);
        assert!(engine.pinned.contains(&0));
        assert_eq!(engine.positions.get("a"), Some(&(5.0, 5.0)));
        assert!(!engine.is_layout_running());

        engine.tick();
        assert_eq!(engine.positions.get("a"), Some(&(5.0, 5.0)));

        engine.unpin_node(0);
        assert!(!engine.pinned.contains(&0));
    }

    #[test]
    fn clear_snapshot_clears_pinned() {
        let mut engine = WorkerEngine::new();
        engine.load_snapshot(vec![make_node("a"), make_node("b")], vec![]);
        engine.pin_node(0, 1.0, 2.0);
        assert!(!engine.pinned.is_empty());

        engine.clear_snapshot();
        assert!(engine.pinned.is_empty());
    }
}
