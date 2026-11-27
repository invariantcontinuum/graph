
## 2026-11-11 - Avoid overlay render loops when scene is not visible
**Learning:** React canvas overlays consume CPU/GPU resources even when they are off-screen.
**Action:** Wrapped the canvas element in an `IntersectionObserver` to skip `ctx.clearRect` and render calls when the canvas is off-screen.
