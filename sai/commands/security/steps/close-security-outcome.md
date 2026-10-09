# Security Step — Close Security Outcome

Active step: close-security-outcome. The step is done when `security.md` is saved, verified in its form, and `completed` is returned with the summary defined below.

Fetch @sai/commands/security/security-report.template.md

## 1. Draft

Draft the report in memory from the template. Derive `{Feature Name}` from the change name in title case. The scan type names the analyses that ran.

When `discover-module-map` decided the audit does not apply, draft the Not Applicable report — the provenance line and the `## Not Applicable` section with its justification — and go to step 4.

## 2. Check the draft

Check the draft against the hard rules and the severity taxonomy in `common.md`, and correct each violation.

## 3. Challenge the draft

When the draft has no finding, go to step 4. Otherwise dispatch exactly one `budget-explorer` adversary to discard false positives and correct severity:

- **Input** — per finding only: identifier (`C1`/`H1`/`M1`/`L1`), `file:line`, taint flow (`source` → `propagation` → `sink`) for SAST or CVE + version range for SCA, and a one-line exploit scenario. The adversary reads the code from disk itself; send no diff, raw code, or report text.
- **Scope** — this diff's findings only; decisions recorded in `proposal.md`, `design.md`, and `specs/**/*.md` stay settled.
- **Output contract** — per finding: `identifier`, `verdict` (`keep` | `discard` | `downgrade-to-High` | `downgrade-to-Medium` | `downgrade-to-Low`), and `why` (≤40 words: what is wrong with the finding and why the verdict follows). No raw code or diff excerpts; ≤800 words in total.

You have the last word: accept or reject each verdict on its own. The report shows only the outcome — a discarded finding is absent, an accepted downgrade appears at its final severity — with no trace of the dispute. When the dispatch fails, times out, or returns a malformed report, keep your own findings and continue.

## 4. Save, verify, and return

Save the report to `openspec/changes/{change-name}/security.md`; a normal report closes with the `Summary:` tally counted over the kept findings at final severity. Verify the saved file in its form:

- **Normal report** — the file exists and is non-empty, carries the provenance line, every finding heading leads with its severity-prefixed identifier, and the `Summary:` tally matches the report's findings.
- **Not Applicable report** — the file carries the provenance line and the `## Not Applicable` section with its justification.

Then return `completed`. The summary holds the severity counts, up to three Critical/High findings when present, the report path, and the selected parent branch; for a Not Applicable report the justification replaces the counts and findings. `changed_files` is `openspec/changes/{change-name}/security.md`. Return no report contents. The coordinator owns everything the user sees after that return, including any fix of these findings.
