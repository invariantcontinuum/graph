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
