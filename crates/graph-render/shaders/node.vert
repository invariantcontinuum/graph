#version 300 es
precision highp float;
layout(location = 0) in vec2 a_position;
layout(location = 1) in vec2 a_center;
layout(location = 2) in float a_radius;
layout(location = 3) in vec4 a_color;
layout(location = 4) in vec4 a_border_color;
layout(location = 5) in float a_border_width;
layout(location = 6) in float a_shape;
layout(location = 7) in float a_flags;
uniform mat4 u_vp;
uniform float u_time;
out vec2 v_local;
out vec4 v_color;
out vec4 v_border_color;
out float v_border_width;
out float v_shape;
out float v_radius;
out float v_flags;
void main() {
    float scale = a_radius;
    float flags = a_flags;
    bool pulse = mod(flags, 2.0) > 0.5;
    bool hovered = mod(floor(flags / 2.0), 2.0) > 0.5;
    if (pulse) scale *= 1.0 + 0.15 * sin(u_time * 3.0);
    if (hovered) scale *= 1.3;
    vec2 world = a_center + a_position * scale;
    gl_Position = u_vp * vec4(world, 0.0, 1.0);
    v_local = a_position; v_color = a_color; v_border_color = a_border_color;
    v_border_width = a_border_width / scale; v_shape = a_shape; v_radius = scale; v_flags = flags;
}
