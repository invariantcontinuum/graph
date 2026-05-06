use criterion::{criterion_group, criterion_main, Criterion};
use graph_core::graph::GraphStore;
use graph_core::types::{EdgeData, NodeData};
use graph_layout::force::ForceLayout;
use graph_layout::LayoutEngine;

fn generate_graph(nodes: usize, edges_per_node: usize) -> GraphStore {
    let mut graph = GraphStore::new();
    for i in 0..nodes {
        graph.add_node(NodeData {
            id: format!("n{}", i),
            name: format!("Node {}", i),
            node_type: "default".to_string(),
            domain: "default".to_string(),
            status: "active".to_string(),
            community: None,
            meta: Default::default(),
        });
    }

    for i in 0..nodes {
        for j in 1..=edges_per_node {
            let target = (i + j) % nodes;
            graph.add_edge(EdgeData {
                id: format!("e{}-{}", i, target),
                source: format!("n{}", i),
                target: format!("n{}", target),
                edge_type: "default".to_string(),
                label: "".to_string(),
                weight: 1.0,
            });
        }
    }
    graph
}

fn bench_force_layout(c: &mut Criterion) {
    let graph = generate_graph(1000, 3);
    let mut layout = ForceLayout::new();

    c.bench_function("force_layout_1k_nodes", |b| {
        b.iter(|| {
            layout.compute(&graph);
        })
    });
}

criterion_group!(benches, bench_force_layout);
criterion_main!(benches);
