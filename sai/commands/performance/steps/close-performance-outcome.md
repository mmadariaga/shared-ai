# Performance Step — Close Performance Outcome

Active step: close-performance-outcome. The step is done when `performance.md` is saved and verified per the worker contract and `completed` is returned with the worker contract's summary.

Fetch @sai/commands/performance/performance-report.template.md

## 1. Draft

Draft the report in memory from the template. Derive `{Feature Name}` from the change name in title case.

## 2. Self-critique

Check the draft before it goes further:

1. **Coverage** — every tier in scope was evaluated; clean ones say "No instances detected".
2. **Evidence completeness** — every finding has location + symptom + evidence + remediation + validation method.
3. **Severity sanity** — Critical/High findings have measured impact, not just heuristic concern.
4. **No fabricated metrics** — if a number was not actually measured, mark it as "estimated — verify with X".
5. **Spec respect** — no finding contradicts a decision recorded in the change artifacts without being marked *Acknowledged*.
6. **Validation plan present** — every Critical/High finding has a re-measurement step.
7. **Identifiers and tally** — every finding heading leads with its severity-prefixed identifier, and the closing `Summary:` line counts match the report's findings.

## 3. Challenge the draft

When the draft has no finding, go to step 4. Otherwise dispatch exactly one `budget-explorer` adversary to discard false positives and correct severity:

- **Input** — per finding only: identifier (`C1`/`H1`/`M1`/`L1`/`I1`), location, measured metric plus baseline reference, and a one-line validation method. The adversary reads the code from disk itself; send no diff, raw code, or report text.
- **Scope** — this diff's findings only; decisions recorded in `proposal.md`, `design.md`, and `specs/**/*.md` stay settled.
- **Output contract** — per finding: `identifier`, `verdict` (`keep` | `discard` | `downgrade-to-High` | `downgrade-to-Medium` | `downgrade-to-Low` | `downgrade-to-Informational`), and `why` (≤40 words: what is wrong with the finding and why the verdict follows). No raw code, diff excerpts, or fabricated numbers; ≤800 words in total.

You have the last word: accept or reject each verdict on its own. The report shows only the outcome — a discarded finding is absent, an accepted downgrade appears at its final severity — with no trace of the dispute. When the dispatch fails, times out, or returns a malformed report, keep your own findings and continue.

## 4. Save and return

Save the report to `openspec/changes/{change-name}/performance.md`, with the closing `Summary:` tally counted over the kept findings at final severity. Verify it per the worker contract, then return `completed` with the summary the worker contract defines. The coordinator owns everything the user sees after that return, including any fix of these findings.
