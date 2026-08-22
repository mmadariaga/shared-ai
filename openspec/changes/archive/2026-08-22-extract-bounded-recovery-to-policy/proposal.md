> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

Every session that loaded the shared runner paid for recovery semantics it mostly never used: the `## Bounded Recovery` section made up roughly 257 of `sai/orchestration/command-runner.md`'s 426 lines, and the runner is fetched by every boot adapter for every command. Long resident contracts are a compliance risk for small-model workers and coordinators, and the runner also carried a stale historical prose block referencing the long-archived `chainable-apply-phase-adapter` change. Moving the machinery to a dedicated policy lets exactly the sessions that run recovery-capable segments carry it statically while keeping the runner core lean.

## What Changes

- New `sai/policies/bounded-recovery.md`: byte-verbatim relocation of the entire former `## Bounded Recovery` section — segment-scoped three-slot ledger, post-resolution diagnosis, three routing diagnoses, Cause Locus + dual inspection channels, diagnosis-key normalization, eligibility, zero-attempt branches, dispatch/continuation, input/cancellation/hand-back including the Explore Auto item-10 exception, union/fast-track invariants, planning-adapter recovery surface + channel selection, and the Step 2 GREEN registry table (`design-overview-repair`). The header states it extends the shared runner's Result Loop and is loaded unconditionally by coordinators whose adapter opts into recovery or executes such a segment under composition.
- `sai/orchestration/command-runner.md` slimmed 426 → 159 lines: the section is deleted; composition rule 1's duplicated ledger-creation/scoping sentences are replaced with one deferral sentence to the policy while the rule keeps ordered execution, segment-field rebinding, and changed-files union continuity; the stale historical prose block referencing the archived `chainable-apply-phase-adapter` change is removed; `(recovery semantics: @sai/policies/bounded-recovery.md)` is appended at the `recovery_policy` field listing. The Result Loop core stays byte-stable.
- Static unconditional fetch line — "Fetch @sai/policies/bounded-recovery.md and follow it as part of the shared runner." — added after each card's first fetch in exactly four coordinator cards: `sai/commands/{spec,design,apply,build}/coordinator.md`. No other sessions load it: workers never diagnose routing; utilities never run the loop.
- `sai/commands/explore/instructions.md`: two prose references retargeted from the runner's section to the policy path.
- Tests repointed: `test/bounded-worker-recovery.test.js` (twelve blocks read the policy instead of the runner; the registry walker now enforces the single registry home = policy while the Result Loop union assertion stays on the runner), `test/explore-pipeline-selector.test.js` (Bounded Recovery reference retargeted plus a new assertion that all four coordinator cards carry the static fetch), and `test/design-coordinator-worker.test.js` + `test/build-coordinator.test.js` (Step-6 registry/diagnosis reads repointed).

## Capabilities

### New Capabilities

- `bounded-recovery-policy-home`: the dedicated policy file as the single home of the bounded-recovery machinery, its static resident load by the four recovery-role coordinator cards only, and the slimmed runner preserving composition continuity.

### Modified Capabilities

- `bounded-worker-recovery`: the sole runtime registry listing that agents execute lives in `sai/policies/bounded-recovery.md` instead of `sai/orchestration/command-runner.md`; delta specs and design artifacts still may cite the row for traceability but never create a second maintained table.
- `worker-failure-classification`: the shared closed worker-failure rule the standalone spec-proposal and design-planning workers apply now lives in `sai/policies/bounded-recovery.md`.
- `explore-pipeline-supervision`: the item-10 supervised Auto route uses the bounded-recovery policy as the single source for post-resolution non-clean diagnosis; the explore instructions retarget their two prose references accordingly.
- `apply-same-worker-retry`: the apply adapter's `recovery_policy: true` declaration cites the bounded-recovery policy rather than the runner's removed section.

## Impact

New: `sai/policies/bounded-recovery.md`. Modified: `sai/orchestration/command-runner.md`, `sai/commands/spec/coordinator.md`, `sai/commands/design/coordinator.md`, `sai/commands/apply/coordinator.md`, `sai/commands/build/coordinator.md`, `sai/commands/explore/instructions.md`, `test/bounded-worker-recovery.test.js`, `test/explore-pipeline-selector.test.js`, `test/design-coordinator-worker.test.js`, `test/build-coordinator.test.js`. Baseline specs synced: `openspec/specs/{bounded-worker-recovery,worker-failure-classification,explore-pipeline-supervision,apply-same-worker-retry}/spec.md`.

Evidence-backed boundaries preserved deliberately: the load model is a static resident fetch per role — deliberately NOT event-triggered; the reactive-pointer alternative (fetch on first non-clean result) was evaluated and rejected because a deferred load under failure conditions is a small-model compliance risk. Workers never diagnose routing and therefore never load the policy; utility commands never execute the loop. The orchestration-core composition semantics are unchanged: rule 1 keeps ordered execution, segment rebinding, and union continuity in the runner itself. The Result Loop core is byte-stable. Full suite green after the flip (1185 pass / 0 fail).

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill
