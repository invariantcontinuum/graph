## 2024-03-20 - Adding tabIndex={-1} to aria-hidden={true} overlays
**Learning:** React canvas overlays marked with `aria-hidden={true}` (to hide them from screen readers) must also explicitly have `tabIndex={-1}`. Without it, some linters (like SonarCloud `typescript:S6825`) flag them as potentially focusable elements that are hidden from assistive technologies, which is an accessibility violation.
**Action:** Always pair `aria-hidden={true}` with `tabIndex={-1}` on overlay canvas elements.

## 2026-11-11 - Inline Feedback for Failed Searches
**Learning:** UX/Accessibility Pattern: Always provide inline visual and accessible feedback (e.g., using a red border and `aria-invalid={true}`) for failed searches or empty states in forms to communicate the 'no results' state without requiring intrusive modals.
**Action:** Use conditional borders and `aria-invalid` on search inputs to communicate failed states seamlessly.
