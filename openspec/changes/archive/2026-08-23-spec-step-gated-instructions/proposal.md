> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

**Complexity**: high (S1=4 new capabilities, S2=10 requirements, S5=10 affected paths; no breaking change)

## Why

Small-model spec workers received ~15–25k tokens of contracts up front (`sai/orchestration/worker-core.md`, the monolithic `sai/commands/spec/instructions.md` chain, and skills) before executing the first step. Salience decayed over the long run and produced adherence drift. The existing six-step progress plan already paused the worker at every step boundary, so those boundaries could serve as just-in-time delivery gates: hand each instruction stretch to the worker only when it becomes the active work.

## What Changes

- New `sai/commands/spec/steps/` library splits the sai-1-spec worker's instruction mass into one file per progress-plan step: `common.md` (run-long boundaries), plus `research.md`, `proposal.md`, `specs.md`, `validation.md`, `review.md`.
- `sai/commands/spec/worker.md`: fixed fetches become verified-precondition-handback + worker-core + `steps/common.md`; the wholesale "fetch invocation.md and follow it exactly" instruction is replaced by execute-only-the-active-step. Envelope parsing (`--supervised`), prerequisites/resolution, the progress plan, external-findings evidence rules, and failure classification/recovery stay in the card unchanged.
- `sai/commands/spec/coordinator.md`: declares a static `step_pointer_map` (id → pointer file, `prereqs-and-change → none`) and states the two-line continuation payload contract.
- `sai/orchestration/command-runner.md`: gains an optional static `step_pointer_map` adapter field and a normative "Step-gated pointer delivery" subsection with deterministic pointer derivation; default-off keeps every undeclared phase on today's exact-literal continuation.
- `AGENTS.md`: documents the experiment under the Spec coordinator and worker convention.
- No manifest change: the recursive `sai-commands` projection (`**/*.md`) already installs `steps/`; materialized binding literals are untouched.

## Capabilities

### New Capabilities

- `spec-steps-library`: six-file step instruction library under `sai/commands/spec/steps/` carved from the monolithic sources, with `common.md` always loaded at dispatch.
- `coordinator-step-pointers`: static `step_pointer_map` declaration on the spec coordinator card plus pointer-carrying progress continuations and `active_step_id` reconstruction state.
- `runner-pointer-extension`: opt-in `step_pointer_map` adapter field in the shared command runner with deterministic pointer derivation and default-off neutrality.
- `worker-active-step-execution`: the worker executes only the coordinator-named active step from a sealed initial surface, with fileless first step and a review fast path.

### Modified Capabilities

<!-- None — all four capabilities are new; no existing openspec/specs capability changes requirements. -->

## Impact

New: `sai/commands/spec/steps/common.md`, `sai/commands/spec/steps/research.md`, `sai/commands/spec/steps/proposal.md`, `sai/commands/spec/steps/specs.md`, `sai/commands/spec/steps/validation.md`, `sai/commands/spec/steps/review.md`.

Modified: `sai/commands/spec/worker.md`, `sai/commands/spec/coordinator.md`, `sai/orchestration/command-runner.md`, `AGENTS.md`.

Out of scope: `sai/install-manifest.json` (verified only — the existing recursive projection covers `steps/`), all other nine phases' cards, bindings, and wrappers (observationally identical under default-off), `sai/commands/spec/instructions.md` and `sai/commands/spec/invocation.md` (left in place untouched).

## Proposal Research Documentation

**Local files**: `AGENTS.md`, `sai/commands/spec/worker.md`, `sai/commands/spec/coordinator.md`, `sai/commands/spec/instructions.md`, `sai/commands/spec/invocation.md`, `sai/orchestration/command-runner.md`, `sai/policies/artifact-review-contract.md`, `sai/policies/artifact-feedback-gate.md`, `sai/install-manifest.json`, `test/spec-coordinator-worker.test.js`.

**External URLs**: None

## Additional Notes

- Active experiment: scope is sai-1-spec only; adapters without a declared map keep today's exact continuation behavior, leaving the other nine phases observationally identical.
- The pointer travels in the runner-defined continuation payload; the materialized binding literal stays byte-for-byte, so no manifest or binding-template edit is required or made.
- Test suite green after implementation: targeted spec/design/orchestration suites 284 pass / 0 fail; projection trio 55 pass / 0 fail; full suite run completed with zero failures.
