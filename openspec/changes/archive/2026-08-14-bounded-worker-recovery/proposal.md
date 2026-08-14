**Complexity**: high

## Why

Today a routed coordinator must hand a recoverable worker failure back to the user because the shared unsuccessful outcome exposes only prose, status, and changed files, making a malformed result envelope indistinguishable from a source contradiction. This change adds a bounded, same-worker recovery path so a valid artifact whose reporting envelope failed can be repaired in the live session without weakening coordinator blindness or dispatching an amnesic replacement worker.

## What Changes

- Add an optional, immutable `recovery_policy` declaration to routed phase adapters; the design overview lifecycle opts in, while non-overview adapters remain unchanged until a later change adds eligible classes.
- Extend failed worker outcomes with a closed machine-readable `failure_class` and an `unrecoverable` veto, while keeping cancellation a clean stop that never enters recovery.
- Permit at most three same-worker continuation attempts per invocation from one shared pool, with immediate exits for blocking contradictions, worker vetoes, `needs_input`, cancellation, and continuation failure; never dispatch a replacement worker for recovery. Safe nested overview-generation re-dispatches remain within that pool and do not create an additional ordinary regeneration allowance, while non-recovery continuation failures retain today's replacement-worker fallback.
- Limit recovery eligibility to the overview-generation classes and nested `envelope-contract-violation`; coordinator-authored `outer-envelope-violation` and ordinary routed-worker failures are ineligible and hand back without retry.
- Announce every recovery attempt before it runs and make exhausted or vetoed hand-backs name the original class, attempts spent, and stopping reason without adding progress-plan steps.
- Preserve the invocation-scoped ordered `changed_files` union across the initial result, progress, continuation, recovery attempts, and terminal outcome.
- Separate nested generator `envelope-contract-violation` from coordinator-authored `outer-envelope-violation`, and propagate a valid overview generator `failure_kind` into the worker's classification channel.
- Opt the design overview lifecycle into the shared policy while preserving worker-side artifact verification, current overview state transitions, durable diagnostics, and the existing hand-back for unrecoverable or non-opted-in failures.

## Capabilities

### New Capabilities

- `bounded-worker-recovery`: A phase-adapter opt-in enables a three-attempt, same-worker continuation loop with explicit reporting and safe terminal fallback.
- `worker-failure-classification`: The protocol distinguishes worker-authored `envelope-contract-violation` from coordinator-authored `outer-envelope-violation`, with a worker-owned unrecoverability veto.

### Modified Capabilities

- `orchestration-core`: The shared coordinator contract gains the optional recovery-policy seam and owns the bounded same-worker recovery mechanics.
- `change-overview-generation-routing`: Nested generator envelope handling and failure-kind propagation; coordinator-rejected outer worker envelopes remain in the worker-failure-classification capability.

## Impact

The change affects the harness-neutral lifecycle and overview contracts and the design phase's opt-in surface:

- `sai/command-runner.md` — recovery policy lookup, attempt budget, continuation-only loop, reporting, and hand-back routing.
- `sai/worker-core.md` — additive failed-outcome classification and veto fields.
- `sai/change-overview.md` — outer-worker mapping for generator failure kinds and malformed envelopes; the five-field generator envelope remains closed.
- `sai/commands/design/coordinator.md` — opt-in declaration, same-worker recovery navigation, and visible terminal reporting without artifact inspection.
- `sai/commands/design/worker.md` — worker-side repair verification, classification production, and unrecoverability decisions.
- `openspec/schemas/sai-workflow/templates/change-overview.md` — schema wording for the unchanged generator envelope and its outer classification mapping.
- `openspec/schemas/sai-workflow/schema.yaml` — embedded overview-generation contract aligned with the shared instruction and template.
- `openspec/specs/orchestration-core/spec.md` and `openspec/specs/change-overview-generation-routing/spec.md` — active capability contracts updated for the new seam.

No application source, build configuration, or `/sai-4-apply` Known-False Report Recovery behavior is changed. The verified-precondition rule for improvised hand-backs remains a separate follow-up slice.

## Proposal Research Documentation

**Local files**: `sai/command-runner.md`; `sai/worker-core.md`; `sai/change-overview.md`; `sai/commands/design/coordinator.md`; `sai/commands/design/worker.md`; `sai/commands/apply/instructions.md`; `sai/commands/spec/coordinator.md`; `sai/commands/spec/worker.md`; `sai/commands/spec/instructions.md`; `openspec/specs/orchestration-core/spec.md`; `openspec/specs/worker-lifecycle-protocol/spec.md`; `openspec/specs/command-runner-layout/spec.md`; `openspec/specs/change-overview-generation-routing/spec.md`; `openspec/specs/change-overview-synchronization/spec.md`; `openspec/specs/progress-event-lifecycle/spec.md`; `openspec/specs/spec-research-consumption/spec.md`; `GLOSSARY.md`.

**External URLs**: None.


## Additional Notes

The current generator still returns exactly five fields: `status`, `changed_files`, `validation`, `failure_details`, and `failure_kind`. Its durable overview diagnostics and `overview.state` mappings remain unchanged for unrecovered failures; a recovered completed continuation commits `overview.state: current` and clears both diagnostics. Worker-authored `envelope-contract-violation` identifies an untrusted nested generator envelope; coordinator-authored `outer-envelope-violation` identifies a worker result rejected by coordinator validation and is ineligible for recovery. The generator's own valid `failure_kind` is forwarded unchanged.

Recovery is deliberately not a replacement-worker mechanism. A replacement has an empty journal by contract and cannot perform the repair that depends on the live worker's dispatch state. Coordinator-side artifact verification remains out of scope; the worker must verify its own repair before returning a terminal result. Generic routed-worker faults are outside the recovery scope and retain the immediate hand-back.

The requested overview language is Spanish for the later design-owned overview generation. It is invocation-scoped transport only and does not change the English language of this proposal or its specs, persist a language preference, or cause this spec phase to generate `change-overview.md`.
