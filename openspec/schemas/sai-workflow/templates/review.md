# Code Review — <!-- Feature Name -->

**Spec:** `openspec/changes/<change-name>/proposal.md`  
**Branch reviewed:** `<current-branch>`  
**Parent branch:** `<parent-branch>`  
**Commits in scope:** <!-- N (first-sha..last-sha) -->  
**Files changed:** <!-- N -->  
**Date:** <!-- YYYY-MM-DD -->

## Summary

<!-- 2-4 sentence assessment: does the change meet the spec goal, overall code health, merge-readiness verdict. -->

**Verdict:** <!-- Ready to merge | Ready after Blockers fixed | Needs rework -->

**Findings count:** <!-- X Blockers · Y Major · Z Minor · W Questions -->

---

## Domain Alignment Check

- **Goal coverage:** <!-- Met / Partially met / Not met — 1 sentence justification -->
- **Decisions respected:** <!-- Yes / No — list any contradicted decisions -->
- **Scope creep:** <!-- None / list out-of-scope changes -->

---

## Security Surface Triage

- **Surface touched:** <!-- Yes / No -->
- **Areas affected:** <!-- auth / input parsing / dynamic queries / crypto / HTTP boundary / deps / logging -->
- **Recommendation:** <!-- "Run /sai-6-security <change-name>" if Yes, else "Not required" -->

---

## Performance Surface Triage

- **Surface touched:** <!-- Yes / No -->
- **Tiers affected:** <!-- backend / frontend / db / queue -->
- **Areas affected:** <!-- new queries / new endpoints / consumers / hot components / new deps / unbounded loops / caching -->
- **Recommendation:** <!-- "Run /sai-7-performance <change-name>" if Yes, else "Not required" -->

---

## Accessibility Surface Triage

- **Surface touched:** <!-- Yes / No — Yes if diff contains .tsx/.jsx/.astro/.html/.vue/.svelte/.css -->
- **Areas affected:** <!-- interactive widgets / forms / navigation / media / dynamic-SPA / visual-design tokens -->
- **Recommendation:** <!-- "Run /sai-8-accessibility <change-name>" if Yes, else "Not required" -->

---

## Mutation Analysis (Pass 11)

- **Status:** <!-- Ran / Skipped — skipped when the diff has no testable production code OR the repo has no test file -->
- **Tool:** <!-- detected tool (Stryker/PIT/mutmut/...) / LLM-as-mutator / — if skipped -->
- **Counts:** <!-- survived / killed / pre-check-failed / revert-failed (must sum to total decided) -->

<!-- Surviving mutants are emitted as Major findings identified mMUT-N below.
     Revert-failed mutants are Blockers. If Status is Skipped, state why and emit no mutation findings. -->

---

## Findings

### Blockers

#### B1 — <!-- Short title -->
- **Location:** `path/to/file.ext:LINE`
- **Category:** <!-- Correctness | Security | Domain Alignment | ... -->
- **Problem:** <!-- Concrete description and impact -->
- **Evidence:** <!-- Quote offending code or diff hunk -->
- **Suggested fix:** <!-- Specific change with trade-offs if multiple options -->
- **Spec reference:** <!-- spec section if relevant, otherwise — -->

### Major

#### M1 — <!-- Short title -->
- **Location:** `path/to/file.ext:LINE`
- **Category:** <!-- ... -->
- **Problem:** <!-- ... -->
- **Suggested fix:** <!-- ... -->

<!-- Surviving-mutant row (Pass 11) — one per surviving mutation, N = 1-based counter:
#### mMUT-1 — <!-- Short title -->
- **Location:** `path/to/file.ext:LINE`
- **Mutation class:** <!-- NegatedCondition | ChangedOperator | RemovedCall | ChangedReturn | ... -->
- **Original:** <!-- unmutated code at the location -->
- **Applied:** <!-- mutated code that was applied and reverted -->
- **Result:** <!-- mutation survived the test suite -->
- **Why it survives:** <!-- the missing test or untested branch -->
- **Suggested fix:** <!-- concrete test to add that catches this mutation --> -->

### Minor

#### m1 — <!-- Short title -->
- **Location:** `path/to/file.ext:LINE`
- **Suggestion:** <!-- one-line fix or rationale -->

### Questions

#### Q1 — <!-- Short title -->
- **Location:** `path/to/file.ext:LINE` (or "general")
- **Question:** <!-- What needs clarification and why the spec did not resolve it -->

---

## Coverage Notes

- **Files reviewed:** <!-- count / count modified -->
- **Files skipped:** <!-- binaries, generated files, lockfiles — with reason -->
- **Tests inspected:** <!-- Yes/No — coverage assessment -->

---

## Next Steps

- <!-- Ordered list of recommended actions -->
