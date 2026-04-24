//! Main-thread render engine.
//!
//! This is the WASM export surface the React wrapper drives. Internally the
//! engine is split across submodules to keep each concern focused:
//!
//! | module | responsibility |
//! |--------|----------------|
//! | `data` | worker-data ingest, theme, metadata, legend snapshot |
//! | `interactions` | pointer handlers — click/hover/pan/zoom/drag + worker-message queue |
//! | `frame` | per-frame render tick, subscriber dispatch, GL state orchestration |
//! | `camera` | fit, pan-to-node, zoom, focus + dim animation, min-zoom recalc |
//! | `buffers` | per-instance buffer assembly (nodes, edges, arrows) + hit-test cache |
//!
//! All submodules add `#[wasm_bindgen] impl RenderEngine` blocks (or plain
//! `impl RenderEngine` for private helpers). `wasm-bindgen` supports
//! multiple public impl blocks for the same type across modules, so the
//! JS-facing API surface is unchanged.

mod buffers;
mod camera;
mod data;
mod frame;
mod interactions;

use wasm_bindgen::prelude::*;
use web_sys::HtmlCanvasElement;

use graph_render::arrows::ArrowRenderer;
use graph_render::camera::Camera;
use graph_render::context::RenderContext;
use graph_render::edges::EdgeRenderer;
use graph_render::hulls::HullRenderer;
use graph_render::nodes::NodeRenderer;
use graph_render::text::TextRenderer;
use graph_render::theme::ThemeConfig;

use crate::pulse::PulseState;
use crate::spatial::SpatialGrid;

pub(crate) const DEFAULT_THEME_JSON: &str = include_str!("../default_theme.json");

/// Safe fallback bounding half-extent used when node metadata is absent.
/// Also the minimum coarse lookup radius for the spatial hit test.
pub(crate) const DEFAULT_HALF_EXTENT: f32 = 20.0;

#[derive(Debug, Clone)]
pub struct NodeMeta {
    pub node_type: String,
    pub status: String,
}

#[derive(Debug, Clone)]
pub struct ResolvedNodeStyle {
    pub half_w: f32,
    pub half_h: f32,
    pub color: [f32; 4],
    pub border_color: [f32; 4],
    pub border_width: f32,
    pub shape: f32,
    pub flags: u32,
}

#[wasm_bindgen]
pub struct RenderEngine {
    pub(super) ctx: RenderContext,
    pub(super) camera: Camera,
    pub(super) theme: ThemeConfig,

    // Renderers
    pub(super) node_renderer: NodeRenderer,
    pub(super) edge_renderer: EdgeRenderer,
    pub(super) arrow_renderer: ArrowRenderer,
    pub(super) text_renderer: TextRenderer,
    pub(super) hull_renderer: HullRenderer,

    // Current data from worker
    pub(super) positions: Vec<f32>,
    pub(super) visual_flags: Vec<u8>,
    pub(super) edge_data: Vec<f32>,
    pub(super) edge_count: usize,
    pub(super) edge_type_keys: Vec<String>,
    pub(super) node_ids: Vec<String>,
    pub(super) node_metadata: std::collections::HashMap<String, NodeMeta>,
    pub(super) edge_metadata: std::collections::HashMap<String, String>,

    // Spatial index
    pub(super) spatial: SpatialGrid,

    /// Cached (half_w, half_h) per node, index-aligned with `node_ids`.
    /// Rebuilt in `set_node_metadata` and `set_theme`. Used by `hit_test_node`
    /// to avoid repeated theme resolution on the hover/click hot path.
    pub(super) node_half_dims: Vec<(f32, f32)>,
    /// Cached worst-case bounding dimension across all nodes (max of max(hw, hh)).
    /// Used as the coarse spatial-grid lookup radius.
    pub(super) cached_max_bound: f32,

    // Interaction state
    pub(super) hovered_idx: Option<usize>,
    pub(super) selected_idx: Option<usize>,
    pub(super) show_hulls: bool,

    // Panning state
    pub(super) is_panning: bool,
    pub(super) last_mouse_x: f32,
    pub(super) last_mouse_y: f32,

    // Drag state
    pub(super) is_dragging_node: bool,
    pub(super) dragged_idx: Option<usize>,
    pub(super) pending_worker_messages: Vec<serde_json::Value>,

    // Animation
    pub(super) start_time: f64,
    pub(super) camera_anim: Option<crate::camera_anim::CameraAnim>,
    pub(super) pulse: PulseState,
    pub(super) buffers_dirty: bool,
    pub(super) needs_render: bool,

    // Dim tween — when focus changes, this progresses 0 -> 1 over ~250 ms so
    // non-neighbor nodes fade out smoothly instead of hard-cutting. The shader
    // reads the tweened value via `u_dim_progress`. When focus clears, the
    // tween progresses 1 -> 0. When focus switches A -> B with buffers_dirty
    // rebuilt, the tween resets and replays so the new dim set also fades in.
    pub(super) dim_progress: f32,
    pub(super) dim_progress_target: f32,
    pub(super) dim_progress_start: f32,
    pub(super) dim_anim_start_ms: f64,
    pub(super) dim_anim_duration_ms: f64,

    // Frame budget tracking
    pub(super) budget_overruns: u32,

    // Per-frame JS subscribers (e.g., Canvas2D label overlay).
    // Invoked at the end of each `frame()` tick with `{positions, vpMatrix}`.
    pub(super) frame_subscribers: Vec<js_sys::Function>,

    // Edge-data JS subscribers (e.g., Canvas2D EdgeLabelsOverlay).
    // Invoked synchronously alongside `notify_subscribers` each frame tick
    // with `{edgeData: Float32Array, focusIdx: i32}`.
    pub(super) edge_subscribers: Vec<js_sys::Function>,
}

#[wasm_bindgen]
impl RenderEngine {
    #[wasm_bindgen(constructor)]
    pub fn create(canvas: HtmlCanvasElement) -> Result<RenderEngine, JsValue> {
        let ctx = RenderContext::new(canvas).map_err(|e| JsValue::from_str(&e))?;
        let camera = Camera::new(ctx.width as f32, ctx.height as f32);
        let theme: ThemeConfig = serde_json::from_str(DEFAULT_THEME_JSON)
            .map_err(|e| JsValue::from_str(&format!("Theme parse: {e}")))?;

        let node_renderer = NodeRenderer::new(&ctx).map_err(|e| JsValue::from_str(&e))?;
        let edge_renderer = EdgeRenderer::new(&ctx).map_err(|e| JsValue::from_str(&e))?;
        let arrow_renderer = ArrowRenderer::new(&ctx).map_err(|e| JsValue::from_str(&e))?;
        let text_renderer = TextRenderer::new(&ctx).map_err(|e| JsValue::from_str(&e))?;
        let hull_renderer = HullRenderer::new(&ctx).map_err(|e| JsValue::from_str(&e))?;

        Ok(Self {
            ctx,
            camera,
            theme,
            node_renderer,
            edge_renderer,
            arrow_renderer,
            text_renderer,
            hull_renderer,
            positions: Vec::new(),
            visual_flags: Vec::new(),
            edge_data: Vec::new(),
            edge_count: 0,
            edge_type_keys: Vec::new(),
            node_ids: Vec::new(),
            node_metadata: std::collections::HashMap::new(),
            edge_metadata: std::collections::HashMap::new(),
            spatial: SpatialGrid::new(),
            node_half_dims: Vec::new(),
            cached_max_bound: DEFAULT_HALF_EXTENT,
            hovered_idx: None,
            selected_idx: None,
            show_hulls: false,
            is_panning: false,
            last_mouse_x: 0.0,
            last_mouse_y: 0.0,
            is_dragging_node: false,
            dragged_idx: None,
            pending_worker_messages: Vec::new(),
            start_time: 0.0,
            camera_anim: None,
            pulse: PulseState::new(Self::current_time_ms()),
            buffers_dirty: true,
            needs_render: true,
            dim_progress: 0.0,
            dim_progress_target: 0.0,
            dim_progress_start: 0.0,
            dim_anim_start_ms: 0.0,
            dim_anim_duration_ms: 250.0,
            budget_overruns: 0,
            frame_subscribers: Vec::new(),
            edge_subscribers: Vec::new(),
        })
    }
}
