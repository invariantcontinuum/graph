//! Per-frame render tick + subscriber dispatch.
//!
//! The frame handler does three things in order:
//! 1. Advance camera + dim animations (always — even if the scene is static,
//!    overlays need vpMatrix updates to track pan/zoom).
//! 2. Notify frame + edge subscribers (zero-copy `Float32Array::view`).
//! 3. If `needs_render`, resize the context, rebuild buffers if dirty, and
//!    draw all passes in back-to-front order: hulls → edges → arrows →
//!    nodes → text.

use wasm_bindgen::prelude::*;

use graph_render::theme::parse_css_color;

use super::RenderEngine;

const FRAME_BUDGET_MS: f64 = 8.0;

#[wasm_bindgen]
impl RenderEngine {
    /// Main render tick. Returns `true` when the scene actually repainted
    /// (so the host can schedule the next RAF only when needed).
    pub fn frame(&mut self, timestamp: f64) -> bool {
        if let Some(anim) = self.camera_anim {
            let ((cx, cy), z, done) = anim.sample(timestamp);
            self.camera.x = cx;
            self.camera.y = cy;
            self.camera.zoom = z.clamp(self.camera.min_zoom, self.camera.max_zoom);
            if done {
                self.camera_anim = None;
            }
            self.needs_render = true;
        }

        self.advance_dim_anim(timestamp);

        let vp = self.camera.view_projection_matrix();
        self.notify_subscribers(&vp);

        if !self.needs_render {
            return false;
        }

        if self.start_time == 0.0 {
            self.start_time = timestamp;
        }
        let time = ((timestamp - self.start_time) / 1000.0) as f32;

        self.ctx.resize();
        self.camera
            .set_viewport(self.ctx.width as f32, self.ctx.height as f32);

        if self.buffers_dirty {
            let start = js_sys::Date::now();
            self.rebuild_buffers();
            let elapsed = js_sys::Date::now() - start;
            self.budget_overruns = if elapsed > FRAME_BUDGET_MS {
                self.budget_overruns + 1
            } else {
                0
            };
            self.buffers_dirty = false;
        }

        let (br, bg, bb, ba) = parse_css_color(&self.theme.background);
        self.ctx.clear(br, bg, bb, ba);

        self.hull_renderer.draw(&self.ctx.gl, &vp);
        self.edge_renderer.draw(&self.ctx.gl, &vp, time);
        self.arrow_renderer.draw(&self.ctx.gl, &vp);
        let dim_opacity = self
            .theme
            .interaction
            .spotlight
            .dim_opacity
            .clamp(0.02, 1.0);
        self.node_renderer
            .draw(&self.ctx.gl, &vp, time, dim_opacity, self.dim_progress);
        self.text_renderer.draw(&self.ctx.gl, &vp);

        self.needs_render = false;
        // Keep the RAF loop alive while pulse nodes are active so the
        // border-width animation updates continuously.
        if self.pulse.has_any() {
            self.needs_render = true;
            self.buffers_dirty = true;
        }
        true
    }

    pub fn needs_frame(&self) -> bool {
        self.needs_render
    }

    pub fn request_render(&mut self) {
        self.needs_render = true;
    }

    /// Subscribe to per-frame position+camera updates (for the Canvas2D label overlay).
    /// Callback invoked once per `frame()` tick with `{positions, vpMatrix}`.
    pub fn subscribe_frame(&mut self, cb: js_sys::Function) {
        self.frame_subscribers.push(cb);
        // Immediate synchronous callback so late subscribers (e.g. LabelOverlay
        // mounting after grid convergence) receive the current state instead of
        // waiting for the next render frame that may never come.
        let vp = self.camera.view_projection_matrix();
        self.notify_subscribers(&vp);
    }

    /// Subscribe to edge-data updates (for the Canvas2D EdgeLabelsOverlay).
    /// Returns a subscriber index usable with `unsubscribe_edges`.
    pub fn subscribe_edges(&mut self, cb: js_sys::Function) -> u32 {
        let idx = self.edge_subscribers.len() as u32;
        self.edge_subscribers.push(cb);
        self.dispatch_edges_changed();
        idx
    }

    pub fn unsubscribe_edges(&mut self, idx: u32) {
        let i = idx as usize;
        if i < self.edge_subscribers.len() {
            self.edge_subscribers.remove(i);
        }
    }
}

impl RenderEngine {
    /// Dispatch edge data to all edge subscribers.
    ///
    /// SAFETY: `Float32Array::view` borrows from WASM linear memory. The
    /// backing `self.edge_data` Vec is not mutated while the view is live
    /// (WASM is single-threaded; callbacks run synchronously and return
    /// before Rust code resumes). Same idiom as `notify_subscribers`.
    pub(super) fn dispatch_edges_changed(&self) {
        if self.edge_subscribers.is_empty() {
            return;
        }
        let focus = self.selected_idx.map(|i| i as i32).unwrap_or(-1);
        let obj = js_sys::Object::new();
        let edge_f32 = if self.edge_data.is_empty() {
            js_sys::Float32Array::new_with_length(0)
        } else {
            unsafe { js_sys::Float32Array::view(&self.edge_data) }
        };
        let _ = js_sys::Reflect::set(&obj, &"edgeData".into(), &edge_f32);
        let _ = js_sys::Reflect::set(&obj, &"focusIdx".into(), &JsValue::from(focus));
        if let Ok(keys) = serde_wasm_bindgen::to_value(&self.edge_type_keys) {
            let _ = js_sys::Reflect::set(&obj, &"edgeTypeKeys".into(), &keys);
        }
        let obj_val: JsValue = obj.into();
        for cb in &self.edge_subscribers {
            let _ = cb.call1(&JsValue::NULL, &obj_val);
        }
    }

    /// Notify frame subscribers with the current positions and VP matrix.
    ///
    /// SAFETY: Same zero-copy `Float32Array::view` contract as
    /// `dispatch_edges_changed`.
    pub(super) fn notify_subscribers(&self, vp: &[f32; 16]) {
        // Always dispatch edge changes so EdgeLabelsOverlay tracks focus state
        // even when no frame-subscribers are active.
        self.dispatch_edges_changed();

        if self.frame_subscribers.is_empty() || self.positions.is_empty() {
            return;
        }
        let positions_f32 = unsafe { js_sys::Float32Array::view(&self.positions) };
        let vp_f32 = unsafe { js_sys::Float32Array::view(&vp[..]) };
        let obj = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&obj, &"positions".into(), &positions_f32);
        let _ = js_sys::Reflect::set(&obj, &"vpMatrix".into(), &vp_f32);
        for cb in &self.frame_subscribers {
            let _ = cb.call1(&JsValue::NULL, &obj);
        }
    }
}
