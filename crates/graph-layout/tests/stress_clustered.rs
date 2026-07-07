//! Stress reproduction for the showcase scale demo: a large clustered graph
//! with preferential attachment, force-laid-out to convergence. Guards
//! against panics and non-finite positions in the Barnes-Hut force path
//! (observed as `RuntimeError: unreachable` in the layout worker WASM when
//! the showcase ran 5k+ node graphs).

use graph_core::graph::GraphStore;
use graph_core::types::{EdgeData, NodeData};
use graph_layout::{ForceLayout, LayoutEngine};

/// Deterministic LCG so the repro is stable across runs.
struct Lcg(u64);

impl Lcg {
    fn next_f32(&mut self) -> f32 {
        self.0 = self
            .0
            .wrapping_mul(6364136223846793005)
            .wrapping_add(1442695040888963407);
        ((self.0 >> 33) as f32) / (u32::MAX >> 1) as f32
    }
    fn below(&mut self, n: usize) -> usize {
        (self.next_f32() * n as f32) as usize % n.max(1)
    }
}

fn node(id: String) -> NodeData {
    NodeData {
        id: id.clone(),
        name: id,
        node_type: "service".into(),
        domain: "stress".into(),
        status: "active".into(),
        community: None,
        meta: Default::default(),
    }
}

fn edge(id: String, src: String, tgt: String) -> EdgeData {
    EdgeData {
        id,
        source: src,
        target: tgt,
        edge_type: "depends".into(),
        label: String::new(),
        weight: 1.0,
    }
}

fn clustered_store(node_count: usize) -> GraphStore {
    let mut rng = Lcg(97 + node_count as u64);
    let clusters = (node_count / 320).max(8);
    let mut store = GraphStore::new();
    let mut members: Vec<Vec<usize>> = vec![Vec::new(); clusters];

    for i in 0..node_count {
        members[i % clusters].push(i);
        store.add_node(node(format!("s{i}")));
    }
    let mut eid = 0usize;
    for c in 0..clusters {
        let m = &members[c];
        for j in 1..m.len() {
            let t = m[(rng.next_f32().powf(2.2) * j as f32) as usize];
            store.add_edge(edge(
                format!("e{eid}"),
                format!("s{}", m[j]),
                format!("s{t}"),
            ));
            eid += 1;
            if rng.next_f32() < 0.25 {
                let t2 = m[(rng.next_f32().powf(2.2) * j as f32) as usize];
                store.add_edge(edge(
                    format!("e{eid}"),
                    format!("s{}", m[j]),
                    format!("s{t2}"),
                ));
                eid += 1;
            }
        }
        for _ in 0..4 {
            let other = &members[rng.below(clusters)];
            store.add_edge(edge(
                format!("e{eid}"),
                format!("s{}", m[rng.below(m.len())]),
                format!("s{}", other[rng.below(other.len())]),
            ));
            eid += 1;
        }
    }
    store
}

fn run_to_convergence(node_count: usize, max_ticks: usize) {
    let store = clustered_store(node_count);
    let mut layout = ForceLayout::new();
    layout.compute(&store);

    for tick in 0..max_ticks {
        let moving = layout.tick(&store);
        if tick % 25 == 0 || !moving {
            for (id, x, y) in layout.get_positions() {
                assert!(
                    x.is_finite() && y.is_finite(),
                    "non-finite position for {id} at tick {tick}: ({x}, {y})"
                );
            }
        }
        if !moving {
            return;
        }
    }
}

/// CI-friendly size: exercises the same clustered preferential-attachment
/// topology the showcase generates, within a debug-build time budget.
#[test]
fn two_thousand_nodes_converge_without_panicking() {
    run_to_convergence(2000, 600);
}

#[test]
#[ignore = "stress size; run with --ignored (release recommended)"]
fn five_thousand_nodes_converge_without_panicking() {
    run_to_convergence(5000, 2000);
}

#[test]
#[ignore = "stress size; run with --ignored (release recommended)"]
fn twenty_thousand_nodes_survive_early_ticks() {
    let store = clustered_store(20000);
    let mut layout = ForceLayout::new();
    layout.compute(&store);
    for _ in 0..120 {
        if !layout.tick(&store) {
            break;
        }
    }
    for (id, x, y) in layout.get_positions() {
        assert!(
            x.is_finite() && y.is_finite(),
            "non-finite position for {id}"
        );
    }
}
