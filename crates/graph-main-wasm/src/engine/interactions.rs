//! Pointer input handlers — click, hover, pan, zoom, and node drag.
//!
//! Drag handlers queue `pin_node` / `unpin_node` messages in
//! `pending_worker_messages`. The React wrapper drains that queue each tick
//! via `drain_worker_messages` and forwards them to the worker, so pinning
//! stays consistent between main-thread physics and worker-side layout.

use wasm_bindgen::prelude::*;

use super::RenderEngine;

#[wasm_bindgen]
impl RenderEngine {
    pub fn handle_click(&mut self, screen_x: f32, screen_y: f32) -> Option<String> {
        let (wx, wy) = self.camera.screen_to_world(screen_x, screen_y);
        let picked = self.hit_test_node(wx, wy);
        let picked_id = picked.and_then(|idx| self.node_ids.get(idx).cloned());
        // Click-to-spotlight is an engine invariant: selecting a node
        // immediately applies neighborhood dimming and selected styling.
        self.set_focus(picked_id.clone());
        picked_id
    }

    pub fn handle_hover(&mut self, screen_x: f32, screen_y: f32) -> Option<String> {
        let (wx, wy) = self.camera.screen_to_world(screen_x, screen_y);
        let picked = self.hit_test_node(wx, wy);

        if picked != self.hovered_idx {
            self.hovered_idx = picked;
            self.buffers_dirty = true;
            self.needs_render = true;
        }

        picked.and_then(|idx| self.node_ids.get(idx).cloned())
    }

    pub fn handle_pan_start(&mut self, x: f32, y: f32) {
        self.is_panning = true;
        self.last_mouse_x = x;
        self.last_mouse_y = y;
    }

    pub fn handle_pan_move(&mut self, x: f32, y: f32) {
        if self.is_panning {
            let dx = x - self.last_mouse_x;
            let dy = y - self.last_mouse_y;
            self.camera.pan(dx, dy);
            self.last_mouse_x = x;
            self.last_mouse_y = y;
            self.needs_render = true;
        }
    }

    pub fn handle_pan_end(&mut self) {
        self.is_panning = false;
    }

    pub fn handle_zoom(&mut self, delta: f32, x: f32, y: f32) {
        // Pointer-anchored zoom (Cytoscape-style): the world point under the
        // cursor stays pinned while zoom changes. Users who wheel-zoom
        // towards a target expect the target to grow, not slide to the
        // corner. Clamp pointer to the viewport rect so off-canvas scroll
        // events don't pick a wild anchor.
        let vw = self.camera.viewport_width();
        let vh = self.camera.viewport_height();
        let anchor_x = x.clamp(0.0, vw.max(1.0));
        let anchor_y = y.clamp(0.0, vh.max(1.0));
        // Slightly stronger factor per tick (was 1.04) so wheel feels crisp
        // without being jumpy; still much gentler than typical browser zoom.
        let factor = if delta > 0.0 { 0.92 } else { 1.08 };
        self.camera.zoom_at(factor, anchor_x, anchor_y);
        self.needs_render = true;
    }

    /// Start dragging the node at the given screen coordinates.
    /// Returns the node id if a node was picked, otherwise `None` (caller should
    /// fall back to pan).
    pub fn handle_node_drag_start(&mut self, screen_x: f32, screen_y: f32) -> Option<String> {
        let (wx, wy) = self.camera.screen_to_world(screen_x, screen_y);
        let idx = self.hit_test_node(wx, wy)?;
        self.is_dragging_node = true;
        self.dragged_idx = Some(idx);
        let node_id = self.node_ids.get(idx).cloned();
        // Pin at the node's CURRENT position, not the click coordinates.
        // Clicking near the edge of a node should not teleport it to the
        // click point — only a real drag should change its position.
        let base = idx * 4;
        let (pin_x, pin_y) = if base + 1 < self.positions.len() {
            (self.positions[base], self.positions[base + 1])
        } else {
            (wx, wy)
        };
        self.pending_worker_messages.push(serde_json::json!({
            "type": "pin_node",
            "idx": idx,
            "x": pin_x,
            "y": pin_y,
        }));
        node_id
    }

    /// Update the currently-dragged node's position. No-op if no drag active.
    pub fn handle_node_drag_move(&mut self, screen_x: f32, screen_y: f32) {
        let Some(idx) = self.dragged_idx else {
            return;
        };
        let (wx, wy) = self.camera.screen_to_world(screen_x, screen_y);
        let base = idx * 4;
        if base + 1 < self.positions.len() {
            self.positions[base] = wx;
            self.positions[base + 1] = wy;
        }
        self.buffers_dirty = true;
        self.needs_render = true;
        self.pending_worker_messages.push(serde_json::json!({
            "type": "pin_node",
            "idx": idx,
            "x": wx,
            "y": wy,
        }));
    }

    /// End the current drag. Queues an `unpin_node` message so the force
    /// layout reclaims the node.
    pub fn handle_node_drag_end(&mut self) {
        if let Some(idx) = self.dragged_idx.take() {
            self.pending_worker_messages.push(serde_json::json!({
                "type": "unpin_node",
                "idx": idx,
            }));
        }
        self.is_dragging_node = false;
    }

    /// Return (and clear) pending worker messages queued by drag handlers.
    /// The React wrapper calls this after each drag event and forwards the
    /// results via `worker.postMessage`.
    pub fn drain_worker_messages(&mut self) -> JsValue {
        let msgs = std::mem::take(&mut self.pending_worker_messages);
        serde_wasm_bindgen::to_value(&msgs).unwrap_or(JsValue::NULL)
    }
}
