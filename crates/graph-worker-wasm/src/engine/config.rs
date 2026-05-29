//! Layout tuning constants specific to the worker engine.
//!
//! Grid layout defaults — typical card-node footprint plus padding. Width/height
//! intentionally cover the package theme's 136x48 default card nodes and the
//! wider showcase cards, so deterministic layouts do not visually overlap after
//! the camera fits the graph. `viewport_ratio` is a bootstrap only — the main thread pushes the
//! live canvas aspect via `set_viewport_ratio` immediately after mount so the
//! first layout already matches the viewport.
//!
//! NOTE on padding: larger padding spreads nodes further apart in WORLD space,
//! but the camera then fits to a larger world AABB and per-node SCREEN size
//! shrinks in lockstep — so padding alone does not help label legibility at
//! fit zoom. Keep it modest (visual gutter only); the `LabelOverlay`'s own
//! size threshold and minimum font size handle whether labels render at tiny
//! zoom.

pub(super) const GRID_PADDING: f32 = 28.0;
pub(super) const GRID_NODE_W: f32 = 164.0;
pub(super) const GRID_NODE_H: f32 = 64.0;
pub(super) const GRID_VIEWPORT_RATIO: f32 = 1.77;

/// Radius (in world units) burned into the per-node instance buffer's third
/// float. The renderer's vertex shader treats this as a fallback when the
/// theme's non-uniform `halfWidth`/`halfHeight` take precedence; keeping a
/// single constant here matches the default theme.
pub(super) const NODE_RADIUS_STUB: f32 = 68.0;
