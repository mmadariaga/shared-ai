# ADR 0018: Per-Step checkbox override scoped locally to the apply runner, not remember.md

## Status

Accepted

## Context

`sai/policies/remember.md` defines a global checkbox-discipline rule loaded by every `sai-*` command: "mark each `- [ ]` as `- [x]` as soon as its task is verified complete." `delegate-apply-steps-to-subagent` requires `sai-4-apply` specifically to mark a Step's checkboxes as a single batched update (after the coordinator's own verification and the Human Verification gate), not per item — because the coordinator no longer executes items directly; it only receives a subagent's Step-level report.

This is a direct, intentional contradiction of `remember.md`'s general rule, scoped to exactly one phase.

## Decision

Leave `remember.md` unmodified as the global default. State the override locally, inline, in `sai/commands/apply/runner.md`: for `sai-4-apply`, checkboxes are marked per Step (batched, post-verification), not per item — this supersedes `remember.md`'s default for this phase only.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Add a phase-conditional clause to `remember.md`'s global rule | Single source of truth for checkbox discipline | `remember.md` is loaded by every `sai-*` command; embedding phase-conditional logic there adds cross-cutting fragility for a rule that applies to exactly one phase |
| State the override locally in the apply runner only (chosen) | Matches the proposal's own framing ("supersedes... for this phase"); keeps `remember.md` as the unmodified global default; the exception is visible exactly where it applies | A reader of `remember.md` alone would not know `sai-4-apply` behaves differently unless they also read the apply runner |

## Consequences

- `remember.md`'s mark-each-on-verification rule remains accurate for every `sai-*` command except `sai-4-apply`; readers must consult `sai/commands/apply/runner.md` for the phase-specific exception.
- A future edit to `remember.md`'s general checkbox rule does not need to account for `sai-4-apply`'s batching behavior, since the override lives entirely in the apply runner.
- If a future maintainer "reconciles" the two files by deleting the local override in the apply runner (assuming it was an oversight rather than deliberate), the coordinator would silently revert to per-item marking, which is incompatible with the per-Step subagent report contract.

## Related

- `openspec/changes/delegate-apply-steps-to-subagent/design.md` — Decision D2
- `openspec/changes/delegate-apply-steps-to-subagent/specs/apply-step-delegation/spec.md` — "Checkboxes are marked per Step, not per item"
- `sai/policies/remember.md` — unmodified global checkbox-discipline rule
- `openspec/changes/delegate-apply-steps-to-subagent/proposal.md` — "**BREAKING** (within sai-4-apply)"
