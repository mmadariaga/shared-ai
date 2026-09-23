# Review Step — Close Review Outcome

Active step: close-review-outcome. The step is done when `review.md` is saved and verified per the worker contract and `completed` is returned with the summary below.

Fetch @sai/commands/review/review-report.template.md

## 1. Classify

Assign each finding one severity:

- **Critical** — must be fixed before merge: bugs, security holes, broken builds, contract violations, contradictions of the change artifacts.
- **High** — should be fixed before merge: significant maintainability, performance, or test-coverage issues that will hurt soon.
- **Medium** — a moderate maintainability, performance, or test-coverage concern that leaves merge-readiness intact but should be addressed soon.
- **Low** — nice to fix: naming, small refactors, low-impact polish.
- **Question** — genuine uncertainty that needs the user's input; reserve it for that.

Resilience findings take the severity rule of pass 11 in the analysis step. Mutation findings (`mMUT-N`) keep the severity the mutation step mapped.

## 2. Draft

Draft the report in memory from the template. Derive `{Feature Name}` from the change name in title case (`oauth2-auth` → `OAuth2 Auth`).

## 3. Challenge the draft

Mutation findings come from the engine's real execution and stay as mapped. When the draft has no other finding, go to step 4. Otherwise dispatch exactly one `budget-explorer` adversary to discard false positives and correct severity:

- **Input** — per finding only: identifier (`C1`/`H1`/`M1`/`L1`/`Q1`), `file:line`, category, and a one-line problem statement. The adversary reads the code from disk itself; send no diff, raw code, or report text.
- **Scope** — this diff's findings only; decisions recorded in `proposal.md`, `design.md`, and `specs/**/*.md` stay settled.
- **Output contract** — per finding: `identifier`, `verdict` (`keep` | `discard` | `downgrade-to-High` | `downgrade-to-Medium` | `downgrade-to-Low`), and `why` (≤40 words: what is wrong with the finding and why the verdict follows). No raw code or diff excerpts; ≤800 words in total.

You have the last word: accept or reject each verdict on its own. The report shows only the outcome — a discarded finding is absent, an accepted downgrade appears at its final severity — with no trace of the dispute. When the dispatch fails, times out, or returns a malformed report, keep your own findings and continue.

## 4. Save and return

Save the report to `openspec/changes/{change-name}/review.md`, with the closing `Summary:` tally counted over the kept findings at final severity. Verify it per the worker contract, then return `completed`. Its `summary` carries the severity counts, the top three Critical findings when present, the report path, the parent-branch statement, and this block verbatim, with every line resolved from the triage passes:

```
## Recommended Audits
Security     → { ⚠️  Run `/sai-6-security {change-name}` | ✅ Not required }
Performance  → { ⚠️  Run `/sai-7-performance {change-name}` | ✅ Not required }
Accessibility→ { ⚠️  Run `/sai-8-accessibility {change-name}` | ✅ Not required }
```

The coordinator owns everything the user sees after that return, including any fix of these findings.
