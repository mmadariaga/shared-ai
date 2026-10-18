# Review Step — Close Review Outcome

Active step: close-review-outcome. The step is done when `review.md` is saved, passes the verification in step 4, and the `completed` result below is returned.

Fetch @sai/commands/review/review-report.template.md

The template is the single source of the report format, read in place: `/sai-3-implement` consumes the reports of both review commands, so no copy of it exists here.

## 1. Classify

Assign each finding its severity per `common.md` § Severity.

## 2. Draft

Draft the report in memory from the template. Derive `{Feature Name}` from the change name in title case (`oauth2-auth` → `OAuth2 Auth`).

## 3. Challenge the draft

When the draft has no finding, go to step 4. Otherwise dispatch exactly one `budget-explorer` adversary to discard false positives and correct severity:

- **Input** — per finding only: identifier (`C1`/`H1`/`M1`/`L1`/`Q1`), `file:line`, category, and a one-line problem statement. The adversary reads the code from disk itself; send no diff, raw code, or report text.
- **Scope** — this diff's findings only; decisions recorded in `proposal.md`, `design.md`, and `specs/**/*.md` stay settled.
- **Output contract** — per finding: `identifier`, `verdict` (`keep` | `discard` | `downgrade-to-High` | `downgrade-to-Medium` | `downgrade-to-Low`), and `why` (≤40 words: what is wrong with the finding and why the verdict follows). No raw code or diff excerpts; ≤800 words in total.

You have the last word: accept or reject each verdict on its own. The report shows only the outcome — a discarded finding is absent, an accepted downgrade appears at its final severity — with no trace of the dispute. When the dispatch fails, times out, or returns a malformed report, keep your own findings and continue.

## 4. Save and return

Save the report to `openspec/changes/{change-name}/review.md`, with the closing `Summary:` tally counted over the kept findings at final severity. Before returning `completed`, verify that `review.md` exists, is non-empty, and carries an identifier on every finding, the three `Surface touched` lines, and a closing `Summary:` tally whose counts match its findings. Then return `completed`: `review_path` is the report path, `counts` the severity counts of the `Summary:` tally, `changed_files` the report path alone, and `summary` carries the severity counts, the top three Critical findings when present, the report path, and the parent-branch statement. `recommended_audits` carries this block verbatim, with every line resolved from the triage passes:

```
## Recommended Audits
Security     → { ⚠️  Run `/sai-5-security {change-name}` | ✅ Not required }
Performance  → { ⚠️  Run `/sai-6-performance {change-name}` | ✅ Not required }
Accessibility→ { ⚠️  Run `/sai-7-accessibility {change-name}` | ✅ Not required }
```

The coordinator verifies the report again, commits it, and owns everything the user sees after that return. You fix none of these findings: `/sai-3-implement` applies them.
