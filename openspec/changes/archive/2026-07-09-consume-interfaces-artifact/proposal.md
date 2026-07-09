# Consume interfaces.md artifact

## Why

`design-interfaces-artifact` (slice 1) now emits `interfaces.md` — the per-step public signatures plus exact spec-anchored assertions, kept separate from the implementation body. Nothing consumes it yet. RED→GREEN proves a test is non-vacuous, but not that it encodes the *spec* rather than *mirroring the implementation*: today a single `sai-4-apply` subagent sees the GREEN body while it materializes the assertions, so it can reproduce the implementation's logic — bugs included — as its implicit oracle. Wiring the two consumers to `interfaces.md` closes that code-body mirroring channel.

## What Changes

- **sai-3-implement** (`sai/instructions/implement.md`) SHALL treat `interfaces.md` signatures as authoritative: the generated `implementation.md` conforms to the declared public signatures. When a signature cannot be honored, it STOPs and surfaces an interface amendment to the coordinator/human — it never amends the interface autonomously.
- **sai-3-implement** stops emitting concrete test scenarios/assertions into `implementation.md`; the exact assertions are single-sourced in `interfaces.md`.
- **sai-4-apply** (`sai/instructions/apply.md`) SHALL split every **testable** step into two separate subagent dispatches instead of one:
  - (a) a **blind test-writer** dispatch — context is `interfaces.md` for that Step N (signatures + exact assertions) PLUS the testing-relevant slice of `tasks.md`'s `## Implementation Context` (framework, assertion/mock libraries, test file location/naming, run command) injected by the coordinator — and NOTHING from the GREEN implementation body. It writes the interface stubs + the tests and verifies a VALID RED. It MAY read existing test files/infrastructure as a fallback when the injected context is insufficient, but never the implementation body.
  - (b) an **implementation** dispatch that writes the GREEN implementation and verifies GREEN, and is FORBIDDEN from modifying any test file. If GREEN cannot pass, it STOPs and reports to the coordinator — a human decides, never the subagent by weakening the test.
- **Non-testable steps** keep the current single-dispatch flow — unchanged.

## Capabilities

### New Capabilities

- **implement-respects-interfaces**: `sai-3-implement` conforms `implementation.md` to `interfaces.md` signatures; interface amendment only via coordinator/human; concrete assertions are not re-duplicated into `implementation.md` (they live in `interfaces.md`).
- **apply-test-impl-split**: `sai-4-apply` coordinator dispatches a blind test-writer (interfaces.md Step N + injected testing context, no implementation body; existing test files allowed as fallback) then a separate implementation subagent that cannot edit test files. Only testable steps are split.
- **green-conflict-stop**: an implementation dispatch whose GREEN will not pass halts and reports to the coordinator/human instead of being resolved by the subagent weakening or editing the test.

### Modified Capabilities

- **apply-step-delegation**: the "exactly one subagent per Step" contract is narrowed — testable steps now dispatch two subagents (test-writer then implementation); non-testable steps remain single-dispatch.
- **apply-subagent-report-contract**: the single 8-field report (with both RED and GREEN results) cannot be satisfied by either half of a split testable Step — the test-writer owns RED and the implementation subagent owns GREEN. The contract is extended so each testable-step dispatch marks the field it does not own as `n/a`, keeping the 8-field shape stable while making it satisfiable.
- **apply-pre-commit-file-report**: a testable Step now has two subagent reports; the pre-commit report SHALL union the `Files modified` (field 8) of both the test-writer and the implementation dispatch, and the malformed-field-8 check applies to both reports.
- **apply-technical-learnings-memory**: incorporation timing is refined so a testable Step performs an intra-Step handoff — the test-writer's learnings are incorporated and re-injected into the immediately-following implementation dispatch (before Step verification), instead of only after the Step completes.

## Impact

- `sai/instructions/implement.md` — interface-conformance rule; stop emitting concrete assertions into `implementation.md`; STOP-on-unsatisfiable-signature.
- `sai/instructions/apply.md` — two-dispatch flow for testable steps; test-writer context contract; implementation-subagent test-file prohibition; GREEN-conflict STOP; per-dispatch report shapes (RED/GREEN `n/a`); pre-commit report field-8 union across both dispatches; intra-Step technical-learnings handoff; interfaces.md ↔ implementation.md `## Step N` key-integrity guard.
- Consumes the `interfaces.md` artifact produced by `design-interfaces-artifact` (slice 1).
- No project source code is affected — this changes SAI workflow instruction files only.

## Proposal Research Documentation

- `sai/instructions/apply.md` — current single-dispatch coordinator flow, Step-Execution Subagent Dispatch, No exploration rule, RED→GREEN handling, Subagent Report Contract.
- `sai/instructions/implement.md` — first-run generation path, RED phase code contract, `<plan_template>`, scenario-list handoff to sai-4-apply.
- `sai/instructions/design.md:131-149` — "Generate interfaces.md" section: structure, `## Step N` keying, single-sourced testing stack.
- `openspec/schemas/sai-workflow/schema.yaml:143-163` — `interfaces` artifact registration.
- `openspec/specs/apply-step-delegation/`, `openspec/specs/design-interfaces-artifact/` — existing capability boundaries.

## Additional Notes

- **Spec decision resolved:** the blind test-writer MAY read existing test files/infrastructure as a fallback when the injected testing context is insufficient. Rationale: reading test files does not leak the implementation body, so it preserves the independence property; a hard ban turns any gap in the injected context into an unrecoverable invalid-RED with no self-recovery. It only relaxes the "zero research" efficiency goal.
- **Out of scope:** automated interface-amendment negotiation — amendments are mediated by the coordinator/human this slice.
- **Accepted residual limitation:** this does NOT close the independence gap in `sai-2-design` authorship (the same agent authors signatures and assertions in `interfaces.md`); it closes the dominant risk — the code-body mirroring channel at apply time.
