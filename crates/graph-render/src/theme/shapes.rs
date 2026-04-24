//! Shape-name → shader-index mapping.
//!
//! The fragment shader switches on an integer shape index, so the theme
//! name (which comes from JSON) is looked up here once and cached on the
//! node instance data. Unknown names fall back to `circle` (index 0) so
//! a typo in user-supplied theme JSON degrades to the default rather
//! than panicking.

/// Shader index for the `circle` shape (the fallback for unknown names).
pub const CIRCLE: f32 = 0.0;
pub const DIAMOND: f32 = 1.0;
pub const SQUARE: f32 = 2.0;
pub const HEXAGON: f32 = 3.0;
pub const TRIANGLE: f32 = 4.0;
pub const OCTAGON: f32 = 5.0;
pub const ROUND_RECTANGLE: f32 = 6.0;
pub const BARREL: f32 = 7.0;

/// Map a shape name to its shader index. Unknown names return `CIRCLE`.
#[must_use]
pub fn shape_index(shape: &str) -> f32 {
    match shape {
        "diamond" => DIAMOND,
        "square" => SQUARE,
        "hexagon" => HEXAGON,
        "triangle" => TRIANGLE,
        "octagon" => OCTAGON,
        "roundrectangle" => ROUND_RECTANGLE,
        "barrel" => BARREL,
        _ => CIRCLE,
    }
}
