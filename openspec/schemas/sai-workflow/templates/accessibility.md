# Accessibility Report — <!-- Feature Name -->

**Spec:** `openspec/changes/<change-name>/proposal.md`  
**Standard:** WCAG 2.2 Level AA  
**Scope:** <!-- diff vs `<parent-branch>` | full repo | `<path>` -->  
**Mode:** <!-- Static | Static + Runtime -->  
**Branch:** `<current-branch>`  
**Frameworks detected:** <!-- React / Astro / Tailwind / vanilla — list -->  
**Components in scope:** <!-- list -->  
**Date:** <!-- YYYY-MM-DD -->

## Not Applicable

<!-- REQUIRED: Fill this section even when accessibility audit is not applicable.
     If the diff contains no UI files (.tsx/.jsx/.astro/.html/.vue/.svelte/.css
     or component-bearing markdown), explain why here and leave findings empty. -->

**Justification:** <!-- Why no UI surface is touched, OR leave blank and fill findings below -->

---

## Executive Summary

| Severity | Count |
|----------|-------|
| Critical | |
| High | |
| Medium | |
| Low | |
| Informational | |
| **Total** | |

**Verdict:** <!-- Block release | Release after Critical/High fixed | Acceptable -->

**Posture:** <!-- one-sentence assessment of inclusive-design state -->

---

## Findings

### [SEVERITY] WCAG <!-- SC code -->: <!-- short title -->

- **Location:** `<file>:<line>` (or selector / component name)
- **Component / Flow:** <!-- modal / form / nav / route announcer / ... -->
- **WCAG SC:** <!-- code --> — <!-- name --> (Level A/AA/AAA)
- **Symptom:** <!-- what fails for which user group — keyboard-only / screen reader / low vision / motor -->
- **Evidence:**
  ```
  <!-- offending code or runtime output, quoted exactly -->
  ```
- **Why it fails:** <!-- one or two sentences mapping the code to the SC failure -->
- **Remediation:**
  ```
  <!-- fixed snippet using the project's framework idioms -->
  ```
- **Validation:** <!-- keyboard path / screen-reader check / axe rule / Lighthouse audit to re-run -->
- **Spec note:** <!-- "Acknowledged in spec.md §X" / — -->

---

## Acknowledged Trade-offs (from spec.md)

- <!-- Item explicitly accepted in spec.md, with spec section reference -->

---

## Coverage Notes

- **Files reviewed:** <!-- n / n in scope -->
- **Static phases evaluated:** <!-- 2,3,4,5,6,7,8 — list -->
- **Runtime tools used:** <!-- axe / pa11y / Lighthouse / manual keyboard / "none — static-only mode" -->
- **Categories with no instances detected:** <!-- list — do not omit silently -->

---

## Prioritized Remediation Plan

### Block release (Critical / High)
1. **<!-- finding -->** (`<location>`) — <!-- one-line action -->

### Next sprint (Medium)
1. **<!-- finding -->** (`<location>`) — <!-- one-line action -->

### Backlog (Low / Informational)
1. **<!-- finding -->** (`<location>`) — <!-- one-line action -->

---

## Re-Test Checklist

Before merging, verify:
- [ ] Keyboard-only walk of <!-- flow --> — focus visible, logical order, no traps
- [ ] Screen reader smoke test on <!-- flow --> — names, roles, states announced correctly
- [ ] axe / Lighthouse re-run — no new violations
- [ ] 200% zoom + 320px width — no horizontal scroll on reading flows
- [ ] `prefers-reduced-motion` honored
- [ ] Forced colors mode (Windows high contrast) — content still legible
