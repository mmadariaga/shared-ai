# Accessibility Step — Close Accessibility Outcome

Active step: close-accessibility-outcome. Produce and verify the accessibility report, then return your terminal result per the worker contract.

### Step Final: Produce the Accessibility Report

1. Draft using the output template loaded below.
2. Save to: `openspec/changes/{change-name}/accessibility.md` (derive `{feature-name}` from the change name: convert kebab-case to title case).
3. Present in chat: severity counts, top 3 Critical/High findings, path to saved file.
4. **Pause for feedback.** Do not modify code. Fixes are a follow-up implementation pass.

## Output Template

Fetch @sai/commands/accessibility/accessibility-report.template.md

## Self-Critique Before Saving

Before writing the report, verify:
1. **Coverage** — every static phase was evaluated; clean ones say "No instances detected".
2. **WCAG mapping** — every finding has a specific SC code + level. No "general best practice" without anchor.
3. **Severity sanity** — Critical reserved for Level A failures or task-blocking issues; not for AAA aspirations.
4. **Spec respect** — no finding contradicts a decision recorded in the change artifacts without being marked *Acknowledged*.
5. **Re-test checklist present** — reflects the actual flows touched in the diff.
6. **Framework idiom respected** — React fixes use hooks/refs; Astro fixes account for hydration; Tailwind fixes use utilities or theme tokens.
7. **Identifiers and tally** — every finding heading leads with its severity-prefixed identifier, and the closing `Summary:` line counts match the report's findings.

## Adversarial Findings Check Before Saving

Run this hook between the in-memory draft and the save. It challenges findings to discard false positives and correct severity:
- If the draft has zero findings, skip the adversary and close normally (E1).
- Otherwise dispatch exactly one `budget-explorer` subagent (one call per run; no retries beyond the shared bounded-dispatch-retry budget). The subagent receives only the in-memory findings list — per finding: identifier (`C1`/`H1`/`M1`/`L1`/`I1`), `file:line` or selector, exact WCAG SC code + level anchor, and a one-line barrier description. Do not package the diff, raw code blocks, or the full report text. The subagent reads from disk on demand for verification.
- Adversary scope is the current diff's findings only — never re-litigate spec or design decisions recorded in `proposal.md`, `design.md`, or `specs/**/*.md` (E6).
- Output contract (exact fields, no raw content): per finding `identifier`, `verdict` (`keep` | `discard` | `downgrade-to-High` | `downgrade-to-Medium` | `downgrade-to-Low` | `downgrade-to-Informational`), and `why` (≤40 words, what is wrong with the finding and why the verdict follows). No raw code blocks, no diff excerpts, total report ≤800 words.
- The worker has the last word: accept or reject each verdict independently. Discards and rejected downgrade proposals stay invisible — never mentioned in the artifact, no audit trail of the dispute (E2). Accepted downgrades appear only at final severity with no mention of the change (E3). Recompute the closing `Summary:` tally over kept findings at final severity only; no template changes for discards.
- On subagent failure (dispatch failure, malformed report, or timeout), close with the worker's own findings without blocking (E4).
