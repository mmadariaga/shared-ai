**Complexity**: high

## Why

Standalone `/sai-1-spec` and `/sai-2-design` can currently spend their bounded continuation opportunities without naming the evidence-backed cause of a non-clean result. Their coordinators are artifact-blind even when a worker has failed, while the workers lack a uniform failure classification rule, so users receive a late generic stop instead of a useful diagnosis.

## What Changes

- Extend the shared bounded-recovery contract so a post-resolution non-clean closure is diagnosed before eligibility is evaluated, while keeping the three routing diagnoses, distinct-diagnosis budget, zero-attempt branches, and same-worker continuation single-sourced in `sai/orchestration/command-runner.md`.
- Add the closed `failure_class` classification rule to the standalone spec-proposal and design-planning worker contracts. Workers continue to own their artifacts, verification, veto decisions, and all repairs; a worker never authors coordinator routing metadata.
- Opt standalone spec and design adapters into the diagnosis route. On the clean path their existing artifact-blind router clauses remain in force; only a failed result, a coordinator-disproved `completed`, or a `completed` result carrying a STOP permits coordinator artifact inspection. When inspection is authorized for a cause surface, it is the sole diagnosis channel for that surface; the existing phase-static `design-overview-repair` registry row remains for separate surfaces on which the active adapter stays blind.
- Let the spec and design coordinators inspect the phase-owned artifacts only on that non-clean route, identify the artifact and concrete point when evidence permits, and apply the shared coordinator-over-worker verification tiebreak. An in-scope cause is returned to the same worker with the diagnosis; an out-of-scope or unresolved cause stops with zero recovery attempts. The coordinators never write proposal, spec, design, task, or interface artifacts.
- Preserve the existing Apply RED/GREEN recovery behavior, Explore Auto's read-only/delegated-write boundary, Build's composition-owned stops, the artifact-feedback gate, overview-language transport, and all durable-artifact ownership. No repair or diagnosis ledger is persisted in an artifact or metadata.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `orchestration-core`: make non-clean-closure diagnosis and the clean-route/non-clean-route inspection boundary available to standalone planning adapters without duplicating runner mechanics.
- `bounded-worker-recovery`: extend the existing distinct-diagnosis ledger and cause-locus rules to the spec and design main artifact surfaces, preserving zero-attempt and same-worker boundaries.
- `worker-failure-classification`: require the closed classification and evidence rule from the standalone spec and design workers while keeping routing diagnosis coordinator-owned.
- `spec-proposal-worker`: classify failures and define the spec worker's authorized artifact boundary and recovery continuation behavior.
- `design-planning-worker`: classify failures on the main design path as well as overview generation and define the design worker's authorized artifact boundary and recovery continuation behavior.
- `spec-coordinator`: qualify artifact blindness so only the non-clean-closure route may inspect the spec artifacts and may re-dispatch the worker with a diagnosis.
- `design-coordinator`: qualify the clean-route forwarding/inspection prohibition and add the same non-clean-closure route without changing the overview-generation path.
- `design-subagent-delegation`: preserve the design coordinator's no-I/O contract on clean results while allowing narrowly scoped non-clean artifact diagnosis.

## Impact

- Shared lifecycle and recovery contract: `sai/orchestration/command-runner.md` and the related worker lifecycle semantics.
- Standalone phase cards: `sai/commands/spec/coordinator.md`, `sai/commands/spec/worker.md`, `sai/commands/design/coordinator.md`, and `sai/commands/design/worker.md`.
- Design I/O boundary capability delta: `openspec/changes/diagnosis-driven-recovery-spec-design/specs/design-subagent-delegation/spec.md` (synced to the baseline capability at archive).
- Coordinator/worker contract coverage: `test/spec-coordinator-worker.test.js`, `test/design-coordinator-worker.test.js`, and `test/bounded-worker-recovery.test.js`.
- Normative deltas for the eight modified capabilities listed above.
- No changes to `sai/commands/explore/**` or `sai/commands/build/**`; Explore Auto remains read-only and delegated-write-only, and Build inherits only the existing phase-adapter behavior.
- No project source files, production files, feedback-gate rules, overview metadata, or durable recovery trace are introduced.

## Proposal Research Documentation

**Local files**: `openspec/config.yaml`; `GLOSSARY.md`; `sai/orchestration/command-runner.md`; `sai/orchestration/worker-core.md`; `sai/policies/artifact-review-contract.md`; `sai/commands/spec/coordinator.md`; `sai/commands/spec/worker.md`; `sai/commands/design/coordinator.md`; `sai/commands/design/worker.md`; `sai/commands/apply/coordinator.md`; `sai/commands/apply/red-worker.md`; `sai/commands/apply/green-worker.md`; `sai/commands/explore/instructions.md`; `sai/commands/build/coordinator.md`; `openspec/specs/orchestration-core/spec.md`; `openspec/specs/bounded-worker-recovery/spec.md`; `openspec/specs/worker-failure-classification/spec.md`; `openspec/specs/spec-proposal-worker/spec.md`; `openspec/specs/design-planning-worker/spec.md`; `openspec/specs/spec-coordinator/spec.md`; `openspec/specs/design-coordinator/spec.md`; `openspec/specs/design-subagent-delegation/spec.md`; `openspec/specs/apply-coordinator-verification/spec.md`; `openspec/specs/apply-same-worker-retry/spec.md`; `openspec/changes/archive/2026-08-20-diagnosis-driven-recovery-apply/proposal.md`; `openspec/changes/archive/2026-08-20-diagnosis-driven-recovery-apply/specs/bounded-worker-recovery/spec.md`; `openspec/changes/archive/2026-08-20-diagnosis-driven-recovery-apply/specs/orchestration-core/spec.md`; `openspec/schemas/sai-workflow/templates/proposal.md`; `openspec/schemas/sai-workflow/templates/specs.md`; `test/spec-coordinator-worker.test.js`; `test/design-coordinator-worker.test.js`; `test/bounded-worker-recovery.test.js`.

**External URLs**: None.

## Additional Notes

- The worker failure classes remain `blocking-contradiction`, `validation-failed`, `generation-error`, `dispatch-failed`, `envelope-contract-violation`, and `unclassified-worker-fault`. `outer-envelope-violation` remains coordinator-authored and is never a worker class. Routing diagnosis remains one of `worker-authored failure`, `coordinator rejection`, or `continuation/transport loss`.
- The three-attempt budget is retained numerically but means three mutually distinct coordinator diagnosis keys, not three same-class retries. A duplicate, vetoed, out-of-scope, unresolved, malformed, cancelled, or transport-lost closure spends zero additional slots.
- The spec worker owns `proposal.md`, `specs/**`, and permitted glossary updates. The design worker owns `design.md`, `tasks.md`, `interfaces.md`, and its existing overview lifecycle. A coordinator may read those artifacts only after a non-clean closure and may never repair them.
- The apply five-part diagnosis (`Reported`, `Evidence`, `Cause`, `Correction`, `Verification`), Apply's authoritative verification, RED blindness, GREEN's absolute test/interface prohibition, and Build's non-removable exhaustion stop are reference behavior, not new edits in this slice.
- The handoff's Explore Auto item-10 diagnosis-round note is treated as a separate follow-up because the explicit slice constraint leaves Explore Auto untouched; this proposal changes neither its route nor its write permissions.
- `Overview language: Español` remains conversation-only transport for the later design/overview handoff; this sai-1 proposal creates no `change-overview.md` and no persisted language preference.
