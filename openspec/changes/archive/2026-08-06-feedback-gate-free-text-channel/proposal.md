**Complexity**: low

## Why

The artifact feedback gate currently requires a separate prompt after a user chooses to give feedback, even when the harness already provides a free-text reply channel. Treating that reply as potential feedback removes an unnecessary interaction round while preserving the existing per-item judgment and gate controls.

## What Changes

- Update the single-sourced artifact feedback gate to advertise a free-text feedback channel in its question text and feedback option description.
- Treat a free-text reply to the gate as potential feedback and route it through the existing `## On "Give feedback"` per-item processing.
- Preserve the two declared options, their labels and order, the `Recommended` marker, the iteration counter, proceed labels, artifact-only scope, and all existing feedback judgments and reporting.
- Keep the rule uniform across Claude Code, opencode, and GitHub Copilot; harnesses without a free-text channel retain the existing follow-up behavior.

## Capabilities

### New Capabilities

### Modified Capabilities

- `artifact-feedback-gate`: accept a free-text reply as potential feedback and advertise that channel without changing the existing picker choices or processing semantics.

## Impact

- `sai/policies/artifact-feedback-gate.md`: canonical gate wording and free-text handling.
- `openspec/specs/artifact-feedback-gate/spec.md`: normative delta requirements and scenarios.
- No caller, coordinator, worker-lifecycle, machine-feedback, or `remember.md` changes are required because the gate remains artifact-scoped and parameterized by the existing `artifacts`, `proceed-label`, and `next-action` values.
- No new dependency, API, lifecycle payload, glossary term, or configuration is introduced.

## Proposal Research Documentation

**Local files**: `sai/policies/artifact-feedback-gate.md`; `openspec/specs/artifact-feedback-gate/spec.md`; `sai/policies/remember.md`; `sai/commands/spec/coordinator.md`; `sai/commands/design/coordinator.md`; `sai/commands/sai-1-spec.md`; `sai/orchestration/inline-invocation.md`; `sai/orchestration/worker-lifecycle.md`; `GLOSSARY.md` (absence checked); archived feedback-gate proposals.

**External URLs**: None.

## Additional Notes

- The gate question continues to name only `{artifacts}`; it does not add `{change-name}` or `sai-N` parameters, so the four consumer fetch sites remain unchanged.
- The canonical English picker question is `Share your feedback on {artifacts} below. You can also type feedback directly in the free-text box.` and the feedback option description is `Feedback on {artifacts}; you can also type feedback directly in the free-text box.` Both are rendered in the user's language per `sai/policies/remember.md`; the shared gate does not substitute harness-specific labels.
- The free-text reply is potential feedback, not automatically accepted feedback. Existing per-item judgment still decides whether to edit artifacts, discard an invalid item with a reason, or answer a question without editing.
- The two declared options remain necessary for picker APIs that reject a single-option call and remain the only declared feedback path on surfaces without a native free-text channel.
