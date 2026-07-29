
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

**Verdict:** {Ready to merge | Ready after Blockers fixed | Needs rework}

**Findings count:** {X Blockers · Y Major · Z Minor · W Questions}
*(Mutation Analysis severities are folded into these counts: each surviving / pre-check-failed mutation is a Major, each revert-failed mutation is a Blocker.)*

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

- **Surface touched:** {Yes / No — Yes if diff contains UI files: `.tsx`/`.jsx`/`.astro`/`.html`/`.vue`/`.svelte`/`.css` or component-bearing markdown}
- **Areas affected:** {interactive widgets / forms / navigation / media / dynamic-SPA / visual-design tokens / route announcements — list only the ones that apply, with file paths}
- **Recommendation:** {"Run `/sai-8-accessibility {change-name}`" if Yes, else "Not required"}

---

## Findings

### Blockers

#### B1 — {Short title}
- **Location:** `path/to/file.ext:LINE` (or range `LINE-LINE`)
- **Category:** {Correctness | Security | Domain Alignment | ...}
- **Problem:** {Concrete description of what is wrong and the concrete impact.}
- **Evidence:** {Quote the offending code or diff hunk if useful.}
- **Suggested fix:** {Specific change. If multiple valid options, list up to 3 with trade-offs.}
- **Spec reference:** {`proposal.md` section | `specs/{capability}/spec.md` section | "—"}

### Major

#### M1 — {Short title}
- **Location:** `path/to/file.ext:LINE`
- **Category:** {…}
- **Problem:** {…}
- **Suggested fix:** {…}

### Minor

#### m1 — {Short title}
- **Location:** `path/to/file.ext:LINE`
- **Suggestion:** {one-line fix or rationale}

### Questions

#### Q1 — {Short title}
- **Location:** `path/to/file.ext:LINE` (or "general")
- **Question:** {What you need clarified and why the spec did not resolve it.}

---

## Mutation Analysis (Pass 11)

> Include this section only when pass 11 ran. If the activation gate was not met, or no test command could be detected, replace the entire section body with the single skipped note below and emit no mutation findings:
>
> *Mutation Analysis (Pass 11): skipped — {no testable production code in diff | repository has no test files | no test command could be detected}. No mutation findings.*

**Strategy:** {Tier 1 — `{tool}` | Tier 2 — LLM-as-mutator}  
**Test command:** `{detected test command}`  
**Mutations decided:** {totalMutations}

**Aggregate:** survived {s} + killed {k} + pre-check-failed {p} + revert-failed {r} = {totalMutations}
*(This identity MUST hold: `survived + killed + preCheckFailed + revertFailed == totalMutations`. Every mutation the main agent decided on appears below — killed ones internally only — even when an impediment prevented testing.)*

Killed mutations produce no finding (internal only). Surviving mutants and impediment outcomes are listed below under the `mMUT-N` namespace (N is a 1-based counter over the mutation findings in this review).

### Surviving mutants

#### mMUT-1 — {Short title}
- **Location:** `path/to/file.ext:LINE` (or range `LINE-LINE`)
- **Mutation class:** {NegatedCondition | ChangedOperator | RemovedCall | ChangedReturn | NegatedBoolean | InvertedBranch | OffByOne | another concise label}
- **Original:** `{unmutated code at the location, or its essence}`
- **Applied:** `{the mutated code that was applied and reverted}`
- **Result:** Survived — the test suite passed with this mutation in place.
- **Why it survives:** {one sentence referencing the missing test or untested branch}
- **Suggested fix:** {a concrete test the developer can add to catch this mutation}

### Impediments

> Mutations that could not be tested. Each still appears here to preserve the full-visibility invariant.

#### mMUT-N — pre-check-failed (Major)
- **Location:** `path/to/file.ext:LINE`
- **Result:** Could not test {file}: uncommitted changes. Commit or undo and re-run review.

#### mMUT-N — revert-failed (Blocker)
- **Location:** `path/to/file.ext:LINE`
- **Result:** Revert verification failed — `git diff {file}` was non-empty after `git checkout -- {file}`. Working tree left polluted.

> Whenever any mutation is revert-failed, ALSO print this critical warning to the user (in chat, outside the report file):
>
> **⚠️ CRITICAL — working tree polluted:** the file `{file}` could not be reverted after mutation `mMUT-N`. Inspect and restore it manually (`git diff {file}`, then `git checkout -- {file}`) before relying on the working tree.

**Severity roll-up:** each surviving and pre-check-failed mutation counts as a **Major**, and each revert-failed mutation counts as a **Blocker**, in the Findings count and Verdict above — exactly like any other finding of that severity.

---

## Coverage Notes

- **Files reviewed:** {count} / {count modified}
- **Files skipped:** {list any binaries, generated files, lockfiles, with reason}
- **Tests inspected:** {Yes/No — coverage assessment}

---

## Next Steps

- {Ordered list of recommended actions for the user, e.g. "Fix B1, B2 → re-run review" / "Open question Q1 with team before merge"}
```

