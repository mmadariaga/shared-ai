# DDR 0109a: The delegation envelope's status is reserved for dispatch outcomes; check verdicts travel only in the output payload

## Status

Accepted

## Context

`sai-explore` delegates its three OpenSpec prerequisite checks to exactly one budget subagent per invocation (`main-agent-shell-containment`). The budget-subagent binding (`skills/claude/budget-subagent/SKILL.md` and `skills/opencode/budget-subagent/SKILL.md`) pins the completion report's envelope `status` to the closed vocabulary `success | partial | failed` with exactly four fields — the same envelope every budget-subagent consumer shares. The change's original specs required the subagent's completion report to carry the check verdict as envelope `status: pass` / `status: halt`, which contradicted the binding. A user-approved in-place amendment (`approval.specs.amendment`, 2026-08-08T14:47:44Z) resolved the contradiction: the binding's envelope wins, and the verdict rides in the report's `output` field.

## Decision

The delegation envelope's `status` field is reserved for dispatch outcomes and never carries a check verdict. The verdict travels in the completion report's `output` payload as `verdict: pass` or `verdict: halt` (with the verbatim remediation literal from `sai/policies/prereqs-check.md` included on halt). An envelope `failed` or `partial` is a dispatch failure — not a pass or halt verdict — and must not be presented as one.

## Alternatives Considered

- **Extend the envelope vocabulary with `halt`** — rejected: violates the closed vocabulary shared by every budget-subagent consumer.
- **Return a bare boolean without the literal** — rejected: `halt-message-fidelity` requires the verbatim remediation literal to cross the process boundary.

## Consequences

The contract is now pinned in the change's specs (`explore-prereqs-delegation`, `halt-message-fidelity`) and the amendment record; reversal needs a further amendment. The decision states a property that must hold of the delegation report at all times — an invariant of the pipeline domain rather than a mechanism that upholds it — which is why this record is a DDR.

## Provenance

User — the user resolved the contradiction explicitly in the in-place amendment (`approval.specs.amendment`, 2026-08-08T14:47:44Z).
