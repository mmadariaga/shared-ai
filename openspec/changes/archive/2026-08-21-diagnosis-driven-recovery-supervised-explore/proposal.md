**Complexity**: medium

## Why

Explore Auto currently treats a supervised worker failure or cancellation as the end of the active attempt, even though the same session can freshly inspect the phase artifacts through its existing Review Engine. That dead route loses the best available evidence and forces the user to retry without diagnosis, so the route should get one bounded diagnosis-and-re-dispatch opportunity while preserving worker ownership and Explore's read-only boundary.

## What Changes

- Single-source the post-resolution non-clean-closure diagnosis boundary and the ordered `Reported`, `Evidence`, `Cause`, `Correction`, and `Verification` hand-back shape in `sai/orchestration/command-runner.md`'s **Bounded Recovery** section.
- Extend Explore Auto item 10 so a failed supervised worker of any closed failure class, or a cancelled supervised worker, runs exactly one read-only Review Engine diagnosis over the current phase artifact set and gets at most one same-worker re-dispatch with the resulting diagnosis as feedback when an actionable correction is established.
- Keep a phase-keyed `diagnosis_rounds` counter (`spec` and `design`) separate from `review_rounds`; hold it only in conversation-scoped supervision state, reset it for a new Auto attempt, and stop without a second diagnosis or re-dispatch when the active phase's one-shot budget is spent or the re-dispatch does not complete successfully.
- Keep the manual post-crystallization review-loop contract unchanged. Diagnosis findings are recovery feedback, not review evidence: they do not mark or clear reviewed items, and Explore never applies corrections directly.
- Define the idea-list rendering outcome while diagnosis is active and when it ends, without adding a new persisted item or allowing diagnosis to masquerade as a converged supervised review round.
- Add the new `Diagnosis Round` term and its Review Engine relationship to the project-root `GLOSSARY.md`; this terminology update does not persist diagnosis runtime state.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `explore-pipeline-supervision`: add one bounded Review Engine diagnosis and one feedback re-dispatch to the item-10 failed/cancelled worker route, with a counter independent of supervised review rounds.
- `explore-idea-list`: define diagnosis-round interaction with the phase review item's render-only `in_progress`/`pending` state and preserve evidence-only marking.
- `bounded-worker-recovery`: explicitly narrow the generic cancelled-result prohibition to preserve clean cancellation everywhere except the named, selector-dispatched Explore Auto item-10 diagnosis route.

## Impact

- Shared lifecycle source: `sai/orchestration/command-runner.md`, limited to the **Bounded Recovery** contract and its common diagnosis hand-back shape.
- Shared recovery capability delta: `openspec/changes/diagnosis-driven-recovery-supervised-explore/specs/bounded-worker-recovery/spec.md`, which makes the Explore-only cancellation exception normative without changing the default cancellation rule.
- Explore Auto lifecycle and state contract: `sai/commands/explore/instructions.md` item 10, including the phase-specific Review Engine invocation, one-shot diagnosis counter, feedback re-dispatch, terminal retry guidance, and write-free boundary.
- Explore idea-list state contract: the supervised review-in-progress rules in `openspec/specs/explore-idea-list/spec.md` and their corresponding item-10 language.
- Project terminology: `GLOSSARY.md` defines `Diagnosis Round` and its relationship to the Review Engine; it stores terminology only, never diagnosis counters or findings.
- Existing Review Engine and finding contract remain the implementation source; no new reviewer, reviewer binding, artifact writer, or persisted recovery record is introduced.
- Expected structural coverage is bounded to `test/bounded-worker-recovery.test.js`, `test/explore-pipeline-selector.test.js`, and `test/glossary-diagnosis-terms.test.js`.
- `sai/commands/build/coordinator.md` is explicitly out of scope and remains unchanged. No project source files, production files, or direct Explore writes are introduced.

## Proposal Research Documentation

**Local files**: `openspec/config.yaml`; `GLOSSARY.md`; `sai/commands/explore/instructions.md`; `sai/orchestration/command-runner.md`; `sai/orchestration/worker-core.md`; `sai/policies/artifact-review-contract.md`; `sai/policies/artifact-feedback-gate.md`; `openspec/specs/explore-pipeline-supervision/spec.md`; `openspec/specs/explore-pipeline-selector/spec.md`; `openspec/specs/explore-idea-list/spec.md`; `openspec/specs/review-engine-extraction/spec.md`; `openspec/specs/supervised-review-in-session/spec.md`; `openspec/specs/orchestration-core/spec.md`; `openspec/specs/bounded-worker-recovery/spec.md`; `docs/adr/0158b-shared-non-clean-closure-diagnosis-in-command-runner.md`; `openspec/changes/archive/2026-08-20-diagnosis-driven-recovery-apply/proposal.md`; `openspec/changes/archive/2026-08-21-diagnosis-driven-recovery-spec-design/proposal.md`; `openspec/changes/archive/2026-08-21-diagnosis-driven-recovery-spec-design/design.md`; `openspec/changes/archive/2026-08-21-diagnosis-driven-recovery-spec-design/interfaces.md`; `SAI_LEARNINGS.md`.

**External URLs**: None.

## Additional Notes

- The existing Review Engine remains the only diagnosis/review reader: it resolves the exact change, rereads the phase artifacts, and forms contract-shaped severity findings. The diagnosis path must not create a second review implementation or a worker-owned reviewer.
- The shared non-clean trigger remains the closed post-resolution set: failed of any class, coordinator-disproved completed, or completed carrying STOP. The bounded-worker-recovery delta keeps cancellation as a zero-attempt clean stop by default and names Explore Auto item 10 as the sole exception: Auto selection is already the user's authorization for delegated supervision, so a worker `cancelled` result inside that active route is diagnosable pipeline incompletion rather than a new user cancellation decision. The exception is one-shot, read-only, same-worker-only, and unavailable to standalone adapters, Build, the manual loop, or an outer user cancellation.
- The five diagnosis sections are coordinator feedback only. `Cause` must identify the actionable correction boundary, and `Verification` must state what the re-dispatched worker must verify before returning success.
- If the diagnosis is actionable but the same-worker continuation cannot be delivered or the worker cannot be resumed, the route consumes the diagnosis round, selects the shared `continuation/transport loss` stopping diagnosis, performs no replacement dispatch, and leaves the change retryable for a later Auto attempt.
- `review_rounds.spec` and `review_rounds.design` remain the three-round convergence budgets. A separate conversation-only `diagnosis_rounds.spec` / `diagnosis_rounds.design` counter records at most one diagnosis attempt per phase and never becomes artifact, worker-payload, glossary, or metadata state.
- Diagnosis findings leave the current review-evidence marks unchanged. The active phase item resolves to `pending` while the failed/cancelled attempt is diagnosed; a successful re-dispatch starts ordinary phase review rendering again, and a stopped route leaves the item pending.
- The requested overview language is `Español`; this sai-1 artifact set is written in English under the project language policy, and the value remains conversation-only transport for the later overview-producing design phase.
