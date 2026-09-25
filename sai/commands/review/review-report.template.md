
```markdown
# Code Review — {Feature Name}

**Change:** `openspec/changes/{change-name}/`  
**Branch reviewed:** `{current-branch}`  
**Parent branch:** `{parent-branch}`  
**Commits in scope:** {N} ({first-sha}..{last-sha})  
**Files changed:** {N}  
**Date:** {YYYY-MM-DD}

## Summary

{2–4 sentence assessment: does the change meet the spec goal, overall code health, and merge-readiness verdict.}

**Verdict:** {Ready to merge | Ready after Critical findings fixed | Needs rework}

**Findings count:** {X Critical · Y High · Z Medium · W Low · V Questions}
*(Mutation findings are folded into these counts at their mapped severity.)*

---

## Domain Alignment Check

- **Goal coverage:** {Met / Partially met / Not met} — {1 sentence justification, citing the goal from `proposal.md`}
- **Decisions respected:** {Yes / No — list any contradicted decisions with reference to `proposal.md` or `specs/{capability}/spec.md`}
- **Scope creep:** {None / List any out-of-scope changes detected in the diff}

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

## Resilience Surface Triage

- **Surface touched:** {Yes / No}
- **Areas affected:** {unbounded retries / missing timeouts / missing idempotency / absent fallback / circuit-breaker — list only the ones that apply, with file paths}
- **Notes:** {the idempotency and no-existing-pattern notes that apply}

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

## Mutation Analysis (Pass 12)

> Include this section only when Pass 12 ran. Otherwise replace the entire section body with exactly the Pass 12 outcome note recorded by the mutation step.

**Strategy:** Deterministic — `{tool}`
**Test command:** `{detected test command}`
**Mutations decided:** {totalMutations}

**Aggregate:** Killed {k} + Survived {s} + Timeout {t} + NoCoverage {n} + CompileError {c} + RuntimeError {r} + Ignored {i} = {totalMutations}
*(The canonical counts MUST sum to `totalMutations`.)*

Statuses follow the mutation step's canonical mapping. `mMUT-N` is a 1-based counter over mutation findings in this review.

### Surviving mutants

#### mMUT-1 — {Short title}
- **Location:** `path/to/file.ext:LINE` (or range `LINE-LINE`)
- **Engine status:** `{native status}`
- **Mutation class:** {NegatedCondition | ChangedOperator | RemovedCall | ChangedReturn | NegatedBoolean | InvertedBranch | OffByOne | another concise label}
- **Original:** `{unmutated code at the location, or its essence}`
- **Applied:** `{the mutated code that was applied and reverted}`
- **Result:** Survived — the test suite passed with this mutation in place.
- **Why it survives:** {one sentence referencing the missing test or untested branch}
- **Suggested fix:** {a concrete test the developer can add to catch this mutation}

### Timed-out mutants

#### mMUT-N — {Short title}
- **Location:** `path/to/file.ext:LINE` (or range `LINE-LINE`)
- **Engine status:** `{native status}`
- **Mutation class:** {NegatedCondition | ChangedOperator | RemovedCall | ChangedReturn | NegatedBoolean | InvertedBranch | OffByOne | another concise label}
- **Original:** `{unmutated code at the location, or its essence}`
- **Applied:** `{the mutated code that was applied and reverted}`
- **Result:** Timeout — the deterministic test command exceeded its configured timeout.
- **Why it is reported:** The engine did not establish a killed result within the configured time bound.
- **Suggested fix:** {a concrete test or bounded test setup that catches this mutation without timing out}

### No-coverage mutants

#### mMUT-N — {Short title}
- **Location:** `path/to/file.ext:LINE` (or range `LINE-LINE`)
- **Engine status:** `{native status}`
- **Mutation class:** {NegatedCondition | ChangedOperator | RemovedCall | ChangedReturn | NegatedBoolean | InvertedBranch | OffByOne | another concise label}
- **Original:** `{unmutated code at the location, or its essence}`
- **Applied:** `{the mutated code that was applied and reverted}`
- **Result:** NoCoverage — the deterministic engine reported no test coverage for this mutation.
- **Why it is reported:** The engine did not establish a test execution that reached the mutation; no result was inferred.
- **Suggested fix:** {a concrete test that exercises the mutated location}

### Engine impediments

> Engine results that do not establish a surviving or killed mutant. Each still appears here with its native status to preserve deterministic visibility.

#### Engine result N — {CompileError | RuntimeError | Ignored}
- **Engine status:** `{native status}` ({CompileError | RuntimeError | Ignored})
- **Location:** `path/to/file.ext:LINE` (or the engine-reported location)
- **Result:** Deterministic engine impediment. No mutation result was inferred.

**Severity roll-up:** each `Survived`, `Timeout`, and `NoCoverage` mutation counts as **High**. Engine impediments do not become product findings or receive an inferred severity.

---

## Coverage Notes

- **Files reviewed:** {count} / {count modified}
- **Files skipped:** {list any binaries, generated files, lockfiles, with reason}
- **Tests inspected:** {Yes/No — coverage assessment}

---

## Next Steps

- {Ordered list of recommended actions for the user, e.g. "Fix C1, C2 → re-run review" / "Open question Q1 with team before merge"}
Summary: Critical={n} High={n} Medium={n} Low={n} Questions={n}
```
