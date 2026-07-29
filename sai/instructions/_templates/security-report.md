
  ```markdown
  # Security Report — {Feature Name}

  **Change:** `openspec/changes/{change-name}/`
  **Scan type:** {SAST | SCA | SAST+SCA}
  **Scope:** {diff vs `{parent-branch}` | full repo | `{path}`}
  **Branch:** `{current-branch}`
  **Languages detected:** {list}
  **Modules in scope:** {list}
  **Date:** {YYYY-MM-DD}

  ## Executive Summary

  | Severity | Count |
  |----------|-------|
  | Critical | {n} |
  | High | {n} |
  | Medium | {n} |
  | Low | {n} |
  | **Total** | **{n}** |

  **Risk posture:** {one-sentence overall assessment}

  **Verdict:** {Block release | Release after Critical/High fixed | Acceptable risk}

  ---

  ## Module Summary

  | Module | Files | Highest Severity |
  |--------|-------|------------------|
  | {module} | {n} | {severity} |

  ---

  ## SAST Findings

  ### [SEVERITY] CWE-XXX — {short title}

  - **Module:** `{module}`
  - **File:** `{path}:{line}`
  - **Flaw category:** {category}
  - **CWE:** CWE-XXX — {name} (omit if mapping is not direct)
  - **OWASP 2025:** {A0X — name}
  - **Taint flow:** `{source}` → `{propagation}` → `{sink}`
  - **Evidence:**
    ```{lang}
    {offending snippet with surrounding context}
    ```
  - **Exploit scenario:** {one concrete attack sentence applicable to current code}
  - **Remediation:**
    ```{lang}
    {fixed snippet or one-line action}
    ```
  - **Spec note:** {"Acknowledged in `proposal.md` §X" | "Acknowledged in `specs/{capability}/spec.md` §X" | "—"}

  ---

  ## SCA Findings

  > Include this section **only** if dependency manifests were modified in the diff.

  ### [SEVERITY] {CVE-ID} — {package}@{version}

  - **Package:** `{name}@{version}`
  - **Ecosystem:** {npm/PyPI/Maven/NuGet/Go/...}
  - **Type:** Direct | Transitive (via `{parent}`)
  - **CVE:** {CVE-XXXX-XXXXX}
  - **CVSS:** {score} ({vector})
  - **Vulnerability:** {brief description}
  - **Fix version:** `{version}` (available: yes/no)
  - **License:** {SPDX} ({Low/Medium/High risk})
  - **Remediation:** Upgrade to `{name}@{fix}` / replace with `{alternative}` / pin transitive override

  ---

  ## Supply Chain Hygiene

  > Include this section **only** if dependency manifests were modified in the diff.

  - **Lock files present:** {yes/no — list missing}
  - **GitHub Actions pinned to SHA:** {yes/no — list violations}
  - **Typosquatting / dependency confusion suspects:** {none / list}
  - **Abandoned dependencies:** {none / list}

  ---

  ## License Risk

  > Include this section **only** if dependency manifests were modified in the diff.

  | Package | License | Risk | Commercial Use |
  |---------|---------|------|---------------|
  | {name} | {SPDX} | {Low/Medium/High} | {Permitted/Restricted/Prohibited} |

  ---

  ## Policy Compliance

  > Include this section **only** if dependency manifests were modified in the diff OR if SAST findings map directly to a policy control.

  | Policy | Status | Notes |
  |--------|--------|-------|
  | OWASP Top 10 2025 | PASS/FAIL | {categories} |
  | PCI-DSS v4.0 | PASS/FAIL/N/A | {requirements} |
  | SANS/CWE Top 25 | PASS/FAIL | {CWEs} |
  | GDPR | PASS/FAIL/N/A | {gaps} |

  ---

  ## Acknowledged Trade-offs (from change artifacts)

  > Optional. Include only if `proposal.md` or `design.md` contain explicit security decisions you evaluated and accepted.

  - {Item with artifact and section reference}

  ---

  ## Prioritized Remediation Plan

  ### Block release (Critical / High)
  1. **{flaw}** (`{file}:{line}`) — {one-line fix action}

  ### Next sprint (Medium)
  1. **{flaw}** (`{file}:{line}`) — {one-line fix action}

  ### Backlog (Low)
  1. **{flaw}** (`{file}:{line}`) — {one-line fix action}

  ---

  ## Metrics

  - **Files scanned:** {n}
  - **Flaw density:** {flaws per 1000 LOC scanned}
  - **Est. remediation effort:** {hours}
  ```
