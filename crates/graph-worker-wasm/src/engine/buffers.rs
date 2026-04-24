//! Per-frame buffer assembly for the main-thread renderer.
//!
//! These buffers are the worker→main transport format — every field layout
//! here is consumed directly by the WebGL instance attribute pointers set
//! up in `graph_render`. Changing the stride or field order requires a
//! matching change in the main engine's buffer upload code.

use super::WorkerEngine;
use super::config::NODE_RADIUS_STUB;
use super::type_keys::index_of;

/// Stride (in f32s) of a per-node instance entry: `[x, y, radius, type_index]`.
const NODE_STRIDE: usize = 4;

impl WorkerEngine {
    pub fn get_position_buffer(&self) -> Vec<f32> {
        let visible = self.visible_node_indices();
        let mut buf = Vec::with_capacity(visible.len() * NODE_STRIDE);
        for &idx in &visible {
            let id = &self.node_order[idx];
            let &(x, y) = self.positions.get(id).unwrap_or(&(0.0, 0.0));
            let type_index = self
                .store
                .get_node(id)
                .map(|n| index_of(&self.node_type_keys, &n.node_type))
                .unwrap_or(0.0);
            buf.extend_from_slice(&[x, y, NODE_RADIUS_STUB, type_index]);
        }
        buf
    }

    pub fn get_visual_flags(&self) -> &[u8] {
        &self.visual_flags
    }

    /// Returns `(node_count, edge_count)` — used by the snapshot-loaded
    /// notification so the host can display totals without calling multiple
    /// accessors. Deliberately domain-agnostic; a prior version counted
    /// `status == "violation"` nodes, but that was substrate-specific
    /// hardcoding that never reached the JS surface and has been removed.
    pub fn get_stats(&self) -> (usize, usize) {
        (self.store.node_count(), self.store.edge_count())
    }

    pub fn edge_type_keys(&self) -> &[String] {
        &self.edge_type_keys
    }

    pub fn get_edge_buffer(&self) -> Vec<f32> {
        let visible = self.visible_ids_set();
        let mut buf = Vec::new();
        for edge in self.store.edges() {
            if !visible.contains(edge.source.as_str()) || !visible.contains(edge.target.as_str()) {
                continue;
            }
            let Some(&(sx, sy)) = self.positions.get(&edge.source) else {
                continue;
            };
            let Some(&(tx, ty)) = self.positions.get(&edge.target) else {
                continue;
            };
            let type_index = index_of(&self.edge_type_keys, &edge.edge_type);
            buf.extend_from_slice(&[sx, sy, tx, ty, type_index, edge.weight]);
        }
        buf
    }
}
