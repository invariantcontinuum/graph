#version 300 es
precision highp float;
// Full-screen triangle covering [-1, 1] clip space. We dispatch 3 vertices
// with no attribute buffer and synthesize positions from gl_VertexID, which
// avoids the VBO bookkeeping the other passes need and keeps grid setup tiny.
void main() {
    vec2 pos = vec2((gl_VertexID == 1) ? 3.0 : -1.0,
                    (gl_VertexID == 2) ? 3.0 : -1.0);
    gl_Position = vec4(pos, 0.0, 1.0);
}
