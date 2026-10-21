## 2024-03-20 - Adding tabIndex={-1} to aria-hidden={true} overlays
**Learning:** React canvas overlays marked with `aria-hidden={true}` (to hide them from screen readers) must also explicitly have `tabIndex={-1}`. Without it, some linters (like SonarCloud `typescript:S6825`) flag them as potentially focusable elements that are hidden from assistive technologies, which is an accessibility violation.
**Action:** Always pair `aria-hidden={true}` with `tabIndex={-1}` on overlay canvas elements.

## 2026-10-21 - Add inline feedback to silent search failures
**Learning:** For search inputs or forms that fail silently when yielding no results, leverage the native HTML5 Constraint Validation API (setCustomValidity and reportValidity) to provide accessible, inline feedback (e.g., 'No nodes found') without adding custom UI dependencies or extra DOM nodes.
**Action:** Always clear the validity state (e.g., e.target.setCustomValidity('')) on subsequent input changes (onChange) to unblock the form.
