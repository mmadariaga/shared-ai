**Complexity**: medium

## Why

When coordinator verification disproves a subagent report for a clear, safe, in-scope execution mistake, `/sai-4-apply` currently halts even though the correction is mechanically known. The workflow needs one bounded recovery attempt so confirmed false reports do not create avoidable human intervention loops.

## What Changes

- Define when coordinator evidence is authoritative over a Subagent Report that it contradicts.
- Compare observed changed paths with a dispatch-kind-specific allowed-file set and a pre-dispatch working-tree baseline when detecting report discrepancies.
- Preserve split-dispatch boundaries: test-writer work may touch only tests and explicitly permitted RED/interface stubs, while implementation work may touch only production files and never tests or declared interfaces.
- Permit one bounded Recovery Dispatch with structured `Reported`, `Evidence`, `Cause`, `Correction`, and `Verification` context.
- Re-run the normal coordinator Verification Checklist after recovery and continue only when it passes.
- Preserve human intervention for ambiguity, unsafe or destructive corrections, scope expansion, and failed recovery.
- Do not add an advisor tier or a new Subagent Report field.

## Capabilities

### New Capabilities

<!-- Capabilities being introduced. Each becomes specs/<name>/spec.md. Use kebab-case. -->

### Modified Capabilities

- `apply-coordinator-verification`: add bounded recovery for known-false Subagent Reports contradicted by coordinator evidence.

## Impact

- `sai/instructions/apply.md` — coordinator discrepancy handling and Recovery Dispatch contract.
- `openspec/specs/apply-coordinator-verification/spec.md` — normative capability requirements and scenarios.

No new dependency, API, report field, or harness-specific wrapper behavior is introduced.

## Proposal Research Documentation

**Local files**: `sai/instructions/apply.md`; `sai/commands/sai-4-apply.md`; `openspec/specs/apply-coordinator-verification/spec.md`; `openspec/specs/apply-subagent-report-contract/spec.md`; `sai/orchestration/coordinator-contract.md`; `GLOSSARY.md`.

**External URLs**: None.

## Additional Notes

The existing coordinator re-runs only the Step's Verification Checklist and currently surfaces any disagreement. For file-scope checks, it must compare the post-dispatch state with a pre-dispatch working-tree baseline of tracked and untracked paths and a dispatch-kind-specific allowed-file set derived from the Step. A safe automatic correction is limited to reversible cleanup of a path absent from that baseline and newly created by the current dispatch; unknown, pre-existing, shared, destructive, or unauthorized changes remain human decisions. Recovery must stay inside the current Step and existing implementation plan; cleanup only undoes the current dispatch's own scope violation and is not feature work. Multiple confirmed contradictions in one Step/report handling cycle are aggregated into one recovery attempt and one recovery block. It must not change the fixed nine-field report contract or the existing telemetry semantics. The corrective prompt is coordinator-authored from known evidence rather than delegated to an advisor.
