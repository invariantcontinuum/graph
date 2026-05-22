//! Background grid renderer.
//!
//! Drawn as the FIRST WebGL pass after `clear`, so every other pass (hulls,
//! edges, arrows, nodes, text) sits visually on top of the grid. This replaces
//! the legacy Canvas2D `GridOverlay` which lived behind a transparent WebGL
//! canvas — that arrangement let the grid bleed through antialiased edge
//! pixels and looked like the grid was painted on top of the graph.

use web_sys::{
    WebGl2RenderingContext as GL, WebGlProgram, WebGlUniformLocation, WebGlVertexArrayObject,
};

use crate::context::RenderContext;

const GRID_VERT: &str = include_str!("../shaders/grid.vert");
const GRID_FRAG: &str = include_str!("../shaders/grid.frag");

pub struct GridRenderer {
    program: WebGlProgram,
    vao: WebGlVertexArrayObject,
    u_origin: WebGlUniformLocation,
    u_grid_px: WebGlUniformLocation,
    u_line_px: WebGlUniformLocation,
    u_color: WebGlUniformLocation,
}

impl GridRenderer {
    pub fn new(ctx: &RenderContext) -> Result<Self, String> {
        let program = ctx.link_program(GRID_VERT, GRID_FRAG)?;
        let gl = &ctx.gl;
        // WebGL2 requires a VAO bound to draw, even for attribute-less shaders
        // that synthesize positions from gl_VertexID.
        let vao = gl.create_vertex_array().ok_or("Failed to create VAO")?;
        let u_origin = gl
            .get_uniform_location(&program, "u_origin")
            .ok_or("Missing u_origin uniform")?;
        let u_grid_px = gl
            .get_uniform_location(&program, "u_grid_px")
            .ok_or("Missing u_grid_px uniform")?;
        let u_line_px = gl
            .get_uniform_location(&program, "u_line_px")
            .ok_or("Missing u_line_px uniform")?;
        let u_color = gl
            .get_uniform_location(&program, "u_color")
            .ok_or("Missing u_color uniform")?;
        Ok(Self {
            program,
            vao,
            u_origin,
            u_grid_px,
            u_line_px,
            u_color,
        })
    }

    /// Compute the screen-space origin and grid spacing from the camera's VP
    /// matrix and draw the full-screen grid. Math mirrors the legacy
    /// `react/overlays/vpMath.ts::screenZoom` so visual continuity is
    /// preserved across the grid → WebGL migration.
    pub fn draw(
        &self,
        gl: &GL,
        vp_matrix: &[f32; 16],
        canvas_width: f32,
        canvas_height: f32,
        dpr: f32,
        color: &[f32; 4],
    ) {
        if color[3] <= 0.0 {
            return;
        }
        let zoom = (vp_matrix[0].hypot(vp_matrix[1])) * 0.5 * canvas_width / dpr;
        let base_grid_px = 50.0 * dpr;
        let grid_px = (base_grid_px * zoom).clamp(12.0 * dpr, 240.0 * dpr);
        // World origin -> screen pixel space. gl_FragCoord uses bottom-left
        // origin, so flip Y relative to the canvas-2D convention.
        let origin_x = (vp_matrix[12] + 1.0) * 0.5 * canvas_width;
        let origin_y_top = (1.0 - vp_matrix[13]) * 0.5 * canvas_height;
        let origin_y = canvas_height - origin_y_top;
        let line_px = (1.0 * dpr).max(1.0);

        gl.use_program(Some(&self.program));
        gl.bind_vertex_array(Some(&self.vao));
        gl.uniform2f(Some(&self.u_origin), origin_x, origin_y);
        gl.uniform1f(Some(&self.u_grid_px), grid_px);
        gl.uniform1f(Some(&self.u_line_px), line_px);
        gl.uniform4f(
            Some(&self.u_color),
            color[0],
            color[1],
            color[2],
            color[3],
        );
        gl.draw_arrays(GL::TRIANGLES, 0, 3);
        gl.bind_vertex_array(None);
    }
}
