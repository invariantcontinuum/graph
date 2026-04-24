//! Worker → engine data sync + theme / metadata setters.
//!
//! Every setter here flips `buffers_dirty` / `needs_render` so the next
//! `frame()` tick re-uploads GPU state. Hot-path consistency: `set_node_metadata`
//! and `set_theme` also call `rebuild_hit_test_cache` and `recompute_pulse`
//! so click/hover picking and the border pulse never race on a stale cache.

use std::collections::HashMap;
use wasm_bindgen::prelude::*;

use graph_render::theme::ThemeConfig;

use super::{NodeMeta, RenderEngine};

#[wasm_bindgen]
impl RenderEngine {
    pub fn update_positions(&mut self, positions: &[f32], flags: &[u8]) {
        self.positions = positions.to_vec();
        self.visual_flags = flags.to_vec();
        self.buffers_dirty = true;
        self.needs_render = true;
        // Do not remove — spatial.rebuild is the invariant that handle_click / handle_hover
        // depend on. Tests: crates/graph-main-wasm/tests/spatial_index.rs
        self.spatial.rebuild(&self.positions, 200);
        self.update_min_zoom();
    }

    pub fn update_edges(&mut self, edge_data: &[f32], edge_count: usize) {
        self.edge_data = edge_data.to_vec();
        self.edge_count = edge_count;
        self.buffers_dirty = true;
        self.needs_render = true;
    }

    pub fn set_edge_type_keys(&mut self, keys: Vec<String>) {
        self.edge_type_keys = keys;
        self.buffers_dirty = true;
        self.needs_render = true;
    }

    pub fn set_node_ids(&mut self, ids: Vec<String>) {
        self.node_ids = ids;
    }

    pub fn set_node_metadata(
        &mut self,
        ids_js: JsValue,
        types_js: JsValue,
        statuses_js: JsValue,
    ) -> Result<(), JsValue> {
        let ids: Vec<String> = serde_wasm_bindgen::from_value(ids_js)
            .map_err(|e| JsValue::from_str(&format!("ids: {e}")))?;
        let types: Vec<String> = serde_wasm_bindgen::from_value(types_js)
            .map_err(|e| JsValue::from_str(&format!("types: {e}")))?;
        let statuses: Vec<String> = serde_wasm_bindgen::from_value(statuses_js)
            .map_err(|e| JsValue::from_str(&format!("statuses: {e}")))?;
        // Keep node_ids in sync so hit-testing (click/drag/focus) never silently
        // fails because the ids vec is empty or stale. This merges the old
        // set_node_ids call into set_node_metadata so callers can't forget it.
        self.node_ids = ids.clone();
        self.node_metadata.clear();
        for (i, id) in ids.iter().enumerate() {
            self.node_metadata.insert(
                id.clone(),
                NodeMeta {
                    node_type: types.get(i).cloned().unwrap_or_else(|| "service".into()),
                    status: statuses.get(i).cloned().unwrap_or_else(|| "healthy".into()),
                },
            );
        }
        self.rebuild_hit_test_cache();
        self.recompute_pulse();
        self.buffers_dirty = true;
        Ok(())
    }

    pub fn set_edge_metadata(&mut self, ids_js: JsValue, types_js: JsValue) -> Result<(), JsValue> {
        let ids: Vec<String> = serde_wasm_bindgen::from_value(ids_js)
            .map_err(|e| JsValue::from_str(&format!("ids: {e}")))?;
        let types: Vec<String> = serde_wasm_bindgen::from_value(types_js)
            .map_err(|e| JsValue::from_str(&format!("types: {e}")))?;
        self.edge_metadata.clear();
        for (i, id) in ids.iter().enumerate() {
            self.edge_metadata.insert(
                id.clone(),
                types.get(i).cloned().unwrap_or_else(|| "depends".into()),
            );
        }
        Ok(())
    }

    pub fn get_legend(&self) -> JsValue {
        let mut node_counts: HashMap<&str, usize> = HashMap::new();
        let mut edge_counts: HashMap<&str, usize> = HashMap::new();

        for meta in self.node_metadata.values() {
            *node_counts.entry(&meta.node_type).or_insert(0) += 1;
        }
        for etype in self.edge_metadata.values() {
            *edge_counts.entry(etype).or_insert(0) += 1;
        }

        let mut summary =
            graph_core::graph::GraphStore::legend_summary_from_counts(&node_counts, &edge_counts);

        for entry in &mut summary.node_types {
            let override_ = self.theme.nodes.by_type.get(&entry.type_key);
            entry.shape = override_
                .and_then(|o| o.shape.clone())
                .unwrap_or_else(|| self.theme.nodes.default.shape.clone());
            entry.color = override_
                .and_then(|o| o.color.clone())
                .unwrap_or_else(|| self.theme.nodes.default.color.clone());
            entry.border_color = override_
                .and_then(|o| o.border_color.clone())
                .unwrap_or_else(|| self.theme.nodes.default.border_color.clone());
        }
        for entry in &mut summary.edge_types {
            let override_ = self.theme.edges.by_type.get(&entry.type_key);
            entry.color = override_
                .and_then(|o| o.color.clone())
                .unwrap_or_else(|| self.theme.edges.default.color.clone());
            entry.dash = override_.and_then(|o| o.style.clone());
        }

        serde_wasm_bindgen::to_value(&summary).unwrap_or(JsValue::NULL)
    }

    pub fn set_theme(&mut self, theme_js: &JsValue) -> Result<(), JsValue> {
        let theme: ThemeConfig = serde_wasm_bindgen::from_value(theme_js.clone())
            .map_err(|e| JsValue::from_str(&format!("{e}")))?;
        self.theme = theme;
        self.rebuild_hit_test_cache();
        self.recompute_pulse();
        self.buffers_dirty = true;
        self.needs_render = true;
        Ok(())
    }

    pub fn set_community_hulls(&mut self, show: bool) {
        self.show_hulls = show;
        self.buffers_dirty = true;
        self.needs_render = true;
    }

    /// Re-upload GPU buffers after a WebGL context loss → restore sequence.
    pub fn rehydrate(&mut self) {
        self.buffers_dirty = true;
        self.needs_render = true;
    }
}
