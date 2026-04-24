//! Insertion-ordered deduplication of string type keys.
//!
//! Both node-type and edge-type ordering must be stable across engine calls
//! because the renderer's per-instance buffers reference these keys by their
//! position in the list. Using plain `Vec<String>` with a manual "push if
//! new" check keeps the ordering deterministic (a `HashSet` would not).

pub(super) fn push_unique(keys: &mut Vec<String>, type_key: String) {
    if !keys.iter().any(|known| known == &type_key) {
        keys.push(type_key);
    }
}

/// Return the stable index of `type_key` in `keys`, or `0.0` when absent.
/// Returned as `f32` because the renderer consumes it directly from the
/// instance buffer.
pub(super) fn index_of(keys: &[String], type_key: &str) -> f32 {
    keys.iter().position(|k| k == type_key).unwrap_or(0) as f32
}
