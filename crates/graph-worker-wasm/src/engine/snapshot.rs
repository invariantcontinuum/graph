//! Snapshot lifecycle — loading, clearing, incremental add/remove.
//!
//! The worker exposes three ways graph content mutates:
//! - `load_snapshot`: fully replace store + re-run layout.
//! - `clear_snapshot`: reset to an empty engine.
//! - `add_ws_nodes` / `remove_node`: incremental updates that preserve
//!   existing positions and place new nodes near their neighbors.

use graph_core::types::{EdgeData, NodeData};
use graph_layout::incremental::place_added_nodes;
use std::collections::HashMap;

use super::WorkerEngine;
use super::layout::LayoutKind;
use super::type_keys::push_unique;

impl WorkerEngine {
    pub fn load_snapshot(&mut self, nodes: Vec<NodeData>, edges: Vec<EdgeData>) {
        self.reset_graph_state();

        for node in nodes {
            self.search.insert(&node.id, &node.name);
            self.node_order.push(node.id.clone());
            self.store.add_node(node);
        }
        for edge in edges {
            self.store.add_edge(edge);
        }
        self.rebuild_type_keys();
        self.run_active_layout();
        self.rebuild_visual_flags();
    }

    /// Reset the engine to the same state as `WorkerEngine::new()`, preserving
    /// only the layout engine instances so we avoid re-allocating them.
    pub fn clear_snapshot(&mut self) {
        self.reset_graph_state();
        self.visual_flags.clear();
        self.visible_nodes = None;
        self.spotlight_ids.clear();
        self.show_hulls = false;
        self.pinned.clear();
    }

    pub fn add_ws_nodes(&mut self, nodes: Vec<NodeData>, edges: Vec<EdgeData>) -> usize {
        let mut added = 0usize;
        for node in nodes {
            self.search.insert(&node.id, &node.name);
            if !self.node_order.contains(&node.id) {
                self.node_order.push(node.id.clone());
                added += 1;
            }
            self.store.add_node(node);
        }
        for edge in edges {
            self.store.add_edge(edge);
        }
        self.rebuild_type_keys();

        let new_ids: Vec<String> = self
            .node_order
            .iter()
            .filter(|id| !self.positions.contains_key(id.as_str()))
            .cloned()
            .collect();

        if !new_ids.is_empty() {
            self.place_new_nodes(&new_ids);
            if self.active_layout == LayoutKind::Force {
                self.layout_running = true;
            }
        }

        self.rebuild_visual_flags();
        added
    }

    pub fn remove_node(&mut self, id: &str) {
        self.store.remove_node(id);
        self.search.remove(id);
        self.node_order.retain(|n| n != id);
        self.positions.remove(id);
        self.rebuild_type_keys();
        self.rebuild_visual_flags();
    }

    fn reset_graph_state(&mut self) {
        self.store = graph_core::graph::GraphStore::new();
        self.search.clear();
        self.positions.clear();
        self.node_order.clear();
        self.node_type_keys.clear();
        self.edge_type_keys.clear();
        self.layout_running = false;
    }

    fn place_new_nodes(&mut self, new_ids: &[String]) {
        let mut neighbor_map = HashMap::new();
        for id in new_ids {
            let ns: Vec<String> = self
                .store
                .neighbors(id)
                .iter()
                .map(|n| n.id.clone())
                .collect();
            neighbor_map.insert(id.clone(), ns);
        }
        let placed = place_added_nodes(&self.positions, new_ids, &neighbor_map);
        for (id, x, y) in placed {
            self.positions.insert(id, (x, y));
        }
    }

    pub(super) fn rebuild_type_keys(&mut self) {
        self.node_type_keys.clear();
        self.edge_type_keys.clear();

        let ordered_node_types: Vec<String> = self
            .node_order
            .iter()
            .filter_map(|id| self.store.get_node(id).map(|n| n.node_type.clone()))
            .collect();
        for type_key in ordered_node_types {
            push_unique(&mut self.node_type_keys, type_key);
        }

        let ordered_edge_types: Vec<String> = self
            .store
            .edges()
            .map(|edge| edge.edge_type.clone())
            .collect();
        for type_key in ordered_edge_types {
            push_unique(&mut self.edge_type_keys, type_key);
        }
    }
}
