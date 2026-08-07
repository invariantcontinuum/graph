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
const EDGE_NODE_GAP: f32 = 3.0;

impl RenderEngine {
    /// Resolve effective per-node style from theme: default + type override + status override.
    pub(super) fn resolved_node_style(&self, node_type: &str, status: &str) -> ResolvedNodeStyle {
        let default = &self.theme.nodes.default;
        let type_override = self.theme.nodes.by_type.get(node_type);
        let status_override = self.theme.nodes.by_status.get(status);

        let shape_name = type_override
            .and_then(|o| o.shape.as_deref())
            .unwrap_or(default.shape.as_str());
        let shape = shape_index(shape_name);

        let half_w = type_override
            .and_then(|o| o.half_width)
            .or(default.half_width)
            .unwrap_or(default.size);
        let half_h = type_override
            .and_then(|o| o.half_height)
            .or(default.half_height)
            .unwrap_or(default.size);

        let color_hex = type_override
            .and_then(|o| o.color.as_deref())
            .unwrap_or(default.color.as_str());
        let color = parse_color_tuple(color_hex);

        let border_color_hex = status_override
            .and_then(|o| o.border_color.as_deref())
            .or_else(|| type_override.and_then(|o| o.border_color.as_deref()))
            .unwrap_or(default.border_color.as_str());
        let border_color = parse_color_tuple(border_color_hex);

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
        self.pulse.pulse_indices.clear();
        for (i, id) in self.node_ids.iter().enumerate() {
            let status = self
                .node_metadata
                .get(id)
                .map(|m| m.status.as_str())
                .unwrap_or("healthy");

            if self
                .theme
                .nodes
                .by_status
                .get(status)
                .is_some_and(|s| s.pulse)
            {
                self.pulse.pulse_indices.push(i);
            }
        }
        self.pulse.pulse_indices.sort_unstable();
        self.pulse.pulse_indices.dedup();
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
        let select_border_color = parse_color_tuple(&self.theme.interaction.select.border_color);
        let coord_to_idx = crate::spotlight::build_coord_index(&self.positions);
        let mut sibling_counts: std::collections::HashMap<(usize, usize), usize> =
            std::collections::HashMap::new();
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
            let src_center = (sx, sy);
            let tgt_center = (tx, ty);
            let s_idx = coord_to_idx.get(&(sx.to_bits(), sy.to_bits())).copied();
            let t_idx = coord_to_idx.get(&(tx.to_bits(), ty.to_bits())).copied();
            let draw_src = s_idx
                .and_then(|idx| self.node_half_dims.get(idx).copied())
                .map(|dims| clip_rect_endpoint(src_center, tgt_center, dims))
                .unwrap_or(src_center);
            let draw_tgt = t_idx
                .and_then(|idx| self.node_half_dims.get(idx).copied())
                .map(|dims| clip_rect_endpoint(tgt_center, src_center, dims))
                .unwrap_or(tgt_center);

            let style = self.resolve_edge_style(type_idx);
            let base_edge_color = parse_color_tuple(style.color_hex);
            let (from_color, to_color) =
                self.gradient_endpoint_colors(s_idx, t_idx, base_edge_color);
            let focus = edge_focus_state(spotlight_idx, s_idx, t_idx);
            // §6 visual rule: focus edges get width *= 2.2 and use the theme's
            // selection color at near-full alpha — this is what makes the radial
            // fan of highlights read clearly. Dimmed edges shrink and fade.
            let width = match focus {
                EdgeFocus::None => style.width,
                EdgeFocus::Focused => style.width * FOCUS_EDGE_WIDTH_SCALE,
                EdgeFocus::Dimmed => (style.width * DIM_EDGE_WIDTH_SCALE).max(0.5),
            };

            let sibling_index = match (s_idx, t_idx) {
                (Some(a), Some(b)) => {
                    let n = sibling_counts.entry((a, b)).or_insert(0);
                    let idx = *n;
                    *n += 1;
                    idx
                }
                _ => 0,
            };
            let bend = crate::bezier::sibling_bend(DEFAULT_BEND_RATIO, sibling_index);

            let segs = tessellate_quadratic(draw_src, draw_tgt, bend, DEFAULT_SEGMENTS);
            let total_arc = segs
                .last()
                .map(|s| s.arc_start + segment_length(s))
                .unwrap_or(1.0)
                .max(1e-6);
            // Capture the last segment's fully-painted color so the arrow
            // instance below can reuse it.
            let mut last_segment_color = base_edge_color;
            for s in &segs {
                let t = ((s.arc_start + segment_length(s) * 0.5) / total_arc).clamp(0.0, 1.0);
                let mut color = lerp_color(from_color, to_color, t);
                color[3] = mid_curve_alpha(color[3], t);
                match focus {
                    EdgeFocus::None => {}
                    EdgeFocus::Focused => {
                        // Force high alpha so the selection tint isn't scaled
                        // down by the per-type color's translucency.
                        color = [
                            select_border_color[0],
                            select_border_color[1],
                            select_border_color[2],
                            select_border_color[3].max(FOCUS_EDGE_ALPHA),
                        ];
                    }
                    EdgeFocus::Dimmed => {
                        color[3] = (color[3] * spotlight_dim_opacity).clamp(0.0, 1.0);
                    }
                }
                last_segment_color = color;
                edge_buf.extend_from_slice(&[
                    s.from.0,
                    s.from.1,
                    s.to.0,
                    s.to.1,
                    width,
                    color[0],
                    color[1],
                    color[2],
                    color[3],
                    style.dash,
                    style.animate,
                ]);
            }

            // Arrows align with the curve tangent at the target, not the
            // straight chord: place the instance's "from" on the curve at
            // t = 0.97 so arrow.vert's dir = to - from matches the tangent.
            let ctrl = crate::bezier::quadratic_control_point(draw_src, draw_tgt, bend);
            let near_tip = crate::bezier::quadratic_point(draw_src, ctrl, draw_tgt, 0.97);
            arrow_instances.extend_from_slice(&[
                near_tip.0,
                near_tip.1,
                draw_tgt.0,
                draw_tgt.1,
                ARROW_WORLD_SIZE,
                last_segment_color[0], // reuse the same focus-resolved color as the edge's final segment
                last_segment_color[1],
                last_segment_color[2],
                last_segment_color[3],
            ]);
        }
        let gpu_edge_count = logical_edge_count * DEFAULT_SEGMENTS;
        let arrow_count = arrow_instances.len() / ARROW_INSTANCE_FLOATS;
        self.edge_renderer
            .upload(&self.ctx.gl, &edge_buf, gpu_edge_count);
        self.arrow_renderer
            .upload(&self.ctx.gl, &arrow_instances, arrow_count);
    }

    fn resolve_edge_style(&self, type_idx: usize) -> EdgeStyle<'_> {
        let type_name = self
            .edge_type_keys
            .get(type_idx)
            .map(String::as_str)
            .unwrap_or("depends");

        let mut color_hex = self.theme.edges.default.color.as_str();
        let mut width = self.theme.edges.default.width;
        let mut dash = 0.0_f32;
        let mut animate = 0.0_f32;
        if let Some(ov) = self.theme.edges.by_type.get(type_name) {
            if let Some(ref c) = ov.color {
                color_hex = c.as_str();
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

    /// Endpoint accent colors for the per-segment gradient: each endpoint takes
    /// its node's resolved `border_color` (the node's accent). Falls back to
    /// the base edge color when the endpoint index, node id, or metadata is
    /// missing.
    fn gradient_endpoint_colors(
        &self,
        s_idx: Option<usize>,
        t_idx: Option<usize>,
        fallback: [f32; 4],
    ) -> ([f32; 4], [f32; 4]) {
        let endpoint_color = |idx: Option<usize>| {
            idx.and_then(|i| self.node_ids.get(i))
                .and_then(|id| self.node_metadata.get(id))
                .map(|m| {
                    self.resolved_node_style(&m.node_type, &m.status)
                        .border_color
                })
                .unwrap_or(fallback)
        };
        (endpoint_color(s_idx), endpoint_color(t_idx))
    }
}

fn clip_rect_endpoint(center: (f32, f32), toward: (f32, f32), half_dims: (f32, f32)) -> (f32, f32) {
    let dx = toward.0 - center.0;
    let dy = toward.1 - center.1;
    if dx.abs() < f32::EPSILON && dy.abs() < f32::EPSILON {
        return center;
    }

    let mut half_w = half_dims.0 + EDGE_NODE_GAP;
    if half_w < 1.0 {
        half_w = 1.0;
    }
    let mut half_h = half_dims.1 + EDGE_NODE_GAP;
    if half_h < 1.0 {
        half_h = 1.0;
    }
    let scale_w = dx.abs() / half_w;
    let scale_h = dy.abs() / half_h;
    let mut scale = if scale_w > scale_h { scale_w } else { scale_h };
    if scale < 1.0e-6 {
        scale = 1.0e-6;
    }
    (center.0 + dx / scale, center.1 + dy / scale)
}

struct EdgeStyle<'a> {
    color_hex: &'a str,
    width: f32,
    dash: f32,
    animate: f32,
}

fn lerp_color(a: [f32; 4], b: [f32; 4], t: f32) -> [f32; 4] {
    [
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t,
        a[3] + (b[3] - a[3]) * t,
    ]
}

/// Direction-without-motion cue: alpha dips to 75% mid-curve and recovers at
/// the endpoints.
fn mid_curve_alpha(alpha: f32, t: f32) -> f32 {
    alpha * (0.75 + 0.25 * (2.0 * t - 1.0).abs())
}

fn segment_length(s: &crate::bezier::Segment) -> f32 {
    let dx = s.to.0 - s.from.0;
    let dy = s.to.1 - s.from.1;
    (dx * dx + dy * dy).sqrt()
}

/// Focus state of one edge under the spotlight selection. This carries the
/// exact rules the old `paint_edge_for_focus` applied in one shot; the
/// gradient is now computed per segment and these transforms layer on top.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum EdgeFocus {
    None,
    Focused,
    Dimmed,
}

fn edge_focus_state(
    spotlight_idx: Option<usize>,
    s_idx: Option<usize>,
    t_idx: Option<usize>,
) -> EdgeFocus {
    match spotlight_idx {
        None => EdgeFocus::None,
        Some(focus_idx) if s_idx == Some(focus_idx) || t_idx == Some(focus_idx) => {
            EdgeFocus::Focused
        }
        Some(_) => EdgeFocus::Dimmed,
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

#[cfg(test)]
mod tests {
    use super::clip_rect_endpoint;
    use super::{lerp_color, mid_curve_alpha};

    #[test]
    fn lerp_endpoints() {
        let a = [1.0, 0.0, 0.0, 1.0];
        let b = [0.0, 0.0, 1.0, 0.5];
        assert_eq!(lerp_color(a, b, 0.0), a);
        assert_eq!(lerp_color(a, b, 1.0), b);
        let m = lerp_color(a, b, 0.5);
        assert!((m[0] - 0.5).abs() < 1e-6 && (m[2] - 0.5).abs() < 1e-6);
        assert!((m[3] - 0.75).abs() < 1e-6);
    }

    #[test]
    fn mid_curve_alpha_dips_and_recovers() {
        let edge = mid_curve_alpha(1.0, 0.0);
        let mid = mid_curve_alpha(1.0, 0.5);
        let end = mid_curve_alpha(1.0, 1.0);
        assert!(mid < edge && mid >= 0.7);
        assert!((edge - end).abs() < 1e-6);
    }

    #[test]
    fn clips_edge_endpoint_to_card_boundary() {
        let clipped = clip_rect_endpoint((0.0, 0.0), (200.0, 0.0), (68.0, 24.0));

        assert!((clipped.0 - 71.0).abs() < 0.001, "x={}", clipped.0);
        assert!(clipped.1.abs() < 0.001, "y={}", clipped.1);
    }

    #[test]
    fn clips_diagonal_endpoint_to_first_rect_side_hit() {
        let clipped = clip_rect_endpoint((0.0, 0.0), (200.0, 100.0), (68.0, 24.0));

        assert!((clipped.0 - 54.0).abs() < 0.001, "x={}", clipped.0);
        assert!((clipped.1 - 27.0).abs() < 0.001, "y={}", clipped.1);
    }
}
