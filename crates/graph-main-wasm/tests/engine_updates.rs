use graph_main_wasm::engine::RenderEngine;
use wasm_bindgen::JsCast;
use wasm_bindgen_test::*;

wasm_bindgen_test_configure!(run_in_browser);

#[wasm_bindgen_test]
fn test_update_edges() {
    // Create a mock canvas
    let document = web_sys::window().unwrap().document().unwrap();
    let canvas = document.create_element("canvas").unwrap();
    let canvas: web_sys::HtmlCanvasElement = canvas.dyn_into().unwrap();
    canvas.set_width(800);
    canvas.set_height(600);

    let mut engine = RenderEngine::create(canvas).expect("Failed to create engine");

    // Mock edge data: [x1, y1, x2, y2, type_idx, x1, y1, x2, y2, type_idx, ...]
    // The exact layout depends on what EdgeRenderer expects,
    // but update_edges just stores the vec and count.
    let mock_data = vec![0.0, 0.0, 100.0, 100.0, 1.0];
    let count = 1;

    engine.update_edges(&mock_data, count);

    // We can't easily check private fields, but we can check if it doesn't crash
    // and if get_legend works (which uses edge_metadata but not edge_data directly).
    // The best we can do in an integration test is verify it accepts the data.
}

#[wasm_bindgen_test]
fn dragged_node_rewrites_connected_edge_endpoints_immediately() {
    let document = web_sys::window().unwrap().document().unwrap();
    let canvas = document.create_element("canvas").unwrap();
    let canvas: web_sys::HtmlCanvasElement = canvas.dyn_into().unwrap();
    canvas.set_width(800);
    canvas.set_height(600);

    let mut engine = RenderEngine::create(canvas).expect("Failed to create engine");
    let ids = serde_wasm_bindgen::to_value(&vec!["a".to_string(), "b".to_string()]).unwrap();
    let types =
        serde_wasm_bindgen::to_value(&vec!["service".to_string(), "service".to_string()]).unwrap();
    let statuses =
        serde_wasm_bindgen::to_value(&vec!["healthy".to_string(), "healthy".to_string()]).unwrap();
    engine
        .set_node_metadata(ids, types, statuses)
        .expect("metadata should parse");
    engine.update_positions(&[0.0, 0.0, 68.0, 0.0, 100.0, 0.0, 68.0, 0.0], &[0, 0]);
    engine.update_edges(&[0.0, 0.0, 100.0, 0.0, 0.0, 1.0], 1);

    let picked = engine.handle_node_drag_start(400.0, 300.0);
    assert_eq!(picked.as_deref(), Some("a"));
    engine.handle_node_drag_move(450.0, 300.0);

    let edge_data = engine.debug_edge_data();
    assert_eq!(edge_data.length(), 6);
    assert!(
        (edge_data.get_index(0) - 50.0).abs() < 0.01,
        "source x should track dragged node"
    );
    assert!(
        edge_data.get_index(1).abs() < 0.01,
        "source y should track dragged node"
    );
    assert!(
        (edge_data.get_index(2) - 100.0).abs() < 0.01,
        "target x should remain stable"
    );
}
