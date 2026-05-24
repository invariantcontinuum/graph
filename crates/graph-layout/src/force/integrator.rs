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
) -> f32 {
    let n = positions.len() / 2;
    if n == 0 {
        return 0.0;
    }

    let saved = snapshot_pinned(positions, pinned);

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

    restore_pinned(positions, &saved);

    max_vel_sq
}

fn snapshot_pinned(
    positions: &[f32],
    pinned: &std::collections::HashSet<usize>,
) -> Vec<(usize, f32, f32)> {
    let mut res = Vec::with_capacity(pinned.len());
    for &idx in pinned {
        let i = idx * 2;
        if i + 1 < positions.len() {
            res.push((idx, positions[i], positions[i + 1]));
        }
    }
    res
}

fn restore_pinned(positions: &mut [f32], saved: &[(usize, f32, f32)]) {
    for &(idx, x, y) in saved {
        let i = idx * 2;
        if i + 1 < positions.len() {
            positions[i] = x;
            positions[i + 1] = y;
        }
    }
}

fn apply_attractive_edges(positions: &[f32], edges: &[(usize, usize)], forces: &mut [(f32, f32)]) {
    let n = positions.len() / 2;
    for &(src, tgt) in edges {
        if src >= n || tgt >= n {
            continue;
        }
        let src_pos = &positions[src * 2..src * 2 + 2];
        let tgt_pos = &positions[tgt * 2..tgt * 2 + 2];
        let dx = tgt_pos[0] - src_pos[0];
        let dy = tgt_pos[1] - src_pos[1];
        // Mathematically simplify distance calculations (fx = ATTRACTION * dx)
        // to completely bypass expensive .sqrt() and floating-point division operations
        let fx = ATTRACTION * dx;
        let fy = ATTRACTION * dy;
        let src_force = &mut forces[src];
        src_force.0 += fx;
        src_force.1 += fy;
        let tgt_force = &mut forces[tgt];
        tgt_force.0 -= fx;
        tgt_force.1 -= fy;
    }
}

fn integrate_positions(
    positions: &mut [f32],
    velocities: &mut [(f32, f32)],
    forces: &[(f32, f32)],
) -> f32 {
    if velocities.len() * 2 < positions.len() {
        return 0.0;
    }
    let mut max_velocity_sq = 0.0_f32;
    // ⚡ Bolt: Simple index-based loop prevents iterator chaining overhead
    // and allows LLVM to vectorize position integration.
    let n = velocities.len();
    // Pre-assert lengths to allow LLVM to elide bounds checks in the loop
    assert!(positions.len() >= n * 2);
    assert!(forces.len() >= n);
    for i in 0..n {
        let vel = &mut velocities[i];
        let (fx, fy) = forces[i];
        vel.0 = (vel.0 + fx) * DAMPING;
        vel.1 = (vel.1 + fy) * DAMPING;

        let v_sq = vel.0 * vel.0 + vel.1 * vel.1;
        if v_sq > max_velocity_sq {
            max_velocity_sq = v_sq;
        }

        positions[i * 2] += vel.0;
        positions[i * 2 + 1] += vel.1;
    }
    max_velocity_sq
}
