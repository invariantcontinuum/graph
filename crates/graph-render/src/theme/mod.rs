//! Theme data model + JSON deserialization.
//!
//! The theme surface is split across submodules for clarity:
//! - `color` — `parse_css_color` and friends (CSS color strings → floats).
//! - `shapes` — `shape_index` (shape name → shader index).
//! - `defaults` — `#[serde(default = ...)]` value providers.
//!
//! Everything below stays under `graph_render::theme::*` via public re-exports
//! so existing consumers (e.g. `graph_main_wasm::engine`) keep working.

mod color;
mod defaults;
mod shapes;

pub use color::parse_css_color;
pub use shapes::shape_index;

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThemeConfig {
    #[serde(default = "defaults::background")]
    pub background: String,
    pub nodes: NodeTheme,
    pub edges: EdgeTheme,
    #[serde(default)]
    pub communities: CommunityTheme,
    #[serde(default)]
    pub interaction: InteractionTheme,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeTheme {
    pub default: NodeStyle,
    #[serde(rename = "byType", default)]
    pub by_type: HashMap<String, NodeStyleOverride>,
    #[serde(rename = "byStatus", default)]
    pub by_status: HashMap<String, NodeStatusOverride>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeStyle {
    #[serde(default = "defaults::shape")]
    pub shape: String,
    #[serde(default = "defaults::node_size")]
    pub size: f32,
    #[serde(rename = "halfWidth", default)]
    pub half_width: Option<f32>,
    #[serde(rename = "halfHeight", default)]
    pub half_height: Option<f32>,
    #[serde(rename = "cornerRadius", default)]
    pub corner_radius: Option<f32>,
    #[serde(default = "defaults::node_color")]
    pub color: String,
    #[serde(rename = "borderWidth", default = "defaults::border_width")]
    pub border_width: f32,
    #[serde(rename = "borderColor", default = "defaults::border_color")]
    pub border_color: String,
    #[serde(default)]
    pub label: Option<LabelStyle>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LabelStyle {
    pub field: String,
    #[serde(default = "defaults::label_color")]
    pub color: String,
    #[serde(default = "defaults::label_size")]
    pub size: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct NodeStyleOverride {
    pub shape: Option<String>,
    pub size: Option<f32>,
    #[serde(rename = "halfWidth")]
    pub half_width: Option<f32>,
    #[serde(rename = "halfHeight")]
    pub half_height: Option<f32>,
    #[serde(rename = "cornerRadius")]
    pub corner_radius: Option<f32>,
    pub color: Option<String>,
    #[serde(rename = "borderWidth")]
    pub border_width: Option<f32>,
    #[serde(rename = "borderColor")]
    pub border_color: Option<String>,
    #[serde(rename = "borderStyle")]
    pub border_style: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct NodeStatusOverride {
    #[serde(rename = "borderColor")]
    pub border_color: Option<String>,
    #[serde(rename = "borderWidth")]
    pub border_width: Option<f32>,
    #[serde(default)]
    pub pulse: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EdgeTheme {
    pub default: EdgeStyle,
    #[serde(rename = "byType", default)]
    pub by_type: HashMap<String, EdgeStyleOverride>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EdgeStyle {
    #[serde(default = "defaults::edge_color")]
    pub color: String,
    #[serde(default = "defaults::edge_width")]
    pub width: f32,
    #[serde(default = "defaults::arrow")]
    pub arrow: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct EdgeStyleOverride {
    pub color: Option<String>,
    pub width: Option<f32>,
    pub style: Option<String>,
    #[serde(default)]
    pub animate: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommunityTheme {
    #[serde(default)]
    pub hull: bool,
    #[serde(rename = "hullOpacity", default = "defaults::hull_opacity")]
    pub hull_opacity: f32,
    #[serde(default = "defaults::palette")]
    pub palette: String,
}

impl Default for CommunityTheme {
    fn default() -> Self {
        Self {
            hull: false,
            hull_opacity: defaults::hull_opacity(),
            palette: defaults::palette(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct InteractionTheme {
    #[serde(default)]
    pub hover: HoverStyle,
    #[serde(default)]
    pub select: SelectStyle,
    #[serde(default)]
    pub spotlight: SpotlightStyle,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HoverStyle {
    #[serde(default = "defaults::hover_scale")]
    pub scale: f32,
    #[serde(rename = "highlightNeighbors", default)]
    pub highlight_neighbors: bool,
    #[serde(rename = "dimOthers", default = "defaults::dim")]
    pub dim_others: f32,
}

impl Default for HoverStyle {
    fn default() -> Self {
        Self {
            scale: defaults::hover_scale(),
            highlight_neighbors: true,
            dim_others: defaults::dim(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SelectStyle {
    #[serde(rename = "borderColor", default = "defaults::select_border")]
    pub border_color: String,
    #[serde(rename = "borderWidth", default = "defaults::select_width")]
    pub border_width: f32,
    #[serde(rename = "expandLabel", default)]
    pub expand_label: bool,
}

impl Default for SelectStyle {
    fn default() -> Self {
        Self {
            border_color: defaults::select_border(),
            border_width: defaults::select_width(),
            expand_label: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpotlightStyle {
    #[serde(rename = "dimOpacity", default = "defaults::spotlight_dim")]
    pub dim_opacity: f32,
    #[serde(rename = "transitionMs", default = "defaults::transition")]
    pub transition_ms: u32,
}

impl Default for SpotlightStyle {
    fn default() -> Self {
        Self {
            dim_opacity: defaults::spotlight_dim(),
            transition_ms: defaults::transition(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_theme_json() {
        let json = r##"{"background":"#0d1117","nodes":{"default":{"shape":"circle","size":12,"color":"#8b949e"},"byType":{"service":{"color":"#58a6ff","size":16}},"byStatus":{"violation":{"borderColor":"#f85149","pulse":true}}},"edges":{"default":{"color":"#21262d","width":1},"byType":{"DEPENDS_ON":{"color":"#58a6ff"}}}}"##;
        let theme: ThemeConfig = serde_json::from_str(json).unwrap();
        assert_eq!(
            theme.nodes.by_type["service"].color.as_deref(),
            Some("#58a6ff")
        );
        assert!(theme.nodes.by_status["violation"].pulse);
    }

    #[test]
    fn parse_theme_with_nonuniform_sizing() {
        let json = r##"{"background":"#0d0d12","nodes":{"default":{"shape":"roundrectangle","halfWidth":55,"halfHeight":19,"cornerRadius":0.25,"color":"#0f0f1f","borderColor":"#3b4199"},"byType":{"database":{"shape":"barrel","halfWidth":55,"halfHeight":19,"color":"#0a1a14"}},"byStatus":{}},"edges":{"default":{"color":"#21262d","width":1},"byType":{}}}"##;
        let theme: ThemeConfig = serde_json::from_str(json).unwrap();
        assert_eq!(theme.nodes.default.shape, "roundrectangle");
        assert_eq!(theme.nodes.default.half_width, Some(55.0));
        assert_eq!(theme.nodes.default.half_height, Some(19.0));
        assert_eq!(theme.nodes.default.corner_radius, Some(0.25));
        let db = &theme.nodes.by_type["database"];
        assert_eq!(db.shape.as_deref(), Some("barrel"));
        assert_eq!(db.half_width, Some(55.0));
    }

    #[test]
    fn legacy_size_still_works() {
        let json = r##"{"background":"#000","nodes":{"default":{"shape":"circle","size":12,"color":"#888","borderWidth":1,"borderColor":"#333"},"byType":{},"byStatus":{}},"edges":{"default":{"color":"#333","width":1},"byType":{}}}"##;
        let theme: ThemeConfig = serde_json::from_str(json).unwrap();
        assert_eq!(theme.nodes.default.size, 12.0);
        assert_eq!(theme.nodes.default.half_width, None);
        assert_eq!(theme.nodes.default.half_height, None);
    }

    #[test]
    fn shape_index_covers_new_shapes() {
        assert_eq!(shape_index("circle"), 0.0);
        assert_eq!(shape_index("diamond"), 1.0);
        assert_eq!(shape_index("square"), 2.0);
        assert_eq!(shape_index("hexagon"), 3.0);
        assert_eq!(shape_index("triangle"), 4.0);
        assert_eq!(shape_index("octagon"), 5.0);
        assert_eq!(shape_index("roundrectangle"), 6.0);
        assert_eq!(shape_index("barrel"), 7.0);
        assert_eq!(shape_index("unknown"), 0.0);
    }

    #[test]
    fn default_theme_json_parses() {
        let json = include_str!("../../../graph-main-wasm/src/default_theme.json");
        let theme: ThemeConfig = serde_json::from_str(json).expect("default_theme.json must parse");
        assert_eq!(theme.nodes.default.shape, "roundrectangle");
        assert_eq!(theme.nodes.default.half_width, Some(55.0));
        assert_eq!(theme.nodes.default.half_height, Some(19.0));
        assert_eq!(
            theme.nodes.by_type["database"].shape.as_deref(),
            Some("barrel")
        );
        assert_eq!(
            theme.nodes.by_type["policy"].shape.as_deref(),
            Some("diamond")
        );
        assert!(theme.nodes.by_status["violation"].pulse);
        assert!(theme.edges.by_type.contains_key("violation"));
        assert!(theme.edges.by_type.contains_key("enforces"));
        assert_eq!(
            theme.edges.by_type["enforces"].style.as_deref(),
            Some("dotted")
        );
    }

    #[test]
    fn css_color_hex_6() {
        let (r, g, b, a) = parse_css_color("#ff0000");
        assert!((r - 1.0).abs() < 0.01);
        assert!(g < 0.01);
        assert!(b < 0.01);
        assert!((a - 1.0).abs() < 0.01);
    }

    #[test]
    fn css_color_hex_8() {
        let (r, g, b, a) = parse_css_color("#00ff0080");
        assert!(r < 0.01);
        assert!((g - 1.0).abs() < 0.01);
        assert!(b < 0.01);
        assert!((a - 128.0 / 255.0).abs() < 0.01);
    }

    #[test]
    fn css_color_rgb() {
        let (r, g, b, a) = parse_css_color("rgb(255, 0, 0)");
        assert!((r - 1.0).abs() < 0.01);
        assert!(g < 0.01);
        assert!(b < 0.01);
        assert!((a - 1.0).abs() < 0.01);
    }

    #[test]
    fn css_color_rgba() {
        let (r, g, b, a) = parse_css_color("rgba(99, 102, 241, 0.3)");
        assert!((r - 99.0 / 255.0).abs() < 0.01);
        assert!((g - 102.0 / 255.0).abs() < 0.01);
        assert!((b - 241.0 / 255.0).abs() < 0.01);
        assert!((a - 0.3).abs() < 0.01);
    }

    #[test]
    fn css_color_rgba_flexible_whitespace() {
        let (r, _g, _b, a) = parse_css_color("rgba(255,255,255,0.12)");
        assert!((r - 1.0).abs() < 0.01);
        assert!((a - 0.12).abs() < 0.01);
    }

    #[test]
    fn css_color_invalid_fallback() {
        let (r, g, b, a) = parse_css_color("not-a-color");
        assert!((r - 0.5).abs() < 0.01);
        assert!((g - 0.5).abs() < 0.01);
        assert!((b - 0.5).abs() < 0.01);
        assert!((a - 1.0).abs() < 0.01);
    }
}
