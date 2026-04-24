//! Layout tuning constants specific to the worker engine.
//!
//! Grid layout defaults — typical node footprint plus padding. Width/height
//! match the theme's default node size (110x38); padding provides a visual
//! gutter. `viewport_ratio` is a bootstrap only — the main thread pushes the
//! live canvas aspect via `set_viewport_ratio` immediately after mount so the
//! first layout already matches the viewport.
//!
//! NOTE on padding: larger padding spreads nodes further apart in WORLD space,
//! but the camera then fits to a larger world AABB and per-node SCREEN size
//! shrinks in lockstep — so padding alone does not help label legibility at
//! fit zoom. Keep it modest (visual gutter only); the `LabelOverlay`'s own
//! size threshold and minimum font size handle whether labels render at tiny
//! zoom.

pub(super) const GRID_PADDING: f32 = 18.0;
pub(super) const GRID_NODE_W: f32 = 110.0;
pub(super) const GRID_NODE_H: f32 = 38.0;
pub(super) const GRID_VIEWPORT_RATIO: f32 = 1.77;

/// Radius (in world units) burned into the per-node instance buffer's third
/// float. The renderer's vertex shader treats this as a fallback when the
/// theme's non-uniform `halfWidth`/`halfHeight` take precedence; keeping a
/// single constant here matches the default theme.
pub(super) const NODE_RADIUS_STUB: f32 = 55.0;
