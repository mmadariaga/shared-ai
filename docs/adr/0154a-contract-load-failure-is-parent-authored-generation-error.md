# ADR 0154a: Contract-load failure is parent-authored generation-error

<!-- adr-index: -->

## Status

Accepted

## Context

When the dispatched overview-generation subagent cannot load the shared generation contract (`@sai/commands/design/change-overview.md`), it cannot know the five-field envelope shape, the closed `failure_kind` vocabulary, or the overview path convention defined there. The minimal dispatch prompt (ADR 0152a) forbids carrying those norms as a fourth prompt element, and the no-improvisation rule prohibits the subagent from filling gaps from conversation context, worker prompt paraphrase, or the workflow schema's embedded instruction text.

The design worker (the parent) already owns a parent-authored `generation-error` route — the process-loss mapping — that requires no generator-side contract knowledge.

## Decision

On contract-load failure the subagent returns nothing usable; the parent classifies this route as `generation-error` using the existing process-loss mapping: `status: failed`, `changed_files: [openspec/changes/{change-name}/change-overview.md]` (the potentially affected overview path), `validation: not-performed`, non-empty English `failure_details` naming the load failure and contract path, and `failure_kind: generation-error`. The subagent does not self-classify, does not produce a five-field envelope, and does not improvise — it returns nothing usable, and the parent classifies the route.

The parent does not use `failure_kind: dispatch-failed` for this route. The dispatch itself succeeded; only the contract load failed. `dispatch-failed` remains reserved for a dispatch that never ran.

## Alternatives Considered

- **Self-classify at the generator on contract-load failure** — rejected; the generator cannot know the five-field envelope shape or the closed `failure_kind` vocabulary from the very file whose load failed, so self-classification would require improvising those norms, which is the behavior this change prohibits.
- **Classify as `dispatch-failed`** — rejected; the dispatch itself succeeded (the subagent ran), only the contract load failed. `dispatch-failed` is reserved for a dispatch that never ran.
- **Carry contract norms as a fourth prompt element so the generator can self-classify** — rejected; violates the minimal-prompt requirement of ADR 0152a.

## Consequences

- The minimal dispatch prompt (ADR 0152a) stays intact: no fourth prompt element carries contract norms.
- The no-improvisation rule is absolute: the generator never improvises generation from conversation context, worker prompt paraphrase, or the workflow schema's embedded `instruction:` text.
- The parent must distinguish "no result returned" (process loss → `generation-error`) from "malformed result returned" (envelope-contract-violation); this distinction is already handled by the existing process-loss vs. envelope-contract-violation split.

## Provenance

derived — the contradiction between the minimal prompt (forbidding contract norms in the prompt) and the generator self-classification (requiring contract norms from the file whose load failed) is resolved by routing through the parent's existing process-loss path. The `generation-error` classification (not `dispatch-failed`) is reasoned from the subagent having been dispatched but failing to produce a result — the dispatch itself succeeded.
