#version 300 es
precision highp float;
// Screen-space grid lines drawn as the first WebGL pass — behind hulls, edges,
// arrows, nodes and text. Keeping the grid inside the same canvas as the rest
// of the engine means antialiased edges never bleed an underlying overlay
// through (the failure mode of the prior 2D-canvas overlay).
out vec4 frag_color;
uniform vec2 u_origin;      // screen pixel of world origin (top-left)
uniform float u_grid_px;    // grid spacing in device pixels
uniform float u_line_px;    // line thickness in device pixels (~dpr)
uniform vec4 u_color;       // grid line color (rgba, alpha pre-applied)

void main() {
    vec2 frag = gl_FragCoord.xy;
    vec2 d = mod(frag - u_origin, u_grid_px);
    vec2 dline = min(d, u_grid_px - d);
    float min_d = min(dline.x, dline.y);
    float half_line = max(u_line_px * 0.5, 0.5);
    float aa = 0.75;
    float alpha = 1.0 - smoothstep(half_line - aa, half_line + aa, min_d);
    if (alpha < 0.01) discard;
    frag_color = vec4(u_color.rgb, u_color.a * alpha);
}
