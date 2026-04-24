//! Per-instance GPU buffer assembly + hit-test cache.
//!
//! The node buffer layout is stride-15 (see `graph_render::nodes`); the edge
//! buffer is stride-11 (bezier-tessellated); arrows are stride-9. All three
//! are populated in `rebuild_buffers`, keyed off the same theme + metadata
//! state. Hit testing uses a cached (half_w, half_h) per node so hover and
//! click stay O(1) per candidate against the spatial grid.

use graph_render::arrows::ARROW_INSTANCE_FLOATS;
use graph_render::edges::EDGE_INSTANCE_FLOATS;
use graph_render::nodes::NODE_INSTANCE_FLOATS;
use graph_render::theme::{parse_css_color, shape_index};

use super::{DEFAULT_HALF_EXTENT, RenderEngine, ResolvedNodeStyle};

// Shader flag bits — must match `node.frag`.
const FLAG_PULSE: u32 = 1;
const FLAG_HOVERED: u32 = 2;
const FLAG_SELECTED: u32 = 4;
const FLAG_DIMMED: u32 = 8;

const SELECTED_FILL_ALPHA_SCALE: f32 = 0.78;
const SELECTED_BORDER_WIDTH_ADD: f32 = 2.0;
const SELECTED_SIZE_SCALE: f32 = 1.08;
const FOCUS_EDGE_WIDTH_SCALE: f32 = 2.2;
const DIM_EDGE_WIDTH_SCALE: f32 = 0.75;
const FOCUS_EDGE_ALPHA: f32 = 0.95;
const ARROW_WORLD_SIZE: f32 = 6.0;

impl RenderEngine {
    /// Resolve effective per-node style from theme: default + type override + status override.
    pub(super) fn resolved_node_style(&self, node_type: &str, status: &str) -> ResolvedNodeStyle {
        let default = &self.theme.nodes.default;
        let type_override = self.theme.nodes.by_type.get(node_type);
        let status_override = self.theme.nodes.by_status.get(status);

        let shape_name = type_override
            .and_then(|o| o.shape.clone())
            .unwrap_or_else(|| default.shape.clone());
        let shape = shape_index(&shape_name);

        let half_w = type_override
            .and_then(|o| o.half_width)
            .or(default.half_width)
            .unwrap_or(default.size);
        let half_h = type_override
            .and_then(|o| o.half_height)
            .or(default.half_height)
            .unwrap_or(default.size);

        let color_hex = type_override
            .and_then(|o| o.color.clone())
            .unwrap_or_else(|| default.color.clone());
        let color = parse_color_tuple(&color_hex);

        let border_color_hex = status_override
            .and_then(|o| o.border_color.clone())
            .or_else(|| type_override.and_then(|o| o.border_color.clone()))
            .unwrap_or_else(|| default.border_color.clone());
        let border_color = parse_color_tuple(&border_color_hex);

        let border_width = status_override
            .and_then(|o| o.border_width)
            .or_else(|| type_override.and_then(|o| o.border_width))
            .unwrap_or(default.border_width);

        let flags = if status_override.map(|o| o.pulse).unwrap_or(false) {
            FLAG_PULSE
        } else {
            0
        };

        ResolvedNodeStyle {
            half_w,
            half_h,
            color,
            border_color,
            border_width,
            shape,
            flags,
        }
    }

    /// Rebuild `pulse_indices` from `node_ids` order + theme byStatus.pulse map.
    /// Must be called whenever `node_metadata` or `theme` changes.
    pub(super) fn recompute_pulse(&mut self) {
        let status_pulse: std::collections::HashMap<String, bool> = self
            .theme
            .nodes
            .by_status
            .iter()
            .filter(|(_, v)| v.pulse)
            .map(|(k, _)| (k.clone(), true))
            .collect();
        let node_statuses: Vec<String> = self
            .node_ids
            .iter()
            .map(|id| {
                self.node_metadata
                    .get(id)
                    .map(|m| m.status.clone())
                    .unwrap_or_else(|| "healthy".to_string())
            })
            .collect();
        self.pulse.recompute(&node_statuses, &status_pulse);
    }

    /// Rebuild cached per-node half-dimensions used by `hit_test_node`.
    /// Called whenever node_metadata or the theme changes so the hot path
    /// (hover/click) does not need to resolve styles.
    pub(super) fn rebuild_hit_test_cache(&mut self) {
        self.node_half_dims.clear();
        self.node_half_dims.reserve(self.node_ids.len());
        let mut max_bound = 0.0_f32;
        for id in &self.node_ids {
            let (hw, hh) = self
                .node_metadata
                .get(id)
                .map(|meta| {
                    let style = self.resolved_node_style(&meta.node_type, &meta.status);
                    (style.half_w, style.half_h)
                })
                .unwrap_or((DEFAULT_HALF_EXTENT, DEFAULT_HALF_EXTENT));
            self.node_half_dims.push((hw, hh));
            max_bound = max_bound.max(hw.max(hh));
        }
        self.cached_max_bound = max_bound.max(DEFAULT_HALF_EXTENT);
    }

    /// Coarse-then-fine node picking: uses the spatial grid for a candidate list,
    /// then performs a per-node AABB check using cached half_w / half_h.
    pub(super) fn hit_test_node(&self, world_x: f32, world_y: f32) -> Option<usize> {
        let max_bound = self.cached_max_bound;
        let candidates = self.spatial.candidates_within(world_x, world_y, max_bound);

        for idx in candidates {
            if idx * 4 + 1 >= self.positions.len() {
                continue;
            }
            let cx = self.positions[idx * 4];
            let cy = self.positions[idx * 4 + 1];
            let (hw, hh) = self
                .node_half_dims
                .get(idx)
                .copied()
                .unwrap_or((DEFAULT_HALF_EXTENT, DEFAULT_HALF_EXTENT));
            if (world_x - cx).abs() <= hw && (world_y - cy).abs() <= hh {
                return Some(idx);
            }
        }
        None
    }

    /// Map a theme edge style string to the `v_dash` mode integer consumed by
    /// `edge.frag`: 0=solid, 1=dashed, 2=short-dashed, 3=dotted.
    fn edge_dash_mode(style: &str) -> f32 {
        match style {
            "dashed" => 1.0,
            "short-dashed" => 2.0,
            "dotted" => 3.0,
            _ => 0.0,
        }
    }

    pub(super) fn rebuild_buffers(&mut self) {
        self.rebuild_node_buffer();
        self.rebuild_edge_and_arrow_buffers();
        // Hulls and text are wired up but not populated yet — upload empties
        // so stale state from a prior frame doesn't leak.
        let gl = &self.ctx.gl;
        self.hull_renderer.upload(gl, &[], 0);
        self.text_renderer.upload(gl, &[], 0);
    }

    fn rebuild_node_buffer(&mut self) {
        let node_count = self.positions.len() / 4;
        let now_ms = Self::current_time_ms();
        let mut node_data = Vec::with_capacity(node_count * NODE_INSTANCE_FLOATS);

        for i in 0..node_count {
            let cx = self.positions[i * 4];
            let cy = self.positions[i * 4 + 1];
            let type_idx = self.positions[i * 4 + 3] as usize;
            let is_dimmed = self.visual_flags.get(i).copied().unwrap_or(0) == 1;

            let (node_type, status) = self
                .node_ids
                .get(i)
                .and_then(|id| self.node_metadata.get(id))
                .map(|m| (m.node_type.as_str(), m.status.as_str()))
                .unwrap_or_else(|| (fallback_type_name(type_idx), "healthy"));

            let style = self.resolved_node_style(node_type, status);
            let pulse_mult = self.pulse.border_multiplier(i, now_ms);
            let is_hovered = self.hovered_idx == Some(i);
            let is_selected = self.selected_idx == Some(i);

            let params = NodeWriteParams {
                base_style: &style,
                pulse_mult,
                is_hovered,
                is_selected,
                is_dimmed,
                any_hover: self.hovered_idx.is_some(),
                theme_select_border: &self.theme.interaction.select.border_color,
            };
            write_node_instance(&mut node_data, cx, cy, &params);
        }
        self.node_renderer
            .upload(&self.ctx.gl, &node_data, node_count);
    }

    fn rebuild_edge_and_arrow_buffers(&mut self) {
        use crate::bezier::{DEFAULT_BEND_RATIO, DEFAULT_SEGMENTS, tessellate_quadratic};

        let logical_edge_count = self.edge_count;
        let mut edge_buf =
            Vec::with_capacity(logical_edge_count * DEFAULT_SEGMENTS * EDGE_INSTANCE_FLOATS);
        let mut arrow_instances: Vec<f32> =
            Vec::with_capacity(logical_edge_count * ARROW_INSTANCE_FLOATS);

        let spotlight_idx = self.selected_idx;
        let spotlight_dim_opacity = self
            .theme
            .interaction
            .spotlight
            .dim_opacity
            .clamp(0.02, 1.0);
        // Build coord->idx map for edge focus checks using the spotlight helper.
        // Only pay the allocation cost when a node is actually focused.
        let coord_to_idx = if spotlight_idx.is_some() {
            crate::spotlight::build_coord_index(&self.positions)
        } else {
            std::collections::HashMap::new()
        };
        let edge_stride = 6;
        for i in 0..logical_edge_count {
            let base = i * edge_stride;
            if base + 5 >= self.edge_data.len() {
                break;
            }
            let sx = self.edge_data[base];
            let sy = self.edge_data[base + 1];
            let tx = self.edge_data[base + 2];
            let ty = self.edge_data[base + 3];
            let type_idx = self.edge_data[base + 4] as usize;
            let _weight = self.edge_data[base + 5];

            let style = self.resolve_edge_style(type_idx);
            let painted = paint_edge_for_focus(
                &style,
                spotlight_idx,
                &coord_to_idx,
                (sx, sy),
                (tx, ty),
                &self.theme.interaction.select.border_color,
                spotlight_dim_opacity,
            );

            let segs =
                tessellate_quadratic((sx, sy), (tx, ty), DEFAULT_BEND_RATIO, DEFAULT_SEGMENTS);
            for s in &segs {
                edge_buf.extend_from_slice(&[
                    s.from.0,
                    s.from.1,
                    s.to.0,
                    s.to.1,
                    painted.width,
                    painted.color[0],
                    painted.color[1],
                    painted.color[2],
                    painted.color[3],
                    style.dash,
                    style.animate,
                ]);
            }

            // T11: one arrow per logical edge (placed at full edge endpoints, not per segment).
            arrow_instances.extend_from_slice(&[
                sx,
                sy,
                tx,
                ty,
                ARROW_WORLD_SIZE,
                painted.color[0],
                painted.color[1],
                painted.color[2],
                painted.color[3],
            ]);
        }
        let gpu_edge_count = logical_edge_count * DEFAULT_SEGMENTS;
        let arrow_count = arrow_instances.len() / ARROW_INSTANCE_FLOATS;
        self.edge_renderer
            .upload(&self.ctx.gl, &edge_buf, gpu_edge_count);
        self.arrow_renderer
            .upload(&self.ctx.gl, &arrow_instances, arrow_count);
    }

    fn resolve_edge_style(&self, type_idx: usize) -> EdgeStyle {
        let type_name = self
            .edge_type_keys
            .get(type_idx)
            .map(String::as_str)
            .unwrap_or("depends");

        let mut color_hex = self.theme.edges.default.color.clone();
        let mut width = self.theme.edges.default.width;
        let mut dash = 0.0_f32;
        let mut animate = 0.0_f32;
        if let Some(ov) = self.theme.edges.by_type.get(type_name) {
            if let Some(ref c) = ov.color {
                color_hex = c.clone();
            }
            if let Some(ref w) = ov.width {
                width = *w;
            }
            if let Some(ref s) = ov.style {
                dash = Self::edge_dash_mode(s);
            }
            if ov.animate {
                animate = 1.0;
            }
        }
        EdgeStyle {
            color_hex,
            width,
            dash,
            animate,
        }
    }
}

struct EdgeStyle {
    color_hex: String,
    width: f32,
    dash: f32,
    animate: f32,
}

struct PaintedEdge {
    color: [f32; 4],
    width: f32,
}

fn paint_edge_for_focus(
    style: &EdgeStyle,
    spotlight_idx: Option<usize>,
    coord_to_idx: &std::collections::HashMap<(u32, u32), usize>,
    src: (f32, f32),
    tgt: (f32, f32),
    theme_select_border: &str,
    spotlight_dim_opacity: f32,
) -> PaintedEdge {
    let Some(focus_idx) = spotlight_idx else {
        return PaintedEdge {
            color: parse_color_tuple(&style.color_hex),
            width: style.width,
        };
    };

    let s_idx = coord_to_idx
        .get(&(src.0.to_bits(), src.1.to_bits()))
        .copied();
    let t_idx = coord_to_idx
        .get(&(tgt.0.to_bits(), tgt.1.to_bits()))
        .copied();
    let is_focus_edge = s_idx == Some(focus_idx) || t_idx == Some(focus_idx);

    if is_focus_edge {
        // §6 visual rule: focus edges get width *= 2.2 and use the theme's
        // selection color at near-full alpha — this is what makes the radial
        // fan of highlights read clearly.
        let (r, g, b, a) = parse_css_color(theme_select_border);
        PaintedEdge {
            // Force high alpha so the selection tint isn't scaled down by the
            // per-type color's translucency.
            color: [r, g, b, a.max(FOCUS_EDGE_ALPHA)],
            width: style.width * FOCUS_EDGE_WIDTH_SCALE,
        }
    } else {
        let mut color = parse_color_tuple(&style.color_hex);
        color[3] = (color[3] * spotlight_dim_opacity).clamp(0.0, 1.0);
        PaintedEdge {
            color,
            width: (style.width * DIM_EDGE_WIDTH_SCALE).max(0.5),
        }
    }
}

struct NodeWriteParams<'a> {
    base_style: &'a ResolvedNodeStyle,
    pulse_mult: f32,
    is_hovered: bool,
    is_selected: bool,
    is_dimmed: bool,
    any_hover: bool,
    theme_select_border: &'a str,
}

fn write_node_instance(buf: &mut Vec<f32>, cx: f32, cy: f32, p: &NodeWriteParams) {
    let mut flags = p.base_style.flags;
    let mut border_color = p.base_style.border_color;
    let mut fill_color = p.base_style.color;
    let mut border_width = p.base_style.border_width * p.pulse_mult;
    let mut half_w = p.base_style.half_w;
    let mut half_h = p.base_style.half_h;

    if p.is_hovered {
        flags |= FLAG_HOVERED;
    }

    if p.is_selected {
        let sel = parse_color_tuple(p.theme_select_border);
        border_color = sel;
        // Fill at 78% of the selection color's alpha so the label (dark brown
        // in dark-theme) still reads against it.
        fill_color = [
            sel[0],
            sel[1],
            sel[2],
            (sel[3] * SELECTED_FILL_ALPHA_SCALE).clamp(0.0, 1.0),
        ];
        border_width += SELECTED_BORDER_WIDTH_ADD;
        half_w *= SELECTED_SIZE_SCALE;
        half_h *= SELECTED_SIZE_SCALE;
        flags |= FLAG_SELECTED;
    }

    if p.is_dimmed || (p.any_hover && !p.is_hovered && !p.is_selected) {
        flags |= FLAG_DIMMED;
    }

    buf.extend_from_slice(&[
        cx,
        cy,
        half_w,
        half_h,
        fill_color[0],
        fill_color[1],
        fill_color[2],
        fill_color[3],
        border_color[0],
        border_color[1],
        border_color[2],
        border_color[3],
        border_width,
        p.base_style.shape,
        flags as f32,
    ]);
}

fn parse_color_tuple(hex: &str) -> [f32; 4] {
    let (r, g, b, a) = parse_css_color(hex);
    [r, g, b, a]
}

fn fallback_type_name(type_idx: usize) -> &'static str {
    // Legacy fallback when node_metadata is missing — the position buffer
    // carries a type index that we decode into the hardcoded domain-specific
    // names used by the ~0.1 showcase. Modern callers provide metadata via
    // `set_node_metadata`, which bypasses this path entirely.
    match type_idx {
        1 => "database",
        2 => "cache",
        3 => "external",
        4 => "policy",
        5 => "adr",
        6 => "incident",
        _ => "service",
    }
}
