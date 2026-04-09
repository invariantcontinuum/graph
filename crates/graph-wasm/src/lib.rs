use wasm_bindgen::prelude::*;

pub mod engine;
pub mod events;
pub mod interop;
pub mod render_loop;
pub mod websocket;

#[wasm_bindgen(start)]
pub fn init() {
    console_log::init_with_level(log::Level::Info).ok();
}
