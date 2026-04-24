//! Camera: fit, pan-to-node, zoom, focus + dim animation, min-zoom recalc.

use wasm_bindgen::prelude::*;

use super::RenderEngine;

const FOCUS_ANIM_DURATION_MS: f64 = 260.0;
const PAN_ANIM_DURATION_MS: f64 = 220.0;
const ZOOM_STEP_IN: f32 = 1.04;
const ZOOM_STEP_OUT: f32 = 0.96;
const FOCUS_ZOOM_CEILING_MULTIPLIER: f32 = 2.0;
const MIN_ZOOM_FIT_RATIO: f32 = 0.7;

#[wasm_bindgen]
impl RenderEngine {
    /// Compute the AABB of current node positions and snap the camera to it.
    /// Called from JS after every `update_positions` + layout settlement.
    /// NOTE: this is a snap (immediate write), not animated — only `focus_fit`
    /// uses the animated camera tween.
    pub fn fit(&mut self, padding_px: f32) {
        let all: Vec<usize> = (0..self.positions.len() / 4).collect();
        if let Some(((cx, cy), zoom)) = self.compute_fit_viewport(padding_px, &all) {
            self.camera.x = cx;
            self.camera.y = cy;
            self.camera.zoom = zoom;
            self.update_min_zoom();
            self.needs_render = true;
        }
    }

    /// Pan the camera to center on the node with id `id`, preserving the
    /// current zoom level. Legacy Cytoscape `cy.center(node)` equivalent.
    pub fn pan_to_node(&mut self, id: String) {
        let Some(idx) = self.node_ids.iter().position(|n| n == &id) else {
            return;
        };
        let off = idx * 4;
        if off + 1 >= self.positions.len() {
            return;
        }
        let cx = self.positions[off];
        let cy = self.positions[off + 1];
        self.start_camera_anim((cx, cy), self.camera.zoom, PAN_ANIM_DURATION_MS);
    }

    /// Multiplicative zoom around screen center.
    pub fn zoom_in(&mut self) {
        let cx = self.camera.viewport_width() * 0.5;
        let cy = self.camera.viewport_height() * 0.5;
        self.camera.zoom_at(ZOOM_STEP_IN, cx, cy);
        self.needs_render = true;
    }

    pub fn zoom_out(&mut self) {
        let cx = self.camera.viewport_width() * 0.5;
        let cy = self.camera.viewport_height() * 0.5;
        self.camera.zoom_at(ZOOM_STEP_OUT, cx, cy);
        self.needs_render = true;
    }

    /// Focus a node: dim every non-neighbor via `visual_flags` (bit 0 = dimmed).
    /// `None` clears the focus.
    pub fn set_focus(&mut self, id: Option<String>) {
        use crate::spotlight::{
            apply_dim_bits, build_coord_index, clear_dim_bits, neighborhood_indices,
        };

        let Some(id) = id else {
            self.selected_idx = None;
            clear_dim_bits(&mut self.visual_flags);
            self.buffers_dirty = true;
            self.needs_render = true;
            self.start_dim_anim(0.0);
            return;
        };
        let Some(focus_idx) = self.node_ids.iter().position(|n| n == &id) else {
            self.selected_idx = None;
            clear_dim_bits(&mut self.visual_flags);
            self.buffers_dirty = true;
            self.needs_render = true;
            self.start_dim_anim(0.0);
            return;
        };
        self.selected_idx = Some(focus_idx);

        let coord_to_idx = build_coord_index(&self.positions);
        let keep = neighborhood_indices(focus_idx, &self.edge_data, &coord_to_idx);
        let node_count = self.positions.len() / 4;
        apply_dim_bits(&mut self.visual_flags, node_count, &keep);

        self.buffers_dirty = true;
        self.needs_render = true;
        self.start_dim_anim(1.0);
    }

    /// Focus a node AND animate the camera to frame its 1-hop neighborhood.
    /// When `id` is `None`, clears focus and animates to fit all nodes.
    pub fn focus_fit(&mut self, id: Option<String>, padding_px: f32) {
        self.set_focus(id.clone());

        if id.is_none() {
            let all: Vec<usize> = (0..self.positions.len() / 4).collect();
            if all.is_empty() {
                return;
            }
            if let Some((center, zoom)) = self.compute_fit_viewport(padding_px, &all) {
                self.start_camera_anim(center, zoom, FOCUS_ANIM_DURATION_MS);
            }
            return;
        }

        let Some(focus_idx) = self.selected_idx else {
            return;
        };
        let indices = self.neighbor_indices_of_selected();
        let has_neighbors = !indices.is_empty();
        let group: Vec<usize> = if has_neighbors {
            let mut g = indices;
            if !g.contains(&focus_idx) {
                g.push(focus_idx);
            }
            g
        } else {
            vec![focus_idx]
        };

        let Some((center, fit_zoom)) = self.compute_fit_viewport(padding_px, &group) else {
            return;
        };
        let zoom = if has_neighbors {
            // Isolated/small neighborhoods can yield a large "fit" zoom — clamp
            // to a UX ceiling so tapping through neighbors doesn't pop to max.
            let ceiling =
                (self.camera.zoom * FOCUS_ZOOM_CEILING_MULTIPLIER).min(self.camera.max_zoom);
            fit_zoom.min(ceiling)
        } else {
            // Zero-neighbor selection — hold current zoom so the user stays in
            // spatial context rather than teleporting into a single-node frame.
            self.camera.zoom
        };
        self.start_camera_anim(center, zoom, FOCUS_ANIM_DURATION_MS);
    }

    /// Debug: return current dim tween state so the host can confirm spotlight
    /// is reaching the GPU.
    pub fn debug_focus_state(&self) -> JsValue {
        let dimmed_count = self.visual_flags.iter().filter(|&&v| v == 1).count();
        let obj = js_sys::Object::new();
        let _ = js_sys::Reflect::set(
            &obj,
            &"progress".into(),
            &JsValue::from(self.dim_progress as f64),
        );
        let _ = js_sys::Reflect::set(
            &obj,
            &"target".into(),
            &JsValue::from(self.dim_progress_target as f64),
        );
        let _ = js_sys::Reflect::set(
            &obj,
            &"start".into(),
            &JsValue::from(self.dim_progress_start as f64),
        );
        let _ = js_sys::Reflect::set(
            &obj,
            &"dimOpacity".into(),
            &JsValue::from(self.theme.interaction.spotlight.dim_opacity as f64),
        );
        let _ = js_sys::Reflect::set(
            &obj,
            &"selectedIdx".into(),
            &JsValue::from(self.selected_idx.map(|i| i as i32).unwrap_or(-1)),
        );
        let _ = js_sys::Reflect::set(
            &obj,
            &"dimmedCount".into(),
            &JsValue::from(dimmed_count as u32),
        );
        let _ = js_sys::Reflect::set(
            &obj,
            &"nodeCount".into(),
            &JsValue::from((self.positions.len() / 4) as u32),
        );
        obj.into()
    }
}

impl RenderEngine {
    pub(crate) fn current_time_ms() -> f64 {
        web_sys::window().unwrap().performance().unwrap().now()
    }

    pub(crate) fn start_camera_anim(
        &mut self,
        to_center: (f32, f32),
        to_zoom: f32,
        duration_ms: f64,
    ) {
        let from_center = (self.camera.x, self.camera.y);
        let from_zoom = self.camera.zoom;
        self.camera_anim = Some(crate::camera_anim::CameraAnim::new(
            (from_center, from_zoom),
            (to_center, to_zoom),
            Self::current_time_ms(),
            duration_ms,
        ));
        self.needs_render = true;
    }

    /// Restart the dim-progress tween from the CURRENT live value toward the
    /// given target in `[0.0, 1.0]`. Same duration for on and off so the UX
    /// feels symmetrical.
    pub(super) fn start_dim_anim(&mut self, target: f32) {
        self.dim_progress_start = self.dim_progress;
        self.dim_progress_target = target.clamp(0.0, 1.0);
        self.dim_anim_start_ms = Self::current_time_ms();
        self.needs_render = true;
    }

    pub(super) fn advance_dim_anim(&mut self, now_ms: f64) {
        if (self.dim_progress - self.dim_progress_target).abs() < 0.001 {
            self.dim_progress = self.dim_progress_target;
            return;
        }
        let elapsed = (now_ms - self.dim_anim_start_ms).max(0.0);
        let t = (elapsed / self.dim_anim_duration_ms.max(1.0)).clamp(0.0, 1.0) as f32;
        // Ease-out cubic — matches camera_anim's easing so both tweens feel like
        // the same motion language.
        let eased = 1.0 - (1.0 - t).powi(3);
        self.dim_progress =
            self.dim_progress_start + (self.dim_progress_target - self.dim_progress_start) * eased;
        self.needs_render = true;
    }

    /// Compute the target center and zoom level needed to frame the given node indices
    /// inside the current viewport (with `padding_px` inset on all sides).
    /// Returns `None` when the AABB is degenerate.
    pub(super) fn compute_fit_viewport(
        &self,
        padding_px: f32,
        indices: &[usize],
    ) -> Option<((f32, f32), f32)> {
        let (min_x, min_y, max_x, max_y) = aabb_of(indices, &self.positions)?;
        let cx = (min_x + max_x) * 0.5;
        let cy = (min_y + max_y) * 0.5;
        let graph_w = (max_x - min_x).max(f32::EPSILON);
        let graph_h = (max_y - min_y).max(f32::EPSILON);
        let scale_x = (self.camera.viewport_width() - 2.0 * padding_px).max(1.0) / graph_w;
        let scale_y = (self.camera.viewport_height() - 2.0 * padding_px).max(1.0) / graph_h;
        let zoom = scale_x
            .min(scale_y)
            .clamp(self.camera.min_zoom, self.camera.max_zoom);
        Some(((cx, cy), zoom))
    }

    /// Collect all node indices in the 1-hop closed neighborhood of
    /// `self.selected_idx`. Empty vec if nothing is selected.
    pub(super) fn neighbor_indices_of_selected(&self) -> Vec<usize> {
        let Some(focus_idx) = self.selected_idx else {
            return Vec::new();
        };
        let coord_to_idx = crate::spotlight::build_coord_index(&self.positions);
        let keep =
            crate::spotlight::neighborhood_indices(focus_idx, &self.edge_data, &coord_to_idx);
        keep.into_iter().collect()
    }

    /// Recompute `camera.min_zoom` so the user cannot zoom out past the rendered
    /// graph. The floor is 70% of the zoom level that would make the graph
    /// exactly fill the viewport.
    pub(super) fn update_min_zoom(&mut self) {
        if self.positions.is_empty() {
            return;
        }
        let vw = self.camera.viewport_width();
        let vh = self.camera.viewport_height();
        if vw < 1.0 || vh < 1.0 {
            return;
        }
        let Some((min_x, min_y, max_x, max_y)) = aabb_from_all_positions(&self.positions) else {
            return;
        };
        let graph_w = (max_x - min_x).max(f32::EPSILON);
        let graph_h = (max_y - min_y).max(f32::EPSILON);
        let fit_zoom = (vw / graph_w).min(vh / graph_h);
        self.camera.min_zoom = (fit_zoom * MIN_ZOOM_FIT_RATIO).clamp(0.01, self.camera.max_zoom);
    }
}

fn aabb_of(indices: &[usize], positions: &[f32]) -> Option<(f32, f32, f32, f32)> {
    let mut min_x = f32::INFINITY;
    let mut min_y = f32::INFINITY;
    let mut max_x = f32::NEG_INFINITY;
    let mut max_y = f32::NEG_INFINITY;
    for &i in indices {
        let off = i * 4;
        if off + 2 >= positions.len() {
            continue;
        }
        let x = positions[off];
        let y = positions[off + 1];
        let r = positions[off + 2];
        min_x = min_x.min(x - r);
        max_x = max_x.max(x + r);
        min_y = min_y.min(y - r);
        max_y = max_y.max(y + r);
    }
    min_x.is_finite().then_some((min_x, min_y, max_x, max_y))
}

fn aabb_from_all_positions(positions: &[f32]) -> Option<(f32, f32, f32, f32)> {
    let mut min_x = f32::INFINITY;
    let mut min_y = f32::INFINITY;
    let mut max_x = f32::NEG_INFINITY;
    let mut max_y = f32::NEG_INFINITY;
    for chunk in positions.chunks_exact(4) {
        let (x, y, r) = (chunk[0], chunk[1], chunk[2]);
        min_x = min_x.min(x - r);
        min_y = min_y.min(y - r);
        max_x = max_x.max(x + r);
        max_y = max_y.max(y + r);
    }
    min_x.is_finite().then_some((min_x, min_y, max_x, max_y))
}
