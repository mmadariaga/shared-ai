# Security Report — <!-- Feature Name -->

**Spec:** `openspec/changes/<change-name>/proposal.md`  
**Scan type:** <!-- SAST | SCA | SAST+SCA -->  
**Scope:** <!-- diff vs `<parent-branch>` | full repo | `<path>` -->  
**Branch:** `<current-branch>`  
**Languages detected:** <!-- list -->  
**Modules in scope:** <!-- list -->  
**Date:** <!-- YYYY-MM-DD -->

## Not Applicable

<!-- REQUIRED: Fill this section even when security audit is not applicable.
     If this change has no security surface (no auth/input/crypto/HTTP/deps touched),
     explain why here and leave the findings sections empty. -->

**Justification:** <!-- Why this change has no security surface, OR leave blank and fill findings below -->

---

## Executive Summary

| Severity | Count |
|----------|-------|
| Critical | <!-- n --> |
| High | <!-- n --> |
| Medium | <!-- n --> |
| Low | <!-- n --> |
| **Total** | **<!-- n -->** |

**Risk posture:** <!-- one-sentence overall assessment -->

**Verdict:** <!-- Block release | Release after Critical/High fixed | Acceptable risk -->

---

## Module Summary

| Module | Files | Highest Severity |
|--------|-------|------------------|
| <!-- module --> | <!-- n --> | <!-- severity --> |

---

## SAST Findings

### [SEVERITY] CWE-XXX — <!-- short title -->

- **Module:** `<module>`
- **File:** `<path>:<line>`
- **Flaw category:** <!-- category -->
- **CWE:** CWE-XXX — <!-- name --> (omit if mapping is not direct)
- **OWASP 2025:** <!-- A0X — name -->
- **Taint flow:** `<source>` → `<propagation>` → `<sink>`
- **Evidence:**
  ```
  <!-- offending snippet -->
  ```
- **Exploit scenario:** <!-- one concrete attack sentence -->
- **Remediation:**
  ```
  <!-- fixed snippet or one-line action -->
  ```
- **Spec note:** <!-- "Acknowledged in spec.md §X" / — -->

---

## SCA Findings

> Include only if dependency manifests were modified in the diff.

### [SEVERITY] <!-- CVE-ID --> — <!-- package@version -->

- **Package:** `<name>@<version>`
- **Ecosystem:** <!-- npm/PyPI/Maven/NuGet/Go/... -->
- **CVE:** <!-- CVE-XXXX-XXXXX -->
- **CVSS:** <!-- score (vector) -->
- **Vulnerability:** <!-- brief description -->
- **Fix version:** `<version>` (available: yes/no)
- **Remediation:** <!-- upgrade to / replace with / pin override -->

---

## Prioritized Remediation Plan

### Block release (Critical / High)
1. **<!-- flaw -->** (`<file>:<line>`) — <!-- one-line fix action -->

### Next sprint (Medium)
1. **<!-- flaw -->** (`<file>:<line>`) — <!-- one-line fix action -->

### Backlog (Low)
1. **<!-- flaw -->** (`<file>:<line>`) — <!-- one-line fix action -->

---

## Metrics

- **Files scanned:** <!-- n -->
- **Flaw density:** <!-- flaws per 1000 LOC -->
- **Est. remediation effort:** <!-- hours -->
