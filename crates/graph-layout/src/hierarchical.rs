use crate::LayoutEngine;
use graph_core::graph::GraphStore;
use petgraph::visit::NodeIndexable;
use std::collections::{HashMap, VecDeque};

const LAYER_SPACING: f32 = 120.0;
const NODE_SPACING: f32 = 60.0;

pub struct HierarchicalLayout {
    positions: Vec<(String, f32, f32)>,
    converged: bool,
}

impl HierarchicalLayout {
    pub fn new() -> Self {
        Self {
            positions: Vec::new(),
            converged: false,
        }
    }

    fn assign_layers(&self, graph: &GraphStore) -> HashMap<String, u32> {
        // ⚡ Bolt: Use petgraph::NodeIndex and Vec<u32> instead of String and HashMap
        // to reduce O(3N) string allocations to O(N) per node and improve lookup speed
        // through direct array indexing.
        let inner = graph.inner();
        // Use node_bound() to properly allocate vectors covering all possible indices,
        // avoiding panics if the graph is a StableGraph with node deletions.
        let n = inner.node_bound();
        let mut in_degree = vec![0_usize; n];
        let mut layers_vec = vec![0_u32; n];

        for idx in inner.node_indices() {
            for neighbor in inner.neighbors_directed(idx, petgraph::Direction::Outgoing) {
                in_degree[neighbor.index()] += 1;
            }
        }

        let mut queue: VecDeque<petgraph::graph::NodeIndex> = inner
            .node_indices()
            .filter(|&idx| in_degree[idx.index()] == 0)
            .collect();

        if queue.is_empty()
            && let Some(node_idx) = inner.node_indices().next() {
                queue.push_back(node_idx);
            }

        // layers_vec is already initialized to 0

        while let Some(idx) = queue.pop_front() {
            let current_layer = layers_vec[idx.index()];
            for neighbor in inner.neighbors_directed(idx, petgraph::Direction::Outgoing) {
                let new_layer = current_layer + 1;
                let n_idx = neighbor.index();
                if new_layer > layers_vec[n_idx] {
                    layers_vec[n_idx] = new_layer;
                }
                queue.push_back(neighbor);
            }
        }

        let mut layers: HashMap<String, u32> = HashMap::new();
        for idx in inner.node_indices() {
            if let Some(data) = inner.node_weight(idx) {
                layers.insert(data.id.clone(), layers_vec[idx.index()]);
            }
        }

        layers
    }
}

impl Default for HierarchicalLayout {
    fn default() -> Self {
        Self::new()
    }
}

impl LayoutEngine for HierarchicalLayout {
    fn compute(&mut self, graph: &GraphStore) -> Vec<(String, f32, f32)> {
        let layers = self.assign_layers(graph);
        let mut layer_groups: HashMap<u32, Vec<String>> = HashMap::new();
        for (id, layer) in &layers {
            layer_groups.entry(*layer).or_default().push(id.clone());
        }

        self.positions.clear();
        for (layer, nodes) in &layer_groups {
            let y = *layer as f32 * LAYER_SPACING;
            let total_width = (nodes.len() as f32 - 1.0) * NODE_SPACING;
            let start_x = -total_width / 2.0;
            for (i, id) in nodes.iter().enumerate() {
                self.positions
                    .push((id.clone(), start_x + i as f32 * NODE_SPACING, y));
            }
        }
        self.converged = true;
        self.positions.clone()
    }

    fn tick(&mut self, graph: &GraphStore) -> bool {
        if !self.converged {
            self.compute(graph);
        }
        false
    }

    fn is_converged(&self) -> bool {
        self.converged
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use graph_core::types::*;
    use std::collections::HashMap;

    fn make_node(id: &str) -> NodeData {
        NodeData {
            id: id.into(),
            name: id.into(),
            node_type: "service".into(),
            domain: "test".into(),
            status: "healthy".into(),
            community: None,
            meta: Default::default(),
        }
    }

    fn make_edge(id: &str, src: &str, tgt: &str) -> EdgeData {
        EdgeData {
            id: id.into(),
            source: src.into(),
            target: tgt.into(),
            edge_type: "depends".into(),
            label: String::new(),
            weight: 1.0,
        }
    }

    #[test]
    fn chain_layers_increase() {
        let mut g = GraphStore::new();
        for id in ["a", "b", "c"] {
            g.add_node(make_node(id));
        }
        g.add_edge(make_edge("e1", "a", "b"));
        g.add_edge(make_edge("e2", "b", "c"));

        let mut layout = HierarchicalLayout::new();
        let positions = layout.compute(&g);
        let pos_map: HashMap<&str, f32> = positions
            .iter()
            .map(|(id, _, y)| (id.as_str(), *y))
            .collect();
        assert!(pos_map["a"] < pos_map["b"]);
        assert!(pos_map["b"] < pos_map["c"]);
    }

    #[test]
    fn hierarchical_is_one_shot() {
        let mut g = GraphStore::new();
        g.add_node(make_node("a"));
        let mut layout = HierarchicalLayout::new();
        layout.compute(&g);
        assert!(layout.is_converged());
        assert!(!layout.tick(&g));
    }
}
