//! Default values for `ThemeConfig` fields, factored out so every struct
//! in the theme module can reference them via `#[serde(default = "...")]`
//! without cluttering the type definitions.

pub(super) fn background() -> String {
    "#0d1117".into()
}
pub(super) fn shape() -> String {
    "circle".into()
}
pub(super) fn node_size() -> f32 {
    12.0
}
pub(super) fn node_color() -> String {
    "#8b949e".into()
}
pub(super) fn border_width() -> f32 {
    1.5
}
pub(super) fn border_color() -> String {
    "#30363d".into()
}
pub(super) fn label_color() -> String {
    "#c9d1d9".into()
}
pub(super) fn label_size() -> f32 {
    11.0
}
pub(super) fn edge_color() -> String {
    "#21262d".into()
}
pub(super) fn edge_width() -> f32 {
    1.0
}
pub(super) fn arrow() -> String {
    "target".into()
}
pub(super) fn hull_opacity() -> f32 {
    0.06
}
pub(super) fn palette() -> String {
    "categorical-12".into()
}
pub(super) fn hover_scale() -> f32 {
    1.3
}
pub(super) fn dim() -> f32 {
    0.15
}
pub(super) fn select_border() -> String {
    "#ffffff".into()
}
pub(super) fn select_width() -> f32 {
    3.0
}
pub(super) fn spotlight_dim() -> f32 {
    0.05
}
pub(super) fn transition() -> u32 {
    300
}
