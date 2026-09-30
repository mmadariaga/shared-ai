> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

**Complexity**: medium (26 files, removal-only, no user-facing command change)

## Why

The spec and design phases carried a final `review` step that only acted on a `sai-explore` findings block pasted with the invocation, and nothing produces one: design routes spec defects to patch or rerun, `/sai-review` only names findings, and the explore review-loop sends findings to the `/sai-2-design` feedback gate. The dead step, its evidence-marked reconciliation carve-out, and `sai/tools/validate-findings.js` (whose only callers were those two steps) are removed.

## What Changes

- `spec-standalone@1` drops the `review` stage and its step file mapping; the spec progress plan now ends at `validation` (five steps).
- Both `design-standalone@1` variants drop `review`: the opted-in plan ends at `overview` (six steps) and the unopted plan ends at `interfaces` (five steps).
- `sai/commands/spec/steps/review.md` and `sai/commands/design/steps/review.md` are deleted.
- `sai/policies/spec-phase-contract.md` and `sai/commands/design/phase-contract.md` drop the `review` — "Review artifacts" plan entry.
- The spec and design worker cards drop the `review` progress rules and the `### External findings consumption` sections; the design card keeps a `### Reviewer ownership` section stating it owns no reviewer.
- The evidence-marked `review` reconciliation carve-out is removed from `sai/policies/todo-structure.md` and from the spec and design coordinators: a successful reconciliation trigger renders every unmarked step `completed`.
- `sai/tools/validate-findings.js` and `test/validate-findings.test.js` are deleted; references are removed from `AGENTS.md`, `sai/policies/tool-resolution.md`, and `sai/policies/artifact-review-contract.md`, which no longer names the spec-proposal and design workers as findings consumers.
- `sai/install-manifest.json` gains `retirements` records for `tools/validate-findings.js`, `commands/spec/steps/review.md`, and `commands/design/steps/review.md` for both harnesses, so upgrades delete managed installed copies.
- `GLOSSARY.md` retires the `Review Step` term and its relationship line and rewords `Artifact Review` so workers apply findings as feedback.
- Tests pinning the old step lists, the carve-out, and the external-findings path are updated or removed.

## Capabilities

### New Capabilities

- `dead-review-step-retirement`: the retired review-step files and `validate-findings.js` are gone from source and registered for install cleanup.

### Modified Capabilities

- `review-step-evidence-marking`: review-step marking and the evidence-marked designation are removed; monotonic marks remain.
- `coordinator-progress-ownership`: terminal reconciliation has no evidence-marked carve-out.
- `design-coordinator`: design plans drop `review`; reconciliation marks every unmarked step; the machine maps no `review` file.
- `design-coordinator-text`: post-gate reconciliation text has no carve-out.
- `design-step-routing`: variants are six/five steps and the walk omits `review`.
- `design-phase-consolidation`: plan-parity lists and the unopted all-marked count drop `review`.
- `design-steps-library`: six step files, no `review.md`.
- `spec-step-routing`: five-step stage table ending at `validation`.
- `spec-coordinator`: five-step plan; reconciliation without a carve-out.
- `spec-steps-library`: five step files, no `review.md`.
- `coordinator-step-pointers`: spec `STAGE_FILES` maps no `review` entry.
- `review-finding-format`: the validator is `sai/tools/lint.js artifact-review` alone.
- `worker-active-step-execution`: the review-step fast-path requirement is removed.
- `step-machine-progress-emit`: `--with-overview true` seeds the six-step opted-in plan.
- `reactive-instruction-loading`: spec and design follow mappings drop `review`.
- `planning-artifact-review-loop`: the design worker consumes no external findings block.

## Impact

- Modified: `AGENTS.md`, `GLOSSARY.md`, `sai-state/machines/spec-standalone.js`, `sai-state/machines/design-standalone.js`, `sai/commands/spec/coordinator.md`, `sai/commands/spec/worker.md`, `sai/commands/spec/steps/common.md`, `sai/commands/design/coordinator.md`, `sai/commands/design/phase-contract.md`, `sai/commands/design/worker.md`, `sai/commands/design/steps/common.md`, `sai/install-manifest.json`, `sai/policies/artifact-review-contract.md`, `sai/policies/spec-phase-contract.md`, `sai/policies/todo-structure.md`, `sai/policies/tool-resolution.md`.
- Deleted: `sai/commands/spec/steps/review.md`, `sai/commands/design/steps/review.md`, `sai/tools/validate-findings.js`, `test/validate-findings.test.js`.
- Tests updated: `test/design-coordinator-worker.test.js`, `test/design-standalone-machine.test.js`, `test/explore-pipeline-selector.test.js`, `test/spec-coordinator-worker.test.js`, `test/step-machine-wiring.test.js`, `test/todo-structure-policy.test.js`.
- Unchanged: the machine-feedback continuation, the `/sai-2-design` artifact feedback gate, and Explore's review-loop.
- Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

Source: `~/Documentos/sai-handoffs/handoff-sai1-optimizations.md` item 5 and `handoff-sai2-optimizations.md` D1. The spec phase drops from 6 to 5 progress events here; `step-pointer-with-task` brings it to 4.
