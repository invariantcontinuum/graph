use criterion::{criterion_group, criterion_main, Criterion, black_box};
use std::collections::HashMap;

// A simple structure to simulate NodeMeta
struct NodeMeta {
    node_type: String,
    status: String,
}

fn bench_get_legend(c: &mut Criterion) {
    let mut node_metadata: HashMap<String, NodeMeta> = HashMap::new();
    let mut edge_metadata: HashMap<String, String> = HashMap::new();

    // Populate with dummy data
    for i in 0..10000 {
        node_metadata.insert(
            format!("node_{}", i),
            NodeMeta {
                node_type: format!("type_{}", i % 20),
                status: "healthy".to_string(),
            },
        );
    }
    for i in 0..20000 {
        edge_metadata.insert(format!("edge_{}", i), format!("edge_type_{}", i % 10));
    }

    c.bench_function("legend_with_clone", |b| {
        b.iter(|| {
            let mut node_counts: HashMap<String, usize> = HashMap::new();
            let mut edge_counts: HashMap<String, usize> = HashMap::new();

            for meta in node_metadata.values() {
                *node_counts.entry(meta.node_type.clone()).or_insert(0) += 1;
            }
            for etype in edge_metadata.values() {
                *edge_counts.entry(etype.clone()).or_insert(0) += 1;
            }

            black_box((node_counts, edge_counts));
        });
    });
}

criterion_group!(benches, bench_get_legend, bench_get_legend_ref);
criterion_main!(benches);

fn bench_get_legend_ref(c: &mut Criterion) {
    let mut node_metadata: HashMap<String, NodeMeta> = HashMap::new();
    let mut edge_metadata: HashMap<String, String> = HashMap::new();

    // Populate with dummy data
    for i in 0..10000 {
        node_metadata.insert(
            format!("node_{}", i),
            NodeMeta {
                node_type: format!("type_{}", i % 20),
                status: "healthy".to_string(),
            },
        );
    }
    for i in 0..20000 {
        edge_metadata.insert(format!("edge_{}", i), format!("edge_type_{}", i % 10));
    }

    c.bench_function("legend_with_ref", |b| {
        b.iter(|| {
            let mut node_counts: HashMap<&str, usize> = HashMap::new();
            let mut edge_counts: HashMap<&str, usize> = HashMap::new();

            for meta in node_metadata.values() {
                *node_counts.entry(meta.node_type.as_str()).or_insert(0) += 1;
            }
            for etype in edge_metadata.values() {
                *edge_counts.entry(etype.as_str()).or_insert(0) += 1;
            }

            black_box((node_counts, edge_counts));
        });
    });
}
