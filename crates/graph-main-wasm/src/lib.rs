use wasm_bindgen::prelude::*;

// pub mod engine; // TODO: Task 6
pub mod spatial;

#[wasm_bindgen(start)]
pub fn init() {
    console_log::init_with_level(log::Level::Info).ok();
}
