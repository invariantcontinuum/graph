//! Short-range hard-bump overlap resolution on a bucket grid.
//!
//! The Barnes-Hut repulsion + damped integrator produces globally
//! minimum-energy layouts but can still rest with two nodes slightly
//! overlapping. A one-pass bucket sweep with 3×3 neighborhood checks
//! nudges overlapping pairs apart without running a full O(n²) scan.

use super::config::MIN_NODE_GAP;
use std::collections::HashMap;

pub(super) fn resolve_overlaps(positions: &mut [(f32, f32)]) {
    let n = positions.len();
    if n == 0 {
        return;
    }
    let buckets = bucket_positions(positions);
    apply_pushes(positions, &buckets);
}

fn bucket_positions(positions: &[(f32, f32)]) -> HashMap<(i32, i32), Vec<usize>> {
    let mut buckets: HashMap<(i32, i32), Vec<usize>> = HashMap::new();
    for (i, &(x, y)) in positions.iter().enumerate() {
        buckets.entry(bucket_key(x, y)).or_default().push(i);
    }
    buckets
}

fn bucket_key(x: f32, y: f32) -> (i32, i32) {
    (
        (x / MIN_NODE_GAP).floor() as i32,
        (y / MIN_NODE_GAP).floor() as i32,
    )
}

fn apply_pushes(positions: &mut [(f32, f32)], buckets: &HashMap<(i32, i32), Vec<usize>>) {
    let gap_sq = MIN_NODE_GAP * MIN_NODE_GAP;
    for i in 0..positions.len() {
        let (x, y) = positions[i];
        let key = bucket_key(x, y);
        let (push_dx, push_dy) = compute_push(i, x, y, key, positions, buckets, gap_sq);
        if push_dx != 0.0 || push_dy != 0.0 {
            positions[i].0 += push_dx;
            positions[i].1 += push_dy;
        }
    }
}

fn compute_push(
    self_idx: usize,
    x: f32,
    y: f32,
    key: (i32, i32),
    positions: &[(f32, f32)],
    buckets: &HashMap<(i32, i32), Vec<usize>>,
    gap_sq: f32,
) -> (f32, f32) {
    let mut push_dx = 0.0_f32;
    let mut push_dy = 0.0_f32;
    for dx in -1..=1 {
        for dy in -1..=1 {
            let Some(bucket) = buckets.get(&(key.0 + dx, key.1 + dy)) else {
                continue;
            };
            for &other_idx in bucket {
                if other_idx == self_idx {
                    continue;
                }
                let (push_x, push_y) =
                    pair_push(x, y, positions[other_idx].0, positions[other_idx].1, gap_sq);
                push_dx += push_x;
                push_dy += push_y;
            }
        }
    }
    (push_dx, push_dy)
}

fn pair_push(x: f32, y: f32, ox: f32, oy: f32, gap_sq: f32) -> (f32, f32) {
    let ddx = x - ox;
    let ddy = y - oy;
    let d_sq = ddx * ddx + ddy * ddy;
    if d_sq >= gap_sq || d_sq <= 0.0001 {
        return (0.0, 0.0);
    }
    let d = d_sq.sqrt();
    let push = (MIN_NODE_GAP - d) * 0.5;
    (ddx / d * push, ddy / d * push)
}
