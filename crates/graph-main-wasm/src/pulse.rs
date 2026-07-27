//! Per-frame border width modulation for nodes flagged by theme's
//! `byStatus.pulse = true`. Amplitude +- 0.35, period 1200 ms.

pub const PULSE_PERIOD_MS: f64 = 1200.0;
pub const PULSE_AMPLITUDE: f32 = 0.35;

pub struct PulseState {
    pub(crate) pulse_indices: Vec<usize>, // sorted, unique
    start_time_ms: f64,
}

impl PulseState {
    pub fn new(start_time_ms: f64) -> Self {
        Self {
            pulse_indices: Vec::new(),
            start_time_ms,
        }
    }

    pub fn is_pulsing(&self, idx: usize) -> bool {
        self.pulse_indices.binary_search(&idx).is_ok()
    }

    pub fn has_any(&self) -> bool {
        !self.pulse_indices.is_empty()
    }

    pub fn border_multiplier(&self, idx: usize, time_ms: f64) -> f32 {
        if !self.is_pulsing(idx) {
            return 1.0;
        }
        let phase = ((time_ms - self.start_time_ms) / PULSE_PERIOD_MS) * std::f64::consts::TAU;
        1.0 + PULSE_AMPLITUDE * phase.sin() as f32
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn multiplier_range_is_1_pm_035() {
        let mut p = PulseState::new(0.0);
        p.pulse_indices = vec![0];
        for step in 0..=120 {
            let t = step as f64 * 10.0;
            let m = p.border_multiplier(0, t);
            assert!(m >= 0.65 - 1e-3, "m = {m} at t = {t}");
            assert!(m <= 1.35 + 1e-3, "m = {m} at t = {t}");
        }
    }

    #[test]
    fn non_pulsing_idx_returns_one() {
        let p = PulseState::new(0.0);
        assert_eq!(p.border_multiplier(3, 500.0), 1.0);
    }
}
