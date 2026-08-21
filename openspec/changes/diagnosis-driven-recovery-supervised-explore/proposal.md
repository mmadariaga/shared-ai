**Complexity**: medium

## Why

Supervised Explore Auto item 10 already runs a one-shot read-only Review Engine Diagnosis Round after resolved `failed` or `cancelled` worker results, with separate `diagnosis_rounds`, same-worker `continue_after_recovery`, idea-list pending-before-diagnosis, and the named Explore cancellation exception. The residual gap is that item 10 does not yet enter that same diagnosis path for the rest of the shared Bounded Recovery non-clean set — coordinator-disproved `completed` and STOP-bearing `completed` — so unattended Auto can still miss a diagnosis opportunity on those closures even though the shared recovery contract already names them.

## What Changes

- Broaden Explore Auto item-10 diagnosis entry so it uses the shared Bounded Recovery non-clean trigger set (structurally valid post-resolution `failed`, coordinator-disproved `completed`, STOP-bearing `completed`) plus the existing Explore-only post-resolution `cancelled` exception.
- Keep clean `completed`, `needs_input`, progress, notice, and pre-resolution results outside diagnosis.
- Preserve the already-delivered diagnosis spine: `diagnosis_rounds`, five-section feedback, same-worker re-dispatch, continuation/transport loss, no replacement, no direct Explore writes, idea-list non-masquerade, and Build non-touch.
- Extend static contract tests in `test/explore-pipeline-selector.test.js` for disproved-completed and STOP-bearing completed entry and for clean-completed exclusion.
- Do not re-implement the diagnosis route, edit `sai/orchestration/command-runner.md`, edit `sai/commands/build/coordinator.md`, hand-edit baseline `openspec/specs/**` during apply, or write glossary terms.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `explore-pipeline-supervision`: MODIFIED residual only — broaden item-10 diagnosis entry to the full shared non-clean set (including disproved/STOP completed) while retaining cancelled exception and existing one-shot same-worker bounds; do not re-add baseline-identical diagnosis-accounting requirements.
- `explore-idea-list`: MODIFIED residual only — pending-before-diagnosis and non-masquerade rules apply for every diagnosis-entry result, including disproved/STOP completed.
- `bounded-worker-recovery`: MODIFIED residual only — Explore diagnosis for non-clean completed spends only `diagnosis_rounds` (not the shared three-slot ledger). Baseline-identical cancellation-exception and recovery_policy requirements are not re-declared.

## Impact

- `sai/commands/explore/instructions.md`: item-10 diagnosis entry conditions only (surgical).
- `test/explore-pipeline-selector.test.js`: additive static coverage for non-clean completed entry and clean-completed exclusion.
- Confirmed non-touch: `sai/orchestration/command-runner.md`, `sai/commands/build/coordinator.md`, `test/bounded-worker-recovery.test.js`, `GLOSSARY.md`, baseline `openspec/specs/**` during apply (archive syncs deltas later).
- Existing Review Engine and shared finding contract unchanged; no new dependency, persisted recovery state, direct Explore write authority, or production-code change.

## Proposal Research Documentation

**Local files**: `openspec/config.yaml`; `GLOSSARY.md`; `sai/commands/explore/instructions.md`; `sai/orchestration/command-runner.md`; `sai/orchestration/worker-core.md`; `sai/commands/spec/coordinator.md`; `sai/commands/design/coordinator.md`; `sai/commands/build/coordinator.md`; `sai/policies/artifact-review-contract.md`; `sai/policies/artifact-feedback-gate.md`; `openspec/specs/bounded-worker-recovery/spec.md`; `openspec/specs/explore-pipeline-supervision/spec.md`; `openspec/specs/explore-idea-list/spec.md`; `openspec/specs/review-engine-extraction/spec.md`; `openspec/specs/supervised-review-rounds/spec.md`; `openspec/specs/supervised-review-in-session/spec.md`; `openspec/schemas/sai-workflow/schema.yaml`; `test/explore-pipeline-selector.test.js`; `test/bounded-worker-recovery.test.js`.

**External URLs**: None.

## Additional Notes

- This change is residual hardening after the diagnosis spine landed on HEAD. It does not claim the diagnosis route is absent.
- The generic non-clean trigger remains `failed`, coordinator-disproved `completed`, or `completed` carrying STOP. Explore Auto item 10 remains the sole named cancellation exception.
- `Diagnosis Round` already exists in `GLOSSARY.md`; no glossary write is required. Runtime counters and findings remain conversation-only.
- Baseline capability specs are updated only by `sai-archive` sync from these deltas; apply does not hand-edit `openspec/specs/**`.
- Before archive, a change maintainer must resolve the same-name collision with `openspec/changes/archive/2026-08-21-diagnosis-driven-recovery-supervised-explore/` by deleting or renaming the stale archived copy if this active change supersedes it, or renaming this change if the archived copy is delivered.
