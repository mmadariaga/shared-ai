
```markdown
# Code Review — {Feature Name}

**Change:** `openspec/changes/{change-name}/`  
**Branch reviewed:** `{current-branch}`  
**Parent branch:** `{parent-branch}`  
**Commits in scope:** {N} ({first-sha}..{last-sha})  
**Files changed:** {N}  
**Date:** {YYYY-MM-DD}

## Summary

{One or two lines recording goal coverage against `proposal.md` and scope creep not already raised as findings. Do not repeat findings here; contradictions of recorded decisions remain findings from the Domain Alignment pass.}

**Verdict:** {Ready to merge | Ready after Critical findings fixed | Needs rework}

**Findings count:** {X Critical · Y High · Z Medium · W Low · V Questions}

---

## Security Surface Triage

- **Surface touched:** {Yes / No}
- **Areas affected:** {auth / input parsing / dynamic queries / crypto / HTTP boundary / deps / logging — list only the ones that apply, with file paths}
- **Recommendation:** {"Run `/sai-6-security {change-name}`" if Yes, else "Not required"}

---

## Performance Surface Triage

- **Surface touched:** {Yes / No}
- **Tiers affected:** {backend / frontend / db / queue — list only those in scope, with file paths}
- **Areas affected:** {new queries / new endpoints / consumers / hot components / new deps / unbounded loops / caching changes — list only the ones that apply}
- **Recommendation:** {"Run `/sai-7-performance {change-name}`" if Yes, else "Not required"}

---

## Accessibility Surface Triage

- **Surface touched:** {Yes / No}
- **Areas affected:** {interactive widgets / forms / navigation / media / dynamic-SPA / visual-design tokens / route announcements — list only the ones that apply, with file paths}
- **Recommendation:** {"Run `/sai-8-accessibility {change-name}`" if Yes, else "Not required"}

---

## Findings

{Under a severity heading with no findings, write `None.`}

### Critical

#### C1 — {Short title}
- **Location:** `path/to/file.ext:LINE` (or range `LINE-LINE`)
- **Category:** {Correctness | Security | Resilience | Domain Alignment | ...}
- **Problem:** {Concrete description of what is wrong and the concrete impact.}
- **Evidence:** {Quote the offending code or diff hunk if useful.}
- **Suggested fix:** {Specific change. If multiple valid options, list up to 3 with trade-offs.}
- **Spec reference:** {`proposal.md` section | `specs/{capability}/spec.md` section | "—"}

### High

#### H1 — {Short title}
- **Location:** `path/to/file.ext:LINE`
- **Category:** {…}
- **Problem:** {…}
- **Suggested fix:** {…}

### Medium

#### M1 — {Short title}
- **Location:** `path/to/file.ext:LINE`
- **Category:** {…}
- **Problem:** {…}
- **Suggested fix:** {…}

### Low

#### L1 — {Short title}
- **Location:** `path/to/file.ext:LINE`
- **Suggestion:** {one-line fix or rationale}

### Questions

#### Q1 — {Short title}
- **Location:** `path/to/file.ext:LINE` (or "general")
- **Question:** {What you need clarified and why the spec did not resolve it.}

---

## Coverage Notes

- **Files reviewed:** {count} / {count modified}
- **Files skipped:** {list any binaries, generated files, lockfiles, with reason}
- **Tests inspected:** {Yes/No — coverage assessment}
- Resilience: {No surface / Surface reviewed — affected areas with file paths, outcome, and relevant idempotency and no-existing-pattern notes. Resilience findings remain in Findings with Category Resilience; no additional audit recommendation.}

---

Summary: Critical={n} High={n} Medium={n} Low={n} Questions={n}
```
