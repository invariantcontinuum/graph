//! Render-order contract: edge drawing MUST precede node drawing. Nothing
//! else enforces this — if someone reorders the calls, edges would visually
//! sit on top of nodes, breaking the "edges in background" feel.
//!
//! The frame orchestration lives in `engine/frame.rs` after the 0.2.3 split.

use std::fs;

#[test]
fn edges_draw_before_nodes_draw() {
    let src = fs::read_to_string("src/engine/frame.rs").expect("read source");
    let edge_pos = src
        .find("self.edge_renderer.draw")
        .expect("edge_renderer.draw call not found in src/engine/frame.rs");
    let node_pos = src
        .find("self.node_renderer")
        .expect("self.node_renderer not found in src/engine/frame.rs");
    assert!(
        edge_pos < node_pos,
        "edges draw must come before nodes draw (edge_pos={edge_pos}, node_pos={node_pos})"
    );
}
