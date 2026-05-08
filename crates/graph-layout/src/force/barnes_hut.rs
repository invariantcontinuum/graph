//! Barnes-Hut quadtree for approximate O(n log n) repulsive-force computation.
//!
//! The quadtree recursively divides 2D space into four quadrants, accumulating
//! centers of mass. When computing force on a point we traverse the tree:
//! if a quad is far enough away that its angular width ratio `w/d < THETA`,
//! we approximate it as a single point mass at its center; otherwise we
//! descend. Far-away clusters are therefore folded into a single force term,
//! giving log depth instead of linear traversal per query.

use super::config::{MAX_QUAD_DEPTH, REPULSION, THETA_SQ};

type Bounds = (f32, f32, f32, f32);

pub(super) struct QuadNode {
    cx: f32,
    cy: f32,
    mass: f32,
    bounds: Bounds,
    children: Option<Box<[Option<QuadNode>; 4]>>,
    body: Option<(f32, f32)>,
}

impl QuadNode {
    pub(super) fn new(x_min: f32, y_min: f32, x_max: f32, y_max: f32) -> Self {
        Self {
            cx: 0.0,
            cy: 0.0,
            mass: 0.0,
            bounds: (x_min, y_min, x_max, y_max),
            children: None,
            body: None,
        }
    }

    pub(super) fn insert(&mut self, x: f32, y: f32) {
        self.insert_at_depth(x, y, 0);
    }

    fn insert_at_depth(&mut self, x: f32, y: f32, start_depth: usize) {
        // Iterative insertion using a raw pointer to walk down the tree.
        // SAFETY: we never alias — `current` is the only live mutable ref at
        // each step, and no other code touches the tree during insertion.
        let mut current: *mut QuadNode = self;
        let mut depth = start_depth;

        loop {
            let node = unsafe { &mut *current };

            if node.is_empty() {
                node.place_body(x, y);
                return;
            }

            if depth >= MAX_QUAD_DEPTH {
                node.accumulate_mass(x, y);
                return;
            }

            node.ensure_children();
            node.push_existing_body_down(depth);
            node.accumulate_mass(x, y);

            let q = node.quadrant(x, y);
            // SAFETY: `ensure_children` just wrote Some(children) with all four quadrants populated.
            current = node.children.as_mut().unwrap()[q].as_mut().unwrap() as *mut QuadNode;
            depth += 1;
        }
    }

    /// Computes the repulsive force exerted by this tree on a given point.
    /// To avoid allocating a new `Vec` for the traversal stack on every query,
    /// the caller must provide a mutable buffer, which will be reused across calls.
    pub(super) fn compute_force<'a>(
        &'a self,
        x: f32,
        y: f32,
        stack: &mut Vec<&'a QuadNode>,
    ) -> (f32, f32) {
        let mut fx = 0.0_f32;
        let mut fy = 0.0_f32;
        stack.push(self);

        while let Some(node) = stack.pop() {
            if node.mass == 0.0 {
                continue;
            }
            let dx = node.cx - x;
            let dy = node.cy - y;
            let dist_sq = dx * dx + dy * dy;
            if dist_sq < 0.01 {
                continue;
            }

            if node.can_approximate(dist_sq) {
                let force_over_dist = -REPULSION * node.mass / (dist_sq * dist_sq.sqrt());
                fx += force_over_dist * dx;
                fy += force_over_dist * dy;
                continue;
            }

            if let Some(ref children) = node.children {
                let c = &**children;
                if let Some(c3) = c[3].as_ref() {
                    stack.push(c3);
                }
                if let Some(c2) = c[2].as_ref() {
                    stack.push(c2);
                }
                if let Some(c1) = c[1].as_ref() {
                    stack.push(c1);
                }
                if let Some(c0) = c[0].as_ref() {
                    stack.push(c0);
                }
            }
        }

        stack.clear();
        (fx, fy)
    }

    fn is_empty(&self) -> bool {
        self.mass == 0.0 && self.body.is_none()
    }

    fn place_body(&mut self, x: f32, y: f32) {
        self.body = Some((x, y));
        self.cx = x;
        self.cy = y;
        self.mass = 1.0;
    }

    fn accumulate_mass(&mut self, x: f32, y: f32) {
        let total = self.mass + 1.0;
        self.cx = (self.cx * self.mass + x) / total;
        self.cy = (self.cy * self.mass + y) / total;
        self.mass = total;
    }

    fn ensure_children(&mut self) {
        if self.children.is_some() {
            return;
        }
        let mut children: [Option<QuadNode>; 4] = [None, None, None, None];
        for (i, child) in children.iter_mut().enumerate() {
            let (cx_min, cy_min, cx_max, cy_max) = self.child_bounds(i);
            *child = Some(QuadNode::new(cx_min, cy_min, cx_max, cy_max));
        }
        self.children = Some(Box::new(children));
    }

    fn push_existing_body_down(&mut self, depth: usize) {
        if let Some((bx, by)) = self.body.take() {
            let bq = self.quadrant(bx, by);
            let child = self.children.as_mut().unwrap()[bq].as_mut().unwrap();
            child.insert_at_depth(bx, by, depth + 1);
        }
    }

    fn can_approximate(&self, dist_sq: f32) -> bool {
        let (x_min, _y_min, x_max, _y_max) = self.bounds;
        let width = x_max - x_min;
        self.children.is_none() || (width * width) < THETA_SQ * dist_sq
    }

    fn quadrant(&self, x: f32, y: f32) -> usize {
        let (x_min, y_min, x_max, y_max) = self.bounds;
        let mx = (x_min + x_max) / 2.0;
        let my = (y_min + y_max) / 2.0;
        if x < mx {
            if y < my { 0 } else { 2 }
        } else if y < my {
            1
        } else {
            3
        }
    }

    fn child_bounds(&self, q: usize) -> Bounds {
        let (x_min, y_min, x_max, y_max) = self.bounds;
        let mx = (x_min + x_max) / 2.0;
        let my = (y_min + y_max) / 2.0;
        match q {
            0 => (x_min, y_min, mx, my),
            1 => (mx, y_min, x_max, my),
            2 => (x_min, my, mx, y_max),
            3 => (mx, my, x_max, y_max),
            _ => unreachable!(),
        }
    }
}

/// Compute axis-aligned bounding box over a flat positions buffer
/// `[x0, y0, x1, y1, ...]`, padded by `pad` units on each side.
pub(super) fn bounding_box(positions_flat: &[f32], pad: f32) -> Bounds {
    let mut x_min = f32::MAX;
    let mut y_min = f32::MAX;
    let mut x_max = f32::MIN;
    let mut y_max = f32::MIN;
    let n = positions_flat.len() / 2;
    for i in 0..n {
        let x = positions_flat[i * 2];
        let y = positions_flat[i * 2 + 1];
        x_min = x_min.min(x);
        y_min = y_min.min(y);
        x_max = x_max.max(x);
        y_max = y_max.max(y);
    }
    (x_min - pad, y_min - pad, x_max + pad, y_max + pad)
}

/// Build and populate a Barnes-Hut tree from a flat positions buffer.
pub(super) fn build_tree(positions_flat: &[f32], bounds: Bounds) -> QuadNode {
    let (x_min, y_min, x_max, y_max) = bounds;
    let mut root = QuadNode::new(x_min, y_min, x_max, y_max);
    let n = positions_flat.len() / 2;
    for i in 0..n {
        root.insert(positions_flat[i * 2], positions_flat[i * 2 + 1]);
    }
    root
}
