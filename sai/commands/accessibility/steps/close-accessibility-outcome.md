# Accessibility Step — Close Accessibility Outcome

Active step: close-accessibility-outcome. The step is done when `accessibility.md` is saved and verified and `completed` is returned with the summary defined below.

Fetch @sai/commands/accessibility/accessibility-report.template.md

## 1. Draft

Draft the report in memory from the template. Derive `{Feature Name}` from the change name in title case.

When the scope held no UI file, draft the Not Applicable report — the header and the `## Not Applicable` section with its justification, every other section omitted — and go to step 4.

## 2. Self-critique

Check the draft before it goes further:

1. **Coverage** — every static phase was evaluated; clean ones say "No instances detected".
2. **WCAG mapping** — every finding has a specific SC code + level. No "general best practice" without anchor.
3. **Severity sanity** — Critical reserved for Level A failures or task-blocking issues; not for AAA aspirations.
4. **Spec respect** — no finding contradicts a decision recorded in the change artifacts without being marked *Acknowledged*.
5. **Re-test checklist present** — reflects the actual flows touched in the diff.
6. **Framework idiom respected** — fixes follow the idioms of the `frameworks detected`.
7. **Identifiers and tally** — every finding heading leads with its severity-prefixed identifier, and the closing `Summary:` line counts match the report's findings.

## 3. Challenge the draft

When the draft has no finding, go to step 4. Otherwise dispatch exactly one `budget-explorer` adversary to discard false positives and correct severity:

- **Input** — per finding only: identifier (`C1`/`H1`/`M1`/`L1`/`I1`), `file:line` or selector, exact WCAG SC code + level anchor, and a one-line barrier description. The adversary reads the code from disk itself; send no diff, raw code, or report text.
- **Scope** — this diff's findings only; decisions recorded in `proposal.md`, `design.md`, and `specs/**/*.md` stay settled.
- **Output contract** — per finding: `identifier`, `verdict` (`keep` | `discard` | `downgrade-to-High` | `downgrade-to-Medium` | `downgrade-to-Low` | `downgrade-to-Informational`), and `why` (≤40 words: what is wrong with the finding and why the verdict follows). No raw code or diff excerpts; ≤800 words in total.

You have the last word: accept or reject each verdict on its own. The report shows only the outcome — a discarded finding is absent, an accepted downgrade appears at its final severity — with no trace of the dispute. When the dispatch fails, times out, or returns a malformed report, keep your own findings and continue.

## 4. Save, verify, and return

Save the report to `openspec/changes/{change-name}/accessibility.md`, with the closing `Summary:` tally and the Executive Summary table counted over the kept findings at final severity. Verify the saved file in its form:

- **Normal report** — the file exists and is non-empty, carries the WCAG 2.2 AA scope, the five-severity table and the `Summary:` tally matching the findings, the clean-category statements, the accepted trade-offs, the runtime-tools-used statement, the pending manual checks, and the re-test checklist; every finding heading leads with its severity-prefixed identifier.
- **Not Applicable report** — the file carries the header and the `## Not Applicable` section with its justification.

Then return `completed`. The summary holds the severity counts, up to three Critical/High findings when present, the report path, and the selected parent branch or the no-UI and static-only state; for a Not Applicable report the justification replaces the counts and findings. `report_path` and `changed_files` name `openspec/changes/{change-name}/accessibility.md`, and `counts` are the tally of the kept findings (all zero for a Not Applicable report). Return no report contents. The coordinator verifies and commits the report, and owns everything the user sees after that return, including any fix of these findings.
