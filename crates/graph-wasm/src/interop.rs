use wasm_bindgen::prelude::*;
use serde::de::DeserializeOwned;

pub fn from_js_value<T: DeserializeOwned>(val: &JsValue) -> Result<T, String> {
    serde_wasm_bindgen::from_value(val.clone()).map_err(|e| format!("Deserialize error: {e}"))
}

pub fn to_js_value<T: serde::Serialize>(val: &T) -> Result<JsValue, String> {
    serde_wasm_bindgen::to_value(val).map_err(|e| format!("Serialize error: {e}"))
}
