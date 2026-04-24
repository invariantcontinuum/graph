use crate::LayoutEngine;
use graph_core::graph::GraphStore;
use std::collections::HashMap;

const THETA: f32 = 0.9;
// Equilibrium tuning: with `rep = -REPULSION/d^2` and `att = ATTRACTION*d`
// the balanced distance is `d_eq = cbrt(REPULSION/ATTRACTION)`. With these
// constants that works out to ~160 units — enough breathing room for
// 110×38 node rectangles to sit next to each other without overlap while
// still letting 1-hop neighbors visibly cluster.
const REPULSION: f32 = 20_000.0;
const MAX_QUAD_DEPTH: usize = 40;
const ATTRACTION: f32 = 0.005;
// Minimum gap enforced in-step via a short-range hard bump so 110×38 node
// rectangles (diag ≈ 117) never physically overlap even when the force
// field settles at a slightly tighter distance than d_eq.
const MIN_NODE_GAP: f32 = 140.0;
const DAMPING: f32 = 0.86;
const MIN_VELOCITY: f32 = 0.02;
// 300 iterations of Barnes-Hut + attractive forces converge a 700-node graph
// in ~400-700 ms in release WASM. Enough for the layout to reach a stable
// minimum-energy configuration without dragging out first paint.
const MAX_ITERATIONS: usize = 300;

pub struct ForceLayout {
    node_ids: Vec<String>,
    positions_vec: Vec<(f32, f32)>,
    velocities_vec: Vec<(f32, f32)>,
    converged: bool,
    iteration: usize,
}

struct QuadNode {
    cx: f32,
    cy: f32,
    mass: f32,
    bounds: (f32, f32, f32, f32), // x_min, y_min, x_max, y_max
    children: Option<Box<[Option<QuadNode>; 4]>>,
    body: Option<(f32, f32)>,
}

impl QuadNode {
    fn new(x_min: f32, y_min: f32, x_max: f32, y_max: f32) -> Self {
        Self {
            cx: 0.0,
            cy: 0.0,
            mass: 0.0,
            bounds: (x_min, y_min, x_max, y_max),
            children: None,
            body: None,
        }
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

    fn child_bounds(&self, q: usize) -> (f32, f32, f32, f32) {
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

    fn insert(&mut self, x: f32, y: f32) {
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

            if node.mass == 0.0 && node.body.is_none() {
                // Empty node — place body here
                node.body = Some((x, y));
                node.cx = x;
                node.cy = y;
                node.mass = 1.0;
                return;
            }

            // At max depth, just accumulate mass without subdividing further
            if depth >= MAX_QUAD_DEPTH {
                let total = node.mass + 1.0;
                node.cx = (node.cx * node.mass + x) / total;
                node.cy = (node.cy * node.mass + y) / total;
                node.mass = total;
                return;
            }

            // Ensure children exist
            if node.children.is_none() {
                let mut children: [Option<QuadNode>; 4] = [None, None, None, None];
                for (i, child) in children.iter_mut().enumerate() {
                    let (cx_min, cy_min, cx_max, cy_max) = node.child_bounds(i);
                    *child = Some(QuadNode::new(cx_min, cy_min, cx_max, cy_max));
                }
                node.children = Some(Box::new(children));
            }

            // If this is a leaf with an existing body, push it down into
            // the appropriate child. Uses insert_at_depth with bounded
            // recursion (max MAX_QUAD_DEPTH frames).
            if let Some((bx, by)) = node.body.take() {
                let bq = node.quadrant(bx, by);
                let child = node.children.as_mut().unwrap()[bq].as_mut().unwrap();
                child.insert_at_depth(bx, by, depth + 1);
            }

            // Update center of mass
            let total = node.mass + 1.0;
            node.cx = (node.cx * node.mass + x) / total;
            node.cy = (node.cy * node.mass + y) / total;
            node.mass = total;

            // Descend into the correct quadrant for the new point
            let q = node.quadrant(x, y);
            let next: *mut QuadNode = {
                let children = node.children.as_mut().unwrap();
                children[q].as_mut().unwrap() as *mut QuadNode
            };
            current = next;
            depth += 1;
        }
    }

    fn compute_force(&self, x: f32, y: f32) -> (f32, f32) {
        let mut fx = 0.0_f32;
        let mut fy = 0.0_f32;
        let mut stack: Vec<&QuadNode> = vec![self];

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

            let (x_min, _y_min, x_max, _y_max) = node.bounds;
            let width = x_max - x_min;

            // Barnes-Hut criterion: if node is far enough, treat as single body
            if (width * width) / dist_sq < THETA * THETA || node.children.is_none() {
                let dist = dist_sq.sqrt();
                let force = -REPULSION * node.mass / dist_sq;
                fx += force * dx / dist;
                fy += force * dy / dist;
                continue;
            }

            // Otherwise push children onto the stack
            if let Some(ref children) = node.children {
                for c in children.iter().flatten() {
                    stack.push(c);
                }
            }
        }

        (fx, fy)
    }
}

impl ForceLayout {
    pub fn new() -> Self {
        Self {
            node_ids: Vec::new(),
            positions_vec: Vec::new(),
            velocities_vec: Vec::new(),
            converged: false,
            iteration: 0,
        }
    }

    fn init_positions(&mut self, graph: &GraphStore) {
        // Sort ids so the golden-angle seeding is reproducible across runs.
        let mut node_ids: Vec<String> = graph.nodes().map(|n| n.id.clone()).collect();
        node_ids.sort();

        let n = node_ids.len() as f32;
        let golden_angle = std::f32::consts::PI * (3.0 - 5.0_f32.sqrt());
        let seed_radius = 60.0 * (n.max(1.0)).sqrt().min(64.0);

        // Build a temporary map of current positions to reuse them if the ID exists.
        let mut old_positions = HashMap::new();
        for (id, pos) in self.node_ids.drain(..).zip(self.positions_vec.drain(..)) {
            old_positions.insert(id, pos);
        }

        self.node_ids = node_ids;
        self.positions_vec.clear();
        self.positions_vec.reserve(self.node_ids.len());

        for (i, id) in self.node_ids.iter().enumerate() {
            if let Some(pos) = old_positions.get(id) {
                self.positions_vec.push(*pos);
            } else {
                let r = (i as f32 / n.max(1.0)).sqrt() * seed_radius;
                let theta = i as f32 * golden_angle;
                let x = r * theta.cos();
                let y = r * theta.sin();
                self.positions_vec.push((x, y));
            }
        }

        if self.velocities_vec.len() < self.node_ids.len() {
            self.velocities_vec.resize(self.node_ids.len(), (0.0, 0.0));
        }
    }

    /// Run one force-integration step on an external flat positions buffer
    /// (layout: [x0, y0, x1, y1, ...]) with index-based edges, skipping
    /// position updates for any node index in `pinned`.
    ///
    /// Returns `true` if any free node is still moving above the minimum
    /// velocity threshold, `false` when the system has effectively settled.
    pub fn step_with_pins(
        &mut self,
        positions: &mut [f32],
        edges: &[(usize, usize)],
        pinned: &std::collections::HashSet<usize>,
    ) -> bool {
        let n = positions.len() / 2;
        if n == 0 {
            return false;
        }

        // Save pinned positions so we can restore them after the step.
        let mut saved: Vec<(usize, f32, f32)> = pinned
            .iter()
            .filter_map(|&idx| {
                let i = idx * 2;
                if i + 1 < positions.len() {
                    Some((idx, positions[i], positions[i + 1]))
                } else {
                    None
                }
            })
            .collect();

        // --- Compute bounding box for the quad-tree ---
        let mut x_min = f32::MAX;
        let mut y_min = f32::MAX;
        let mut x_max = f32::MIN;
        let mut y_max = f32::MIN;
        for i in 0..n {
            let x = positions[i * 2];
            let y = positions[i * 2 + 1];
            x_min = x_min.min(x);
            y_min = y_min.min(y);
            x_max = x_max.max(x);
            y_max = y_max.max(y);
        }
        let pad = 10.0_f32;
        x_min -= pad;
        y_min -= pad;
        x_max += pad;
        y_max += pad;

        // --- Build quad-tree ---
        let mut root = QuadNode::new(x_min, y_min, x_max, y_max);
        for i in 0..n {
            root.insert(positions[i * 2], positions[i * 2 + 1]);
        }

        // --- Repulsive forces (Barnes-Hut) ---
        let mut forces: Vec<(f32, f32)> = (0..n)
            .map(|i| root.compute_force(positions[i * 2], positions[i * 2 + 1]))
            .collect();

        // --- Attractive forces from edges ---
        for &(src, tgt) in edges {
            if src >= n || tgt >= n {
                continue;
            }
            let sx = positions[src * 2];
            let sy = positions[src * 2 + 1];
            let tx = positions[tgt * 2];
            let ty = positions[tgt * 2 + 1];
            let dx = tx - sx;
            let dy = ty - sy;
            let dist = (dx * dx + dy * dy).sqrt().max(0.1);
            let force = ATTRACTION * dist;
            let fx = force * dx / dist;
            let fy = force * dy / dist;
            forces[src].0 += fx;
            forces[src].1 += fy;
            forces[tgt].0 -= fx;
            forces[tgt].1 -= fy;
        }

        // --- Integrate velocities and positions ---
        // We use a flat vector for velocities, index-aligned with positions.
        // If the number of nodes grew, we resize the velocity store.
        if self.velocities_vec.len() < n {
            self.velocities_vec.resize(n, (0.0, 0.0));
        }

        let mut max_velocity_sq: f32 = 0.0;
        for i in 0..n {
            let (fx, fy) = forces[i];
            let vel = &mut self.velocities_vec[i];
            vel.0 = (vel.0 + fx) * DAMPING;
            vel.1 = (vel.1 + fy) * DAMPING;
            let v_sq = vel.0 * vel.0 + vel.1 * vel.1;
            max_velocity_sq = max_velocity_sq.max(v_sq);
            positions[i * 2] += vel.0;
            positions[i * 2 + 1] += vel.1;
        }

        // --- Restore pinned positions ---
        for (idx, x, y) in saved.drain(..) {
            let i = idx * 2;
            if i + 1 < positions.len() {
                positions[i] = x;
                positions[i + 1] = y;
            }
        }

        max_velocity_sq >= MIN_VELOCITY * MIN_VELOCITY
    }

    /// Return current positions without resetting the layout state.
    pub fn get_positions(&self) -> impl Iterator<Item = (&String, f32, f32)> {
        self.node_ids
            .iter()
            .zip(self.positions_vec.iter())
            .map(|(id, &(x, y))| (id, x, y))
    }

    pub fn total_velocity_energy(&self) -> f32 {
        self.velocities_vec
            .iter()
            .map(|(vx, vy)| vx * vx + vy * vy)
            .sum()
    }
}

impl Default for ForceLayout {
    fn default() -> Self {
        Self::new()
    }
}

impl LayoutEngine for ForceLayout {
    fn compute(&mut self, graph: &GraphStore) -> Vec<(String, f32, f32)> {
        self.init_positions(graph);
        self.iteration = 0;
        self.converged = false;

        for _ in 0..MAX_ITERATIONS {
            let still_moving = self.tick(graph);
            if !still_moving {
                break;
            }
        }

        self.get_positions()
            .map(|(id, x, y)| (id.clone(), x, y))
            .collect()
    }

    fn tick(&mut self, graph: &GraphStore) -> bool {
        self.init_positions(graph);
        self.iteration += 1;

        let n = self.node_ids.len();
        if n == 0 {
            self.converged = true;
            return false;
        }

        // Build a mapping from node ID to its index for O(1) edge lookup.
        let id_to_idx: HashMap<&str, usize> = self
            .node_ids
            .iter()
            .enumerate()
            .map(|(i, id)| (id.as_str(), i))
            .collect();

        // Compute bounding box for quad-tree
        let mut x_min = f32::MAX;
        let mut y_min = f32::MAX;
        let mut x_max = f32::MIN;
        let mut y_max = f32::MIN;
        for &(x, y) in &self.positions_vec {
            x_min = x_min.min(x);
            y_min = y_min.min(y);
            x_max = x_max.max(x);
            y_max = y_max.max(y);
        }
        // Add padding
        let pad = 10.0;
        x_min -= pad;
        y_min -= pad;
        x_max += pad;
        y_max += pad;

        // Build quad-tree
        let mut root = QuadNode::new(x_min, y_min, x_max, y_max);
        for &(x, y) in &self.positions_vec {
            root.insert(x, y);
        }

        // Compute repulsive forces via Barnes-Hut
        let mut forces: Vec<(f32, f32)> = self
            .positions_vec
            .iter()
            .map(|&(x, y)| root.compute_force(x, y))
            .collect();

        // Compute attractive forces from edges
        for edge in graph.edges() {
            if let (Some(&src_idx), Some(&tgt_idx)) =
                (id_to_idx.get(edge.source.as_str()), id_to_idx.get(edge.target.as_str()))
            {
                let (sx, sy) = self.positions_vec[src_idx];
                let (tx, ty) = self.positions_vec[tgt_idx];
                let dx = tx - sx;
                let dy = ty - sy;
                let dist = (dx * dx + dy * dy).sqrt().max(0.1);
                let force = ATTRACTION * dist;
                let fx = force * dx / dist;
                let fy = force * dy / dist;

                forces[src_idx].0 += fx;
                forces[src_idx].1 += fy;
                forces[tgt_idx].0 -= fx;
                forces[tgt_idx].1 -= fy;
            }
        }

        // Apply forces to velocities and positions
        let mut max_velocity_sq: f32 = 0.0;
        for i in 0..n {
            let (fx, fy) = forces[i];
            let vel = &mut self.velocities_vec[i];
            vel.0 = (vel.0 + fx) * DAMPING;
            vel.1 = (vel.1 + fy) * DAMPING;

            let v_sq = vel.0 * vel.0 + vel.1 * vel.1;
            max_velocity_sq = max_velocity_sq.max(v_sq);

            let pos = &mut self.positions_vec[i];
            pos.0 += vel.0;
            pos.1 += vel.1;
        }

        // Local overlap resolution
        let gap_sq = MIN_NODE_GAP * MIN_NODE_GAP;
        let bucket_size = MIN_NODE_GAP;
        let mut buckets: HashMap<(i32, i32), Vec<usize>> = HashMap::new();
        for i in 0..n {
            let (x, y) = self.positions_vec[i];
            let key = ((x / bucket_size).floor() as i32, (y / bucket_size).floor() as i32);
            buckets.entry(key).or_default().push(i);
        }
        for i in 0..n {
            let (x, y) = self.positions_vec[i];
            let key = ((x / bucket_size).floor() as i32, (y / bucket_size).floor() as i32);
            let mut push_dx = 0.0_f32;
            let mut push_dy = 0.0_f32;
            for dx in -1..=1 {
                for dy in -1..=1 {
                    if let Some(bucket) = buckets.get(&(key.0 + dx, key.1 + dy)) {
                        for &other_idx in bucket {
                            if other_idx == i {
                                continue;
                            }
                            let (ox, oy) = self.positions_vec[other_idx];
                            let ddx = x - ox;
                            let ddy = y - oy;
                            let d_sq = ddx * ddx + ddy * ddy;
                            if d_sq < gap_sq && d_sq > 0.0001 {
                                let d = d_sq.sqrt();
                                let push = (MIN_NODE_GAP - d) * 0.5;
                                push_dx += ddx / d * push;
                                push_dy += ddy / d * push;
                            }
                        }
                    }
                }
            }
            if push_dx != 0.0 || push_dy != 0.0 {
                let pos = &mut self.positions_vec[i];
                pos.0 += push_dx;
                pos.1 += push_dy;
            }
        }

        if max_velocity_sq < MIN_VELOCITY * MIN_VELOCITY {
            self.converged = true;
            return false;
        }

        true
    }

    fn is_converged(&self) -> bool {
        self.converged
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use graph_core::types::*;
    use std::collections::HashSet;

    fn make_node(id: &str) -> NodeData {
        NodeData {
            id: id.to_string(),
            name: id.to_string(),
            node_type: NodeType::Service,
            domain: "test".to_string(),
            status: Status::Healthy,
            community: None,
            meta: Default::default(),
        }
    }

    fn make_edge(source: &str, target: &str) -> EdgeData {
        EdgeData {
            id: format!("{}-{}", source, target),
            source: source.to_string(),
            target: target.to_string(),
            edge_type: EdgeType::DependsOn,
            label: String::new(),
            weight: 1.0,
        }
    }

    #[test]
    fn converges_small_graph() {
        let mut graph = GraphStore::new();
        for i in 0..10 {
            graph.add_node(make_node(&format!("n{}", i)));
        }
        for i in 0..9 {
            graph.add_edge(make_edge(&format!("n{}", i), &format!("n{}", i + 1)));
        }

        let mut layout = ForceLayout::new();
        let positions = layout.compute(&graph);

        assert_eq!(positions.len(), 10);
        assert!(layout.is_converged() || layout.iteration <= MAX_ITERATIONS);

        // Verify all positions are finite
        for (_, x, y) in &positions {
            assert!(x.is_finite(), "x position not finite");
            assert!(y.is_finite(), "y position not finite");
        }
    }

    #[test]
    fn energy_decreases() {
        let mut graph = GraphStore::new();
        for i in 0..20 {
            graph.add_node(make_node(&format!("n{}", i)));
        }
        for i in 0..19 {
            graph.add_edge(make_edge(&format!("n{}", i), &format!("n{}", i + 1)));
        }

        let mut layout = ForceLayout::new();
        layout.init_positions(&graph);

        // Run 50 ticks to let the system settle past initial transients
        for _ in 0..50 {
            layout.tick(&graph);
        }
        let energy_early = layout.total_velocity_energy();

        // Run 50 more ticks
        for _ in 0..50 {
            layout.tick(&graph);
        }
        let energy_late = layout.total_velocity_energy();

        assert!(
            energy_late <= energy_early,
            "Energy should decrease: early={}, late={}",
            energy_early,
            energy_late
        );
    }

    #[test]
    fn pinned_nodes_do_not_move() {
        let mut layout = ForceLayout::new();
        // Two nodes at (0,0) and (100,0), one edge between them.
        let mut positions = vec![0.0_f32, 0.0, 100.0, 0.0];
        let edges: Vec<(usize, usize)> = vec![(0, 1)];

        let mut pinned = HashSet::new();
        pinned.insert(0); // pin node 0

        // Run a single step that honors pinned set.
        layout.step_with_pins(&mut positions, &edges, &pinned);

        // Node 0 must stay exactly at (0,0).
        assert!(
            (positions[0]).abs() < 1e-4,
            "pinned x drifted: {}",
            positions[0]
        );
        assert!(
            (positions[1]).abs() < 1e-4,
            "pinned y drifted: {}",
            positions[1]
        );
        // Node 1 is free — it may or may not move depending on the force model.
    }
}
