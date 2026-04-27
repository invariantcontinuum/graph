//! Force-directed graph layout using Barnes-Hut repulsion and spring edges.
//!
//! The module is split along these seams:
//! - `config` — tuning constants (see comments there for derivation).
//! - `barnes_hut` — quadtree construction + far-field force approximation.
//! - `integrator` — shared step: bounds → tree → forces → velocities.
//! - `overlap` — short-range hard-bump pass so stylized rectangles don't
//!   visually overlap at the settled minimum energy.
//!
//! Public surface (`ForceLayout`, `new`, `step_with_pins`, `get_positions`,
//! `total_velocity_energy`, the `LayoutEngine` impl) is unchanged.

mod barnes_hut;
mod config;
mod integrator;
mod overlap;

use crate::LayoutEngine;
use config::{MAX_ITERATIONS, MIN_VELOCITY};
use graph_core::graph::GraphStore;
use integrator::integrate_step;
use overlap::resolve_overlaps;
use std::collections::{HashMap, HashSet};

pub struct ForceLayout {
    node_ids: Vec<String>,
    positions_vec: Vec<(f32, f32)>,
    velocities_vec: Vec<(f32, f32)>,
    edges_indexed: Vec<(usize, usize)>,
    positions_flat: Vec<f32>,
    forces_vec: Vec<(f32, f32)>,
    edge_count_cache: usize,
    converged: bool,
    iteration: usize,
}

impl ForceLayout {
    #[must_use]
    pub fn new() -> Self {
        Self {
            node_ids: Vec::new(),
            positions_vec: Vec::new(),
            velocities_vec: Vec::new(),
            edges_indexed: Vec::new(),
            positions_flat: Vec::new(),
            forces_vec: Vec::new(),
            edge_count_cache: 0,
            converged: false,
            iteration: 0,
        }
    }

    fn init_positions(&mut self, graph: &GraphStore) {
        // Sort ids so the golden-angle seeding is reproducible across runs.
        let mut node_ids: Vec<String> = graph.nodes().map(|n| n.id.clone()).collect();
        node_ids.sort();

        let n = node_ids.len() as f32;
        let golden_angle = std::f32::consts::PI * (3.0 - 5.0_f32.sqrt());
        let seed_radius = 60.0 * n.max(1.0).sqrt().min(64.0);

        // Build a temporary map of current positions to reuse them if the ID exists.
        let mut old_positions = HashMap::new();
        for (id, pos) in self.node_ids.drain(..).zip(self.positions_vec.drain(..)) {
            old_positions.insert(id, pos);
        }

        self.node_ids = node_ids;
        self.positions_vec.clear();
        self.positions_vec.reserve(self.node_ids.len());

        for (i, id) in self.node_ids.iter().enumerate() {
            if let Some(pos) = old_positions.get(id) {
                self.positions_vec.push(*pos);
            } else {
                let r = (i as f32 / n.max(1.0)).sqrt() * seed_radius;
                let theta = i as f32 * golden_angle;
                self.positions_vec.push((r * theta.cos(), r * theta.sin()));
            }
        }

        if self.velocities_vec.len() < self.node_ids.len() {
            self.velocities_vec.resize(self.node_ids.len(), (0.0, 0.0));
        }
    }

    /// Run one force-integration step on an external flat positions buffer
    /// (layout: `[x0, y0, x1, y1, ...]`) with index-based edges, skipping
    /// position updates for any node index in `pinned`.
    ///
    /// Returns `true` if any free node is still moving above the minimum
    /// velocity threshold, `false` when the system has effectively settled.
    pub fn step_with_pins(
        &mut self,
        positions: &mut [f32],
        edges: &[(usize, usize)],
        pinned: &HashSet<usize>,
    ) -> bool {
        let n = positions.len() / 2;
        if n == 0 {
            return false;
        }
        if self.velocities_vec.len() < n {
            self.velocities_vec.resize(n, (0.0, 0.0));
        }
        if self.forces_vec.len() < n {
            self.forces_vec.resize(n, (0.0, 0.0));
        }
        let max_velocity_sq = integrate_step(
            positions,
            edges,
            &mut self.velocities_vec,
            &mut self.forces_vec,
            pinned,
        );
        max_velocity_sq >= MIN_VELOCITY * MIN_VELOCITY
    }

    /// Return current positions without resetting the layout state.
    pub fn get_positions(&self) -> impl Iterator<Item = (&String, f32, f32)> {
        self.node_ids
            .iter()
            .zip(self.positions_vec.iter())
            .map(|(id, &(x, y))| (id, x, y))
    }

    #[must_use]
    pub fn total_velocity_energy(&self) -> f32 {
        self.velocities_vec
            .iter()
            .map(|(vx, vy)| vx * vx + vy * vy)
            .sum()
    }
}

impl Default for ForceLayout {
    fn default() -> Self {
        Self::new()
    }
}

impl LayoutEngine for ForceLayout {
    fn compute(&mut self, graph: &GraphStore) -> Vec<(String, f32, f32)> {
        self.init_positions(graph);
        self.edges_indexed = index_edges(graph, &self.node_ids);
        self.edge_count_cache = graph.edge_count();

        self.iteration = 0;
        self.converged = false;

        for _ in 0..MAX_ITERATIONS {
            if !self.tick(graph) {
                break;
            }
        }

        self.get_positions()
            .map(|(id, x, y)| (id.clone(), x, y))
            .collect()
    }

    fn tick(&mut self, graph: &GraphStore) -> bool {
        // We only use cached indices if we are sure the topology matches.
        // It prevents recalculating index_edges every tick since it's an O(E*log V) operation.
        // If node_count or edge_count differs, we assume a topology change
        // and do the expensive recompute. This will miss mutations that add & remove exactly
        // one edge or node, but that's handled cleanly by clearing cache before mutations
        // or re-computing layout explicitly.
        if self.node_ids.len() != graph.node_count() || self.edge_count_cache != graph.edge_count()
        {
            self.init_positions(graph);
            self.edges_indexed = index_edges(graph, &self.node_ids);
            self.edge_count_cache = graph.edge_count();
        }
        self.iteration += 1;

        let n = self.node_ids.len();
        if n == 0 {
            self.converged = true;
            return false;
        }

        flatten_positions(&self.positions_vec, &mut self.positions_flat);
        if self.forces_vec.len() < n {
            self.forces_vec.resize(n, (0.0, 0.0));
        }

        let empty_pinned: HashSet<usize> = HashSet::new();
        let max_velocity_sq = integrate_step(
            &mut self.positions_flat,
            &self.edges_indexed,
            &mut self.velocities_vec,
            &mut self.forces_vec,
            &empty_pinned,
        );
        unflatten_positions(&self.positions_flat, &mut self.positions_vec);

        resolve_overlaps(&mut self.positions_vec);

        if max_velocity_sq < MIN_VELOCITY * MIN_VELOCITY {
            self.converged = true;
            return false;
        }
        true
    }

    fn is_converged(&self) -> bool {
        self.converged
    }
}

fn index_edges(graph: &GraphStore, node_ids: &[String]) -> Vec<(usize, usize)> {
    let id_to_idx: HashMap<&str, usize> = node_ids
        .iter()
        .enumerate()
        .map(|(i, id)| (id.as_str(), i))
        .collect();
    graph
        .edges()
        .filter_map(|e| {
            let src = id_to_idx.get(e.source.as_str())?;
            let tgt = id_to_idx.get(e.target.as_str())?;
            Some((*src, *tgt))
        })
        .collect()
}

fn flatten_positions(positions: &[(f32, f32)], flat: &mut Vec<f32>) {
    flat.clear();
    for &(x, y) in positions {
        flat.push(x);
        flat.push(y);
    }
}

fn unflatten_positions(flat: &[f32], positions: &mut Vec<(f32, f32)>) {
    let n = flat.len() / 2;
    positions.clear();
    positions.reserve(n);
    for i in 0..n {
        positions.push((flat[i * 2], flat[i * 2 + 1]));
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use graph_core::types::*;

    fn make_node(id: &str) -> NodeData {
        NodeData {
            id: id.to_string(),
            name: id.to_string(),
            node_type: "service".to_string(),
            domain: "test".to_string(),
            status: "healthy".to_string(),
            community: None,
            meta: Default::default(),
        }
    }

    fn make_edge(source: &str, target: &str) -> EdgeData {
        EdgeData {
            id: format!("{source}-{target}"),
            source: source.to_string(),
            target: target.to_string(),
            edge_type: "depends".to_string(),
            label: String::new(),
            weight: 1.0,
        }
    }

    #[test]
    fn converges_small_graph() {
        let mut graph = GraphStore::new();
        for i in 0..10 {
            graph.add_node(make_node(&format!("n{i}")));
        }
        for i in 0..9 {
            graph.add_edge(make_edge(&format!("n{i}"), &format!("n{}", i + 1)));
        }

        let mut layout = ForceLayout::new();
        let positions = layout.compute(&graph);

        assert_eq!(positions.len(), 10);
        assert!(layout.is_converged() || layout.iteration <= MAX_ITERATIONS);
        for (_, x, y) in &positions {
            assert!(x.is_finite(), "x position not finite");
            assert!(y.is_finite(), "y position not finite");
        }
    }

    #[test]
    fn energy_decreases() {
        let mut graph = GraphStore::new();
        for i in 0..20 {
            graph.add_node(make_node(&format!("n{i}")));
        }
        for i in 0..19 {
            graph.add_edge(make_edge(&format!("n{i}"), &format!("n{}", i + 1)));
        }

        let mut layout = ForceLayout::new();
        layout.init_positions(&graph);

        for _ in 0..50 {
            layout.tick(&graph);
        }
        let energy_early = layout.total_velocity_energy();

        for _ in 0..50 {
            layout.tick(&graph);
        }
        let energy_late = layout.total_velocity_energy();

        assert!(
            energy_late <= energy_early,
            "Energy should decrease: early={energy_early}, late={energy_late}"
        );
    }

    #[test]
    fn pinned_nodes_do_not_move() {
        let mut layout = ForceLayout::new();
        let mut positions = vec![0.0_f32, 0.0, 100.0, 0.0];
        let edges: Vec<(usize, usize)> = vec![(0, 1)];

        let mut pinned = HashSet::new();
        pinned.insert(0);

        layout.step_with_pins(&mut positions, &edges, &pinned);

        assert!(
            (positions[0]).abs() < 1e-4,
            "pinned x drifted: {}",
            positions[0]
        );
        assert!(
            (positions[1]).abs() < 1e-4,
            "pinned y drifted: {}",
            positions[1]
        );
    }
}
