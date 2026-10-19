> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

`security.md` carried ten sections that no command or tool reads: Executive Summary (severity table, risk posture, verdict), Module Summary, Supply Chain Hygiene, License Risk, Policy Compliance, Prioritized Remediation Plan, Metrics, and a seven-field header. Several of these sections asked for values that no step explains how to get, which goes against the command's own "No speculation" rule. The security worker files also repeated the same rules four or five times (write scope, identifiers and tally, scope, clean categories, SCA gate), and they pointed to behavior that no file defines: "the established no-active-changes failure", "the existing no-change security outcome", and a "Security Audit" section that repeated the step files. Some steps had no observable completion criterion.

## What Changes

- The `/sai-6-security` report contract (`sai/commands/security/security-report.template.md`) and its OpenSpec schema scaffold (`openspec/schemas/sai-workflow/templates/security.md`) now hold only the sections a consumer reads. The template has a single provenance line (scope, scan type, date), the `## Not Applicable` section, `## SAST Findings`, `## SCA Findings`, the optional `## Acknowledged Trade-offs (from change artifacts)`, and the closing `Summary:` tally. SCA findings no longer carry a `License` field. The template states once that a section with no content is omitted.
- The Not Applicable report applies when the selected scope has no attack surface and the SCA gate admits no manifest. An empty diff is this case. The report then holds only the title, the provenance line, and `## Not Applicable` with its justification. It has no findings sections and no tally.
- `steps/discover-module-map.md` now decides the SCA gate and the not-applicable outcome. On that outcome it reports `discover-module-map`, `resolve-sast-analysis`, and `resolve-sca` together. Its completion criterion: every file in the selected scope is assigned to a module, and every dependency manifest has its SCA gate decision.
- `steps/resolve-sca.md` is renamed "Audit Dependencies". It audits only the manifests the gate admitted, runs only read-only audit commands, and never installs, updates, or rewrites dependencies. The license check is removed, and so are the "SCA skipped" sentences. The step id `resolve-sca` does not change. Its visible label becomes "Audit dependencies" in `coordinator.md` and `worker.md`.
- The `steps/resolve-sast-analysis.md` completion criterion now also requires that every external input source is traced to its sinks and every flaw is recorded with its fields.
- `steps/close-security-outcome.md` is the single place that drafts, saves, verifies, and summarizes `security.md`. It has two verification forms (normal report and Not Applicable report). The seven-item self-critique becomes one instruction to check the draft against the hard rules and the severity taxonomy in `common.md`. The adversary dispatch does not change.
- `steps/common.md` states each rule once. It defines accepted trade-offs with their three source documents in the Input section, the "selected scope" and the scope hard rule in the Scope section, and the write scope positively ("the only deliverable is `security.md`"). It keeps the identifier and tally rule once (a Not Applicable report has no findings and no tally) and rewrites the clean-category rule as "the report lists findings only". The Remember section and the active-step pointer rule are removed from this file.
- `worker.md` merges Progress Reporting, Active Step Execution, and Security Audit into one "Steps" section. This section lists the five ids with the batch that carries each, the no-manifest and not-applicable batching, and the pointer rule stated once and positively. The worker now carries the no-active-changes literal ``No active changes found. Run `/sai-1-spec` to create one.`` It drops the OpenSpec-prerequisite, parent-conversation-history, and design-notice sentences.
- `coordinator.md` replaces its list of ten prohibited actions with what the coordinator owns: lifecycle routing and terminal presentation. The coordinator is artifact-blind.
- "Phase 1, 2, 3" references become step names.
- Tests updated: `test/security-coordinator-worker.test.js` (label, merged Steps section, batching assertions), `test/review-shared-dependencies.test.js`, `test/routed-progress-same-turn.test.js`, and `test/step-machine-wiring.test.js` (security-specific exceptions for the removed prerequisite sentence and the relocated pointer rule).
- Scope drift: the `/sai-6-security` progress-plan label, empty-diff progress mapping, and early-outcome reconciliation pinned in `audit-command-progress-plans` change with the label and the not-applicable batching.

## Capabilities

### New Capabilities

- None

### Modified Capabilities

- `security-phase-worker`: report shape without the executive summary or license evidence; SCA gate and not-applicable decision in discovery; the Not Applicable report for an empty or surface-less scope; observable step completion criteria; the no-active-changes literal; two verification forms.
- `instruction-output-templates`: the security clause of the audit report contract no longer retains supply-chain, license, and policy rules. The performance and accessibility clauses do not change.
- `audit-command-progress-plans`: the security `resolve-sca` label becomes "Audit dependencies"; the security empty-diff mapping and early-outcome reconciliation become the not-applicable batch with the Not Applicable report.

## Impact

Modified files:
- `openspec/schemas/sai-workflow/templates/security.md`
- `sai/commands/security/coordinator.md`
- `sai/commands/security/security-report.template.md`
- `sai/commands/security/steps/close-security-outcome.md`
- `sai/commands/security/steps/common.md`
- `sai/commands/security/steps/discover-module-map.md`
- `sai/commands/security/steps/resolve-sast-analysis.md`
- `sai/commands/security/steps/resolve-sca.md`
- `sai/commands/security/worker.md`
- `test/review-shared-dependencies.test.js`
- `test/routed-progress-same-turn.test.js`
- `test/security-coordinator-worker.test.js`
- `test/step-machine-wiring.test.js`

New files: none. Reports written in the earlier shape stay readable by `/sai-3-implement` audit ingestion, the Direct Build findings selection, `/sai-status`, and `/sai-archive`. There is no migration. Claude Code and opencode receive the same installed text.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

Undecided: whether the rule that the report stays legible in fewer than 200 lines still changes behavior once the ten sections are gone; it stays until a run shows otherwise. Future scope, outside this change: rewriting the remaining prohibitions of `steps/common.md` ("No speculation", "No suppression by deployment context", "No auto-dismissed findings") positively, once runs can show the effect on model behavior. `sai/commands/security/coordinator.md:32` restates shared protocol rules in one long paragraph and was left out with the shared files.
