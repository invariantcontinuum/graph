//! Filtering, spotlight, and community-hull toggles.
//!
//! These do not mutate the graph store — they shape *what is emitted* to
//! the renderer on the next `get_position_buffer` / `get_edge_buffer` call,
//! by maintaining a `visible_nodes` set and a `visual_flags` byte stream
//! aligned to the visible-node buffer.

use std::collections::HashSet;

use graph_core::filter::GraphFilter;

use super::WorkerEngine;
use crate::protocol::FilterIn;

impl WorkerEngine {
    pub fn set_filter(&mut self, filter: Option<FilterIn>) {
        self.visible_nodes = filter.map(|f| {
            let core_filter = GraphFilter {
                types: f.types,
                domains: f.domains,
                statuses: f.status,
            };
            core_filter.apply(&self.store).into_iter().collect()
        });
        self.rebuild_visual_flags();
    }

    pub fn set_spotlight(&mut self, ids: Option<Vec<String>>) {
        self.spotlight_ids = ids.map(|v| v.into_iter().collect()).unwrap_or_default();
        self.rebuild_visual_flags();
    }

    pub fn set_communities(&mut self, show: bool) {
        self.show_hulls = show;
    }

    pub fn visible_node_ids(&self) -> Vec<String> {
        self.visible_node_indices()
            .iter()
            .map(|&i| self.node_order[i].clone())
            .collect()
    }

    pub(super) fn visible_node_indices(&self) -> Vec<usize> {
        self.node_order
            .iter()
            .enumerate()
            .filter(|(_, id)| {
                self.visible_nodes
                    .as_ref()
                    .is_none_or(|v| v.contains(id.as_str()))
            })
            .map(|(i, _)| i)
            .collect()
    }

    pub(super) fn rebuild_visual_flags(&mut self) {
        let visible = self.visible_node_indices();
        self.visual_flags = Vec::with_capacity(visible.len());
        for &idx in &visible {
            let id = &self.node_order[idx];
            let dimmed = !self.spotlight_ids.is_empty() && !self.spotlight_ids.contains(id);
            self.visual_flags.push(u8::from(dimmed));
        }
    }

    pub(super) fn visible_ids_set(&self) -> HashSet<&str> {
        self.visible_node_indices()
            .iter()
            .map(|&i| self.node_order[i].as_str())
            .collect()
    }
}
