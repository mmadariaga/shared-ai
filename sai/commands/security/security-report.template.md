```markdown
# Security Report — {Feature Name}

**Scope:** {diff vs `{parent-branch}` | full repo | `{path}`} · **Scan type:** {SAST | SCA | SAST+SCA} · **Date:** {YYYY-MM-DD}

{Write a section only when it has content: omit every section with nothing to record instead of filling it with "N/A" or an empty table.}

## Not Applicable

{Keep this section only when the selected scope has no attack surface and the
SCA gate admits no manifest: the report is then the title, the provenance line,
and this section, with no findings sections and no tally line. Otherwise delete
this heading entirely — /sai-status and /sai-archive read its presence as
"audit not applicable".}

**Justification:** {Why the selected scope has no attack surface and the SCA gate admits no manifest}

---

## SAST Findings

### C1 [SEVERITY] CWE-XXX — {short title}

- **Module:** `{module}`
- **File:** `{path}:{line}`
- **Flaw category:** {category}
- **CWE:** CWE-XXX — {name} (omit if mapping is not direct)
- **OWASP 2025:** {A0X — name} (omit if mapping is not direct)
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

### H1 [SEVERITY] {CVE-ID} — {package}@{version}

- **Package:** `{name}@{version}`
- **Ecosystem:** {npm/PyPI/Maven/NuGet/Go/...}
- **Type:** Direct | Transitive (via `{parent}`)
- **CVE:** {CVE-XXXX-XXXXX}
- **Source:** {audit tool | recalled}
- **CVSS:** {score} ({vector})
- **Vulnerability:** {brief description}
- **Fix version:** `{version}` (available: yes/no)
- **Remediation:** Upgrade to `{name}@{fix}` / replace with `{alternative}` / pin transitive override

---

## Acknowledged Trade-offs (from change artifacts)

> Optional. Include only the accepted trade-offs you evaluated and relied on.

- {Item with artifact and section reference}

---

Summary: Critical={n} High={n} Medium={n} Low={n}
```
