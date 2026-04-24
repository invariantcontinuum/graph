//! Layout selection and per-tick driver.
//!
//! The worker supports three layout kinds:
//! - `Force` — iterative Barnes-Hut; keeps `layout_running=true` until
//!   kinetic energy falls below threshold.
//! - `Hierarchical` — Sugiyama-style; one-shot compute.
//! - `Grid` — viewport-aware non-overlapping placement; one-shot.
//!
//! Pinning is supported only for the force layout — hier and grid are
//! deterministic functions of the graph so there's no physics to pin against.

use graph_layout::{ForceLayout, GridLayout, LayoutEngine};

use super::WorkerEngine;
use super::config::{GRID_NODE_H, GRID_NODE_W, GRID_PADDING};

#[derive(Clone, Copy, PartialEq)]
pub(super) enum LayoutKind {
    Force,
    Hierarchical,
    Grid,
}

impl WorkerEngine {
    pub fn tick(&mut self) -> bool {
        if !self.layout_running {
            return false;
        }
        match self.active_layout {
            LayoutKind::Force => self.tick_force(),
            LayoutKind::Hierarchical | LayoutKind::Grid => {
                self.layout_running = false;
                false
            }
        }
    }

    /// Mark a node as pinned and move it to the given position immediately.
    /// Leaves the graph static; force layout is computed as a settled
    /// snapshot rather than a continuously-running simulation.
    pub fn pin_node(&mut self, idx: usize, x: f32, y: f32) {
        if let Some(id) = self.node_order.get(idx).cloned() {
            self.positions.insert(id, (x, y));
        }
        self.pinned.insert(idx);
        self.layout_running = false;
    }

    pub fn unpin_node(&mut self, idx: usize) {
        self.pinned.remove(&idx);
    }

    pub fn set_layout(&mut self, layout: &str) {
        self.active_layout = match layout {
            "hierarchical" => LayoutKind::Hierarchical,
            "grid" => LayoutKind::Grid,
            _ => LayoutKind::Force,
        };
        self.run_active_layout();
    }

    pub fn set_viewport_ratio(&mut self, ratio: f32) {
        self.grid_layout.viewport_ratio = ratio.max(0.1);
        if self.active_layout == LayoutKind::Grid && !self.positions.is_empty() {
            // Recompute grid so cols/rows match the live canvas aspect.
            self.set_layout("grid");
        }
    }

    pub(super) fn run_active_layout(&mut self) {
        let result = match self.active_layout {
            LayoutKind::Force => {
                self.force_layout = ForceLayout::new();
                self.force_layout.compute(&self.store)
            }
            LayoutKind::Hierarchical => self.hier_layout.compute(&self.store),
            LayoutKind::Grid => {
                self.grid_layout = GridLayout::new(
                    GRID_PADDING,
                    GRID_NODE_W,
                    GRID_NODE_H,
                    self.grid_layout.viewport_ratio,
                );
                self.grid_layout.compute(&self.store)
            }
        };
        self.apply_positions_from(result);
        self.layout_running = false;
    }

    fn apply_positions_from(&mut self, result: Vec<(String, f32, f32)>) {
        for (id, x, y) in result {
            self.positions.insert(id, (x, y));
        }
    }

    fn tick_force(&mut self) -> bool {
        let pinned_saved = self.snapshot_pinned_positions();
        let still_moving = self.force_layout.tick(&self.store);
        if !still_moving {
            self.layout_running = false;
        }
        for (id, x, y) in self.force_layout.get_positions() {
            self.positions.insert(id.clone(), (x, y));
        }
        for (id, pos) in pinned_saved {
            self.positions.insert(id, pos);
        }
        still_moving
    }

    fn snapshot_pinned_positions(&self) -> Vec<(String, (f32, f32))> {
        self.pinned
            .iter()
            .filter_map(|&idx| {
                self.node_order
                    .get(idx)
                    .cloned()
                    .and_then(|id| self.positions.get(&id).copied().map(|pos| (id, pos)))
            })
            .collect()
    }
}
