# Security Step — Close Security Outcome

Active step: close-security-outcome. The step is done when `security.md` is saved and verified per the worker contract and `completed` is returned with the worker contract's summary.

Fetch @sai/commands/security/security-report.template.md

## 1. Draft

Draft the report in memory from the template. Derive `{Feature Name}` from the change name in title case.

## 2. Self-critique

Check the draft before it goes further:

1. **Taint coverage** — every external input source identified in Phase 1 was traced to at least one sink (or silently ignored as clean).
2. **Evidence completeness** — every SAST finding has `file:line` + trace; every SCA finding has CVE + version range.
3. **No speculative findings** — every exploit scenario describes the current code, not a hypothetical future change.
4. **Spec respect** — no finding contradicts a decision recorded in the change artifacts without being marked *Acknowledged*.
5. **Conciseness** — sections without content were omitted entirely.
6. **Severity floor** — no findings below Low severity were included in the report. Informational-level observations are omitted.
7. **Identifiers and tally** — every finding heading leads with its severity-prefixed identifier, and the closing `Summary:` line counts match the report's findings.

## 3. Challenge the draft

When the draft has no finding, go to step 4. Otherwise dispatch exactly one `budget-explorer` adversary to discard false positives and correct severity:

- **Input** — per finding only: identifier (`C1`/`H1`/`M1`/`L1`), `file:line`, taint flow (`source` → `propagation` → `sink`) for SAST or CVE + version range for SCA, and a one-line exploit scenario. The adversary reads the code from disk itself; send no diff, raw code, or report text.
- **Scope** — this diff's findings only; decisions recorded in `proposal.md`, `design.md`, and `specs/**/*.md` stay settled.
- **Output contract** — per finding: `identifier`, `verdict` (`keep` | `discard` | `downgrade-to-High` | `downgrade-to-Medium` | `downgrade-to-Low`), and `why` (≤40 words: what is wrong with the finding and why the verdict follows). No raw code or diff excerpts; ≤800 words in total.

You have the last word: accept or reject each verdict on its own. The report shows only the outcome — a discarded finding is absent, an accepted downgrade appears at its final severity — with no trace of the dispute. When the dispatch fails, times out, or returns a malformed report, keep your own findings and continue.

## 4. Save and return

Save the report to `openspec/changes/{change-name}/security.md`, with the closing `Summary:` tally counted over the kept findings at final severity. Verify it per the worker contract, then return `completed` with the summary the worker contract defines. The coordinator owns everything the user sees after that return, including any fix of these findings.
