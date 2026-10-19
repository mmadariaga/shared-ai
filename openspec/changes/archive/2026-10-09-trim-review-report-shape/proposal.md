> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

`review.md` carried fields that no command, tool, or person reads: the Verdict, the Findings count, the Summary paragraph, the triage `Areas affected` / `Tiers affected` / `Recommendation` lines, the per-finding `Category` / `Evidence` / `Spec reference` fields, and the whole Coverage Notes section with its `Resilience:` line. The review worker spent effort and context writing them. The report's only consumers are `/sai-3-implement` audit ingestion, the Direct Build close, the `/sai-review` triage, and `/to-pr`. The report now follows one rule: carry only what a consumer reads.

## What Changes

- `sai/commands/review/review-report.template.md`: the header becomes one provenance line, `**Reviewed:** `{parent-branch}` {first-sha}..{last-sha} · {YYYY-MM-DD}`. The Summary paragraph, `Verdict`, `Findings count`, the triage `Areas affected`, `Tiers affected` and `Recommendation` lines, the finding fields `Category`, `Evidence` and `Spec reference`, and the whole Coverage Notes section with its `Resilience:` line are removed. Each triage section keeps only `**Surface touched:** {Yes / No}`. Every finding keeps its `#### <ID> — {Short title}` heading. Critical, High, Medium and Low findings use `Location`, `Problem` and `Suggested fix`; Low replaces `Suggestion` with them. A code quote, when it helps, goes inside `Problem`. The closing `Summary:` tally is unchanged.
- `openspec/schemas/sai-workflow/templates/review.md`: the schema scaffold gets the same top-level headings and the same provenance line. Its Summary and Coverage Notes sections are removed.
- `sai/commands/review/steps/resolve-review-analysis.md`: the completion criterion names the three surface outcomes and the findings list, with the eleven passes applied to every changed file. One silent-pass rule ("A pass with nothing to report stays silent") replaces the per-pass records: the pass 9 "record the pass as skipped" and the pass 11 Coverage Notes recording. Pass 1 reports an uncovered goal or acceptance criterion as a finding with severity by impact, and scope creep as a `Question`. Each gap or addition is reported once, and one that contradicts a recorded decision is reported as that contradiction. Passes 3, 4 and 5 decide `surface touched: yes/no` without listing files. Resilience findings are ordinary findings.
- `sai/commands/review/steps/close-review-outcome.md`: this step alone holds the verification before `completed`. It checks that `review.md` exists and is non-empty, that every finding has an identifier, that the three `Surface touched` lines are present, and that the closing `Summary:` tally matches the findings.
- `sai/commands/review/worker.md`: the verification list is removed; the worker points to the close step.
- `AGENTS.md`: the sentence that described the Summary, the Coverage Notes and the recording of goal coverage and scope creep is deleted.
- `test/report-template-authority.test.js` and `test/review-coordinator-worker.test.js`: the assertions now pin the new shape and the retired text.

Pass 1 output is the only behavior change. The `## Recommended Audits` block in the worker's `completed` summary is unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `review-phase-worker`: the review artifact shape and its verification, Domain Alignment output through findings, the silent-pass rule, and triage passes that decide the surface without listing files.
- `instruction-output-templates`: the review report contract and the parity between the review template and its scaffold.
- `resilience-pass`: Resilience findings are ordinary findings without a Category field, and no outcome is recorded in Coverage Notes.
- `resilience-check`: a diff without resilience surface yields no findings and leaves nothing in the report; the `Resilience:` Coverage Notes line is retired.

## Impact

Modified files:
- `AGENTS.md`
- `openspec/schemas/sai-workflow/templates/review.md`
- `sai/commands/review/review-report.template.md`
- `sai/commands/review/steps/close-review-outcome.md`
- `sai/commands/review/steps/resolve-review-analysis.md`
- `sai/commands/review/worker.md`
- `test/report-template-authority.test.js`
- `test/review-coordinator-worker.test.js`

New files: none.

No migration: archived changes and existing `review.md` files are not touched. The security, performance and accessibility reports, the shared severity vocabulary, thresholds, dispatch caps, the eleven passes, the adversary dispatch, the fixed stop texts, pass 6, and shared policies and orchestration files are unchanged.

Known limitations: scope creep reported as a `Question` is auto-discarded by `/sai-3-implement` audit ingestion and is not eligible for a Direct Build fix, so keeping or removing it stays a human decision. The "every pass applied to every changed file" clause of the analysis completion criterion stays uncheckable.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Proposal Research Documentation

**Local files**:
- `sai/commands/review/review-report.template.md`
- `openspec/schemas/sai-workflow/templates/review.md`
- `sai/commands/review/steps/resolve-review-analysis.md`
- `sai/commands/review/steps/close-review-outcome.md`
- `sai/commands/review/worker.md`
- `sai/commands/meta-review/findings-selection.md`
- `sai/commands/meta-review/command-bootstrap.md`
- `sai/commands/implement/steps/audit-ingestion.md`
- `sai/tools/to-pr.js`
- `test/report-template-authority.test.js`
- `test/review-coordinator-worker.test.js`
- `AGENTS.md`

**External URLs**:
- https://github.com/mmadariaga/shared-ai/issues/61
- https://github.com/mmadariaga/shared-ai/issues/69

## Request Additional Notes

Follow-up outside this change: after a Direct Build fix, `review.md` still lists the findings that were fixed, so `/sai-3-implement` and `/to-pr` cannot tell which remain; it was agreed to handle this in a separate change. Pass 6 citing the Code Quality Priority Stack in a file the review worker never loads is tracked in https://github.com/mmadariaga/shared-ai/issues/69. Source issue: https://github.com/mmadariaga/shared-ai/issues/61.
