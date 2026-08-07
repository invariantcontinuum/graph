//! Quadratic bezier tessellation. Every logical edge becomes N short line
//! segments with cumulative arc length stamped on each segment — the
//! existing edge renderer accepts them unchanged and (future) dash shader
//! will read the arc length to keep patterns continuous across segments.

// Edge tessellation. Six segments with a stronger bend: parallel edges now fan
// out into distinct curves via per-sibling bend ratios (see sibling_bend), so
// each edge needs enough segments to keep its curve smooth and enough bend to
// separate from the chord. Mid-curve alpha is lowered in the theme, which
// bounds the alpha-overdraw the extra segments add where edges cross.
pub const DEFAULT_SEGMENTS: usize = 6;
pub const DEFAULT_BEND_RATIO: f32 = 0.10;

/// Bend ratio for the `sibling_index`-th edge among parallel edges sharing
/// the same ordered endpoint pair. Index 0 keeps the base bend; subsequent
/// siblings alternate sides with growing magnitude so parallel edges fan out
/// instead of stacking.
pub fn sibling_bend(base: f32, sibling_index: usize) -> f32 {
    if sibling_index == 0 {
        return base;
    }
    let magnitude = base * (1.0 + (sibling_index as f32 + 1.0) / 2.0);
    if sibling_index % 2 == 1 {
        -magnitude
    } else {
        magnitude
    }
}

/// Control point of the quadratic bezier: chord midpoint offset perpendicular
/// by `chord_length * bend_ratio`.
pub fn quadratic_control_point(p0: (f32, f32), p1: (f32, f32), bend_ratio: f32) -> (f32, f32) {
    let dx = p1.0 - p0.0;
    let dy = p1.1 - p0.1;
    let chord_len = (dx * dx + dy * dy).sqrt().max(1e-5);
    let nx = -dy / chord_len;
    let ny = dx / chord_len;
    let off = chord_len * bend_ratio;
    (
        (p0.0 + p1.0) * 0.5 + nx * off,
        (p0.1 + p1.1) * 0.5 + ny * off,
    )
}

/// Point on the quadratic bezier at parameter `t ∈ [0,1]`.
pub fn quadratic_point(p0: (f32, f32), c: (f32, f32), p1: (f32, f32), t: f32) -> (f32, f32) {
    let u = 1.0 - t;
    (
        p0.0 * u * u + c.0 * 2.0 * u * t + p1.0 * t * t,
        p0.1 * u * u + c.1 * 2.0 * u * t + p1.1 * t * t,
    )
}

#[derive(Debug, Clone, Copy)]
pub struct Segment {
    pub from: (f32, f32),
    pub to: (f32, f32),
    pub arc_start: f32,
}

/// Tessellate a quadratic bezier from `p0` to `p1`, control point offset
/// perpendicular to the chord by `chord_length * bend_ratio`. Returns exactly
/// `segments.clamp(2, 16)` segments; first `from == p0`, last `to == p1`.
pub fn tessellate_quadratic(
    p0: (f32, f32),
    p1: (f32, f32),
    bend_ratio: f32,
    segments: usize,
) -> Vec<Segment> {
    let n = segments.clamp(2, 16);
    let c = quadratic_control_point(p0, p1, bend_ratio);

    let mut out = Vec::with_capacity(n);
    let mut prev = p0;
    let mut arc = 0.0f32;
    for i in 1..=n {
        let t = i as f32 / n as f32;
        let b = quadratic_point(p0, c, p1, t);
        let seg = Segment {
            from: prev,
            to: b,
            arc_start: arc,
        };
        let sx = b.0 - prev.0;
        let sy = b.1 - prev.1;
        arc += (sx * sx + sy * sy).sqrt();
        out.push(seg);
        prev = b;
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    const EPS: f32 = 1e-4;

    #[test]
    fn tessellate_endpoints_match_input() {
        let segs = tessellate_quadratic((0.0, 0.0), (100.0, 0.0), 0.08, 8);
        assert_eq!(segs.len(), 8);
        assert!((segs[0].from.0 - 0.0).abs() < EPS);
        assert!((segs[0].from.1 - 0.0).abs() < EPS);
        assert!((segs[7].to.0 - 100.0).abs() < EPS);
    }

    #[test]
    fn segment_count_clamped() {
        assert_eq!(tessellate_quadratic((0., 0.), (1., 0.), 0., 1).len(), 2);
        assert_eq!(tessellate_quadratic((0., 0.), (1., 0.), 0., 99).len(), 16);
    }

    #[test]
    fn arc_start_is_monotonic() {
        let segs = tessellate_quadratic((0.0, 0.0), (100.0, 20.0), 0.08, 8);
        for i in 1..segs.len() {
            assert!(segs[i].arc_start >= segs[i - 1].arc_start);
        }
    }

    #[test]
    fn zero_bend_is_straight_chord() {
        let segs = tessellate_quadratic((0.0, 0.0), (80.0, 0.0), 0.0, 8);
        for s in &segs {
            assert!(s.from.1.abs() < EPS);
            assert!(s.to.1.abs() < EPS);
        }
    }

    #[test]
    fn parallel_edges_fan_out_symmetrically() {
        // Three edges between the same endpoints with sibling indices 0,1,2
        // must produce three distinct curves, symmetric around the chord.
        let p0 = (0.0, 0.0);
        let p1 = (100.0, 0.0);
        let bends: Vec<f32> = (0..3).map(|i| sibling_bend(0.10, i)).collect();
        let mids: Vec<(f32, f32)> = bends
            .iter()
            .map(|&b| quadratic_point(p0, quadratic_control_point(p0, p1, b), p1, 0.5))
            .collect();
        // distinct
        assert!((mids[0].1 - mids[1].1).abs() > 1.0);
        assert!((mids[1].1 - mids[2].1).abs() > 1.0);
        // symmetric: first sibling bends one way, second the other
        assert!(mids[0].1.signum() != mids[1].1.signum());
    }

    #[test]
    fn single_edge_keeps_base_bend() {
        assert!((sibling_bend(0.10, 0) - 0.10).abs() < 1e-6);
    }

    #[test]
    fn control_point_is_perpendicular_to_chord() {
        let c = quadratic_control_point((0.0, 0.0), (100.0, 0.0), 0.1);
        assert!(c.0 > 49.0 && c.0 < 51.0);
        assert!((c.1.abs() - 10.0).abs() < 0.01);
    }
}
