## Why

During `sai-4-apply`, the main thread accumulates execution noise that pollutes its context: read-before-write file dumps, RED-test tracebacks, and the "fix GREEN until it passes" iteration loop. This degrades the context quality of the very agent that coordinates commits and human gates. Delegating each Step's execution to a subagent keeps the coordinator's context small and clean while preserving every guarantee of the current workflow. A secondary problem: each subagent starts cold and may bang against friction a prior subagent already resolved (symbols that don't exist, real API signatures, version incompatibilities) — the coordinator must carry those learnings forward.

## What Changes

- `sai/instructions/apply.md`: the main thread becomes a **coordinator** that, per Step, dispatches a same-model subagent to execute the Step's implementation body (RED→GREEN, read-before-write), then re-runs the Step's Verification Checklist itself before marking checkboxes and handling the human commit gate.
- The subagent absorbs all execution noise and returns a compact structured report; it never commits, never touches git, never marks checkboxes, never crosses a STOP & COMMIT.
- The coordinator holds an accumulated **technical-learnings memory** across Steps and selectively re-injects relevant entries into each subagent's dispatch (never a full dump).
- **BREAKING** (within sai-4-apply): checkbox-marking granularity shifts from "per item, immediate" to "per Step" — the coordinator marks the Step's checkboxes upon receiving and verifying the report, superseding the current "mark immediately, do not batch" rule for this phase.

## Capabilities

### New Capabilities

- `apply-step-delegation`: The coordinator walks `implementation.md` sequentially and dispatches each unchecked Step to a same-model subagent that executes the implementation body and absorbs execution noise; checkboxes are marked per Step.
- `apply-coordinator-authority`: Only the coordinator writes `implementation.md` (checkboxes + deviations appendix), and the subagent is barred from git, commits, checkbox marking, and crossing STOP & COMMIT; the human commit gate stays in the main thread.
- `apply-coordinator-verification`: The coordinator re-runs the Step's Verification Checklist itself before marking or committing — it never marks or commits on the subagent's word.
- `apply-subagent-report-contract`: The subagent returns a compact, fixed-field report (step, per-item status, RED result, GREEN result, deviations, technical learnings, STOP reached).
- `apply-technical-learnings-memory`: The coordinator accumulates reusable technical learnings from each report and selectively re-injects relevant entries into later subagents, without dumping the whole memory.

### Modified Capabilities

- None. (The per-item checkbox-immediacy rule lives in `apply.md` prose, not a discrete capability spec; the new per-Step granularity is asserted within `apply-step-delegation`.)

## Impact

- **Affected instructions**: `sai/instructions/apply.md` (workflow loop, checkbox timing, STOP & COMMIT checklist, deviations appendix ownership).
- **Affected capability specs**: new `apply-*` specs listed above; existing `apply`, `apply-human-verification-gate`, and `apply-final-sweep` requirements remain in force and must keep holding under the delegated model.
- **No production application code**: this change only modifies SAI workflow instructions/specs.
- **Out of scope**: parallelism across Steps; cost/token optimization; any SAI phase other than sai-4-apply.

## Proposal Research Documentation

**Local files**: `sai/instructions/apply.md`, `sai/instructions/remember.md`, `openspec/specs/apply/spec.md`, `openspec/specs/apply-human-verification-gate/spec.md`, `openspec/specs/implementation-progress-tracking/spec.md`, `openspec/specs/copilot-checkbox-discipline/spec.md`, `openspec/changes/archive/2026-05-22-enhanced-apply-steps/proposal.md`

**External URLs**: none

## Additional Notes

- The current per-item immediacy rule is asserted in `apply.md` (item 21: "When ANY checkbox item is completed, you MUST immediately mark it `[x]` ... Do not batch") and `remember.md` ("mark each immediately after the task is verified complete"). Under delegation the coordinator does not execute items; it marks the Step's checkboxes immediately after it verifies the Step. Downstream design/implementation must reconcile the apply.md prose with the per-Step granularity.
- "Same model as the coordinator" is a hard requirement: the budget/cost-discipline skills route research subagents to cheaper tiers, but the apply executor subagent must match the coordinator's model so RED→GREEN judgment does not degrade. This is an explicit exception to the default budget-executor routing.
- The deviations appendix format and the STOP & COMMIT 4-step gate already defined in `apply.md` are unchanged in content — only their writer (coordinator, from the report) is pinned.
- Subagents never communicate with each other; the learnings memory is the only cross-Step channel, and it is mediated entirely by the coordinator.
