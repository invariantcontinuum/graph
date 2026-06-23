//! Force integration — builds the quadtree, adds attractive edges, integrates
//! velocities, and returns peak kinetic energy for convergence checks.
//!
//! Callers supply positions as a flat buffer `[x0, y0, x1, y1, ...]` and
//! edges as `(src_idx, tgt_idx)` pairs. This keeps the integrator agnostic
//! to whether callers track node IDs as strings or indices.

use super::barnes_hut::{bounding_box, build_tree};
use super::config::{ATTRACTION, DAMPING, TREE_BOUNDS_PAD};

/// Run one force-integration step. Returns the peak velocity² observed — the
/// caller compares against its own threshold to decide whether to stop.
///
/// `velocities` must already be sized to `positions.len() / 2`; pass an
/// empty `pinned` set if every node is free.
pub(super) fn integrate_step(
    positions: &mut [f32],
    edges: &[(usize, usize)],
    velocities: &mut [(f32, f32)],
    forces: &mut [(f32, f32)],
    pinned: &std::collections::HashSet<usize>,
    saved_pinned: &mut Vec<(usize, f32, f32)>,
) -> f32 {
    let n = positions.len() / 2;
    if n == 0 {
        return 0.0;
    }

    snapshot_pinned(positions, pinned, saved_pinned);

    let bounds = bounding_box(positions, TREE_BOUNDS_PAD);
    let root = build_tree(positions, bounds);

    // Pre-allocate a single stack vector for the Barnes-Hut quadtree traversal.
    // Reusing this across all node queries eliminates O(n) heap allocations per step,
    // significantly improving layout speed.
    let mut stack = Vec::with_capacity(128);
    for i in 0..n {
        forces[i] = root.compute_force(positions[i * 2], positions[i * 2 + 1], &mut stack);
    }

    apply_attractive_edges(positions, edges, forces);

    let max_vel_sq = integrate_positions(positions, velocities, forces);

    restore_pinned(positions, saved_pinned);

    max_vel_sq
}

fn snapshot_pinned(
    positions: &[f32],
    pinned: &std::collections::HashSet<usize>,
    saved_pinned: &mut Vec<(usize, f32, f32)>,
) {
    saved_pinned.clear();
    for &idx in pinned {
        let i = idx * 2;
        if i + 1 < positions.len() {
            saved_pinned.push((idx, positions[i], positions[i + 1]));
        }
    }
}

fn restore_pinned(positions: &mut [f32], saved_pinned: &[(usize, f32, f32)]) {
    for &(idx, x, y) in saved_pinned {
        let i = idx * 2;
        if i + 1 < positions.len() {
            positions[i] = x;
            positions[i + 1] = y;
        }
    }
}

fn apply_attractive_edges(positions: &[f32], edges: &[(usize, usize)], forces: &mut [(f32, f32)]) {
    let n = positions.len() / 2;
    // SAFETY: We verify that the forces buffer is large enough before bypassing bounds
    // checks inside the loop to avoid undefined behavior.
    assert!(
        forces.len() >= n,
        "forces buffer must be at least as large as positions / 2"
    );
    for &(src, tgt) in edges {
        if src >= n || tgt >= n {
            continue;
        }
        let src_idx = src * 2;
        let tgt_idx = tgt * 2;
        let sx = unsafe { *positions.get_unchecked(src_idx) };
        let sy = unsafe { *positions.get_unchecked(src_idx + 1) };
        let tx = unsafe { *positions.get_unchecked(tgt_idx) };
        let ty = unsafe { *positions.get_unchecked(tgt_idx + 1) };
        let dx = tx - sx;
        let dy = ty - sy;

        // Mathematically simplify distance calculations (fx = ATTRACTION * dx)
        // to completely bypass expensive .sqrt() and floating-point division operations
        let fx = ATTRACTION * dx;
        let fy = ATTRACTION * dy;
        let src_force = unsafe { forces.get_unchecked_mut(src) };
        src_force.0 += fx;
        src_force.1 += fy;
        let tgt_force = unsafe { forces.get_unchecked_mut(tgt) };
        tgt_force.0 -= fx;
        tgt_force.1 -= fy;
    }
}

fn integrate_positions(
    positions: &mut [f32],
    velocities: &mut [(f32, f32)],
    forces: &[(f32, f32)],
) -> f32 {
    let n = positions.len() / 2;
    if velocities.len() < n || forces.len() < n {
        return 0.0;
    }
    let mut max_velocity_sq = 0.0_f32;
    // ⚡ Bolt: Using chunked iteration avoids index-based bounds checks,
    // but chaining multiple .zip() iterators adds overhead. By tracking
    // an explicit counter, we can iterate over positions, while using un-checked
    // access into forces and velocities vectors which we know have enough capacity,
    // thereby improving the speed of this hot mathematical integration loop.
    for (i, pos) in positions.chunks_exact_mut(2).enumerate() {
        // SAFETY: We verify that both velocities and forces have sufficient length
        // (>= positions.len() / 2) at the top of the function to ensure this is safe.
        let vel = unsafe { velocities.get_unchecked_mut(i) };
        let &(fx, fy) = unsafe { forces.get_unchecked(i) };

        vel.0 = (vel.0 + fx) * DAMPING;
        vel.1 = (vel.1 + fy) * DAMPING;

        let v_sq = vel.0 * vel.0 + vel.1 * vel.1;
        max_velocity_sq = max_velocity_sq.max(v_sq);

        pos[0] += vel.0;
        pos[1] += vel.1;
    }
    max_velocity_sq
}
