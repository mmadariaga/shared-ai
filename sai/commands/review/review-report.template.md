```markdown
# Code Review — {Feature Name}

**Reviewed:** `{parent-branch}` {first-sha}..{last-sha} · {YYYY-MM-DD}

## Security Surface Triage

- **Surface touched:** {Yes / No}

---

## Performance Surface Triage

- **Surface touched:** {Yes / No}

---

## Accessibility Surface Triage

- **Surface touched:** {Yes / No}

---

## Findings

{Under a severity heading with no findings, write `None.`}

### Critical

#### C1 — {Short title}
- **Location:** `path/to/file.ext:LINE` (or range `LINE-LINE`)
- **Problem:** {Concrete description of what is wrong and the concrete impact. Quote the offending code or diff hunk here when it helps.}
- **Suggested fix:** {Specific change. If multiple valid options, list up to 3 with trade-offs.}

### High

#### H1 — {Short title}
- **Location:** `path/to/file.ext:LINE`
- **Problem:** {…}
- **Suggested fix:** {…}

### Medium

#### M1 — {Short title}
- **Location:** `path/to/file.ext:LINE`
- **Problem:** {…}
- **Suggested fix:** {…}

### Low

#### L1 — {Short title}
- **Location:** `path/to/file.ext:LINE`
- **Problem:** {…}
- **Suggested fix:** {…}

### Questions

#### Q1 — {Short title}
- **Location:** `path/to/file.ext:LINE` (or "general")
- **Question:** {What you need clarified and why the spec did not resolve it.}

---

Summary: Critical={n} High={n} Medium={n} Low={n} Questions={n}
```
