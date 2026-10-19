> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

The `/sai-7-performance` report carried sections that no command or tool reads. Four of them repeated the findings: Executive Summary, Hot Paths in Scope, Observability Gaps, and Prioritized Remediation Plan. The Validation Plan also had no reader. The performance worker files restated the same rules three and four times. One rule required measured impact for Critical/High findings, but only an optional, user-authorized diagnostics step could produce a measurement. Diagnostics could also ask a question mid-run, which prevents `/sai-review` from running the performance segment unattended. This is a follow-up to GitHub issue #64 (parent #30, siblings #61 and #63).

## What Changes

- `sai/commands/performance/performance-report.template.md` now defines a single provenance line (`**Scope:** {…} · **Tiers:** {…} · **Baseline:** {…} · **Date:** {YYYY-MM-DD}`). It also adds the rule "Write a section only when it has content" and the rule that every number in a finding is measured or carries the mark `estimated — verify with {method}`; a Critical or High finding may carry estimated numbers. It defines a Not Applicable report: title, provenance line, and `## Not Applicable` with a justification, with no findings and no tally. The findings, the optional Acknowledged Trade-offs, and the closing `Summary:` tally remain. Executive Summary (severity table, verdict, risk posture, clean categories), Hot Paths in Scope, Observability Gaps, Prioritized Remediation Plan, and Validation Plan are removed. `Observability` joins the finding Category examples.
- `openspec/schemas/sai-workflow/templates/performance.md` follows the same heading sequence and provenance line.
- `sai/commands/performance/steps/common.md` states each rule once. One `Hard Rules` section holds **Evidence**, **Acknowledged**, and **Write limit** ("The only file written is `openspec/changes/{change-name}/performance.md`" plus the full prohibition list), followed by the identifier and tally rule, which now says a Not Applicable report has no findings and no tally. The severity table drops its Numeric column. `--tier` and `--runtime` are parsed in § Scope, and § Scope now defines the **selected scope**. The "No instances detected" rule and the Remember block are removed. § Communication Mode points to the template for report shape, finding fields, and the number rule.
- `sai/commands/performance/worker.md` has three sections: Change Resolution and Proposal Gate, `## Steps`, and Continuation and Reconstruction. Its grammar accepts `--runtime`. With no active changes, it returns `failed` with the exact text "No active changes found. Run `/sai-1-spec` to create one." `## Steps` lists the five unchanged step ids and labels, with the batch that reports each one. The pre-completion check and the summary rules move to the close step.
- Each step file opens with a checkable "The step is done when …" criterion. `map-stack-hot-paths` requires every file of the selected scope to be assigned a tier or recorded as having no performance surface. It is the single source of the 500-LOC cutover and of the eight-`budget-explorer` cap, which covers file inspections and context lookups together. It decides the Not Applicable case (empty diff, or no performance surface after `--tier`). The "Phase N" names are replaced by step ids.
- The backend, frontend, db, and queue checklists move verbatim to `sai/commands/performance/checklists/{backend,frontend,db,queue}.md`. `audit-performance-tiers` fetches the checklist of each tier in the selected scope, keeps the cross-cutting checklist, and states that without `--runtime`, `resolve-diagnostics` is reported in the same progress event, with no question asked.
- `resolve-diagnostics` runs only with `--runtime`. It resolves the gate in one of three ways: an authorized run, the user's skip, or no diagnostic that would firm up a finding. It states the read-only, bounded measurement mode. A measured number replaces the estimate it firms up.
- `close-performance-outcome` checks the draft for report shape, finding fields, the number rule, spec respect, and identifiers/tally. The adversary receives each metric with its measured or estimated mark. The step verifies the saved file in one of two forms (normal or Not Applicable) and returns a summary with severity counts, up to three Critical/High findings, the report path, and the parent branch in diff mode. For a Not Applicable report, the justification replaces the counts and findings.
- Both wrappers (`commands/claude/sai-7-performance.md` and `commands/opencode/sai-7-performance.md`) mention `--runtime` in their description. The Claude Code wrapper also adds `[optional: --runtime]` to `argument-hint`.
- `docs/review-triage.md` notes that performance accepts `--runtime`.
- Tests are updated for the new card text and checklists, for the performance exemptions in shared-dependency, same-turn progress, and step-machine wiring tests, and for the refreshed opencode projection fingerprint.

## Capabilities

### New Capabilities

- `performance-report-shape`: the sections, provenance line, finding fields, estimate mark, Not Applicable report, and closing tally of `performance.md`.
- `performance-worker-instructions`: the single-source, step-local statement of the performance worker's rules and the completion criterion of each step.
- `performance-runtime-diagnostics`: the `--runtime` option that gates diagnostics, and per-tier checklist loading.

### Modified Capabilities

- `performance-step-gated-delivery`: the pre-save adversary now receives each metric with its measured or estimated mark plus the baseline reference.
- `instruction-output-templates`: the performance audit contract no longer retains a hot-path section; it retains evidence, metrics, remediation and validation.

## Impact

New files:
- `sai/commands/performance/checklists/backend.md`
- `sai/commands/performance/checklists/frontend.md`
- `sai/commands/performance/checklists/db.md`
- `sai/commands/performance/checklists/queue.md`

Modified files:
- `commands/claude/sai-7-performance.md`
- `commands/opencode/sai-7-performance.md`
- `docs/review-triage.md`
- `openspec/schemas/sai-workflow/templates/performance.md`
- `sai/commands/performance/performance-report.template.md`
- `sai/commands/performance/steps/audit-performance-tiers.md`
- `sai/commands/performance/steps/close-performance-outcome.md`
- `sai/commands/performance/steps/common.md`
- `sai/commands/performance/steps/map-stack-hot-paths.md`
- `sai/commands/performance/steps/resolve-diagnostics.md`
- `sai/commands/performance/worker.md`
- `test/claude-default-preset-alignment.test.js`
- `test/performance-coordinator-worker.test.js`
- `test/review-shared-dependencies.test.js`
- `test/routed-progress-same-turn.test.js`
- `test/step-machine-wiring.test.js`

Known limitations: each repeated rule is now a single statement, so the reinforcement of repetition is lost. The estimate mark repeats inside a finding with several estimated numbers. The mapping step demands more work than the issue's four-output criterion. Whether the tier checklists are needed at all, and whether Symptom, Expected impact if unfixed, and Expected gain should merge, are deferred until run evidence exists.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

Originating issue: https://github.com/mmadariaga/shared-ai/issues/64. Issue Q1 (whether the adversary dispatch counts toward the explorer cap) is deferred out of this change. Issue I7 says the base is a `main` that contains #63; at exploration time `6119a0c1` was on the checked-out branch, `v0.9-beta`, and `origin/v0.9-beta`, but not on `main` or `origin/main`. Deferred until run evidence exists: whether the tier checklists are needed at all, and whether the overlapping Symptom, Expected impact if unfixed, and Expected gain finding fields should merge.
