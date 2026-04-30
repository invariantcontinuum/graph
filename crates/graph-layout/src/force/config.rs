//! Force-directed layout tuning constants.
//!
//! With `rep = -REPULSION/d^2` and `att = ATTRACTION*d` the balanced distance
//! works out to `d_eq = cbrt(REPULSION/ATTRACTION)` — about 160 units here,
//! enough breathing room for 110×38 node rectangles to sit next to each
//! other without overlap while still letting 1-hop neighbors visibly cluster.

pub(super) const THETA_SQ: f32 = 0.81;
pub(super) const REPULSION: f32 = 20_000.0;
pub(super) const MAX_QUAD_DEPTH: usize = 40;
pub(super) const ATTRACTION: f32 = 0.005;

/// Minimum gap enforced in-step via a short-range hard bump so 110×38 node
/// rectangles (diag ≈ 117) never physically overlap even when the force
/// field settles at a slightly tighter distance than `d_eq`.
pub(super) const MIN_NODE_GAP: f32 = 140.0;
pub(super) const DAMPING: f32 = 0.86;
pub(super) const MIN_VELOCITY: f32 = 0.02;

/// 300 iterations of Barnes-Hut + attractive forces converge a 700-node
/// graph in ~400-700 ms in release WASM. Enough to reach a stable
/// minimum-energy configuration without dragging out first paint.
pub(super) const MAX_ITERATIONS: usize = 300;

/// Padding added on each side of the points' bounding box before tree build.
pub(super) const TREE_BOUNDS_PAD: f32 = 10.0;
