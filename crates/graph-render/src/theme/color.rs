//! CSS color parsing — `#RRGGBB`, `#RRGGBBAA`, `rgb(...)`, `rgba(...)`.
//!
//! All parsers return a safe gray fallback `(0.5, 0.5, 0.5, 1.0)` on
//! malformed input so downstream rendering never panics on bad theme JSON.

pub(crate) const FALLBACK: (f32, f32, f32, f32) = (0.5, 0.5, 0.5, 1.0);

const HEX6: usize = 6;
const HEX8: usize = 8;
const U8_MAX_F: f32 = 255.0;

/// Parse a CSS-style color string into `(r, g, b, a)` floats in `[0, 1]`.
///
/// Accepts `#RRGGBB`, `#RRGGBBAA`, `rgb(r, g, b)`, and `rgba(r, g, b, a)`.
/// Returns `(0.5, 0.5, 0.5, 1.0)` on parse failure.
pub fn parse_css_color(s: &str) -> (f32, f32, f32, f32) {
    let trimmed = s.trim();
    if let Some(hex) = trimmed.strip_prefix('#') {
        return parse_hex(hex);
    }
    if let Some(inside) = strip_fn(trimmed, "rgba(") {
        return parse_rgba(inside);
    }
    if let Some(inside) = strip_fn(trimmed, "rgb(") {
        let (r, g, b, _) = parse_rgba(inside);
        return (r, g, b, 1.0);
    }
    FALLBACK
}

fn strip_fn<'a>(s: &'a str, prefix: &str) -> Option<&'a str> {
    s.strip_prefix(prefix)
        .and_then(|rest| rest.strip_suffix(')'))
}

fn parse_hex(h: &str) -> (f32, f32, f32, f32) {
    if h.len() != HEX6 && h.len() != HEX8 {
        return FALLBACK;
    }
    let Ok(r) = u8::from_str_radix(&h[0..2], 16) else {
        return FALLBACK;
    };
    let Ok(g) = u8::from_str_radix(&h[2..4], 16) else {
        return FALLBACK;
    };
    let Ok(b) = u8::from_str_radix(&h[4..6], 16) else {
        return FALLBACK;
    };
    let a = if h.len() == HEX8 {
        u8::from_str_radix(&h[6..8], 16)
            .map(|v| f32::from(v) / U8_MAX_F)
            .unwrap_or(1.0)
    } else {
        1.0
    };
    (
        f32::from(r) / U8_MAX_F,
        f32::from(g) / U8_MAX_F,
        f32::from(b) / U8_MAX_F,
        a,
    )
}

fn parse_rgba(inside: &str) -> (f32, f32, f32, f32) {
    let parts: Vec<&str> = inside.split(',').map(str::trim).collect();
    if parts.len() < 3 || parts.len() > 4 {
        return FALLBACK;
    }
    let Ok(r) = parts[0].parse::<u32>() else {
        return FALLBACK;
    };
    let Ok(g) = parts[1].parse::<u32>() else {
        return FALLBACK;
    };
    let Ok(b) = parts[2].parse::<u32>() else {
        return FALLBACK;
    };
    if r > 255 || g > 255 || b > 255 {
        return FALLBACK;
    }
    let a = if parts.len() == 4 {
        match parts[3].parse::<f32>() {
            Ok(v) if (0.0..=1.0).contains(&v) => v,
            _ => return FALLBACK,
        }
    } else {
        1.0
    };
    (
        r as f32 / U8_MAX_F,
        g as f32 / U8_MAX_F,
        b as f32 / U8_MAX_F,
        a,
    )
}
