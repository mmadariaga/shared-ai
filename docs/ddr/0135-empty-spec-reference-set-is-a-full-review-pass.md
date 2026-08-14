# DDR 0135: An empty spec reference set still yields a full review pass

## Status

Accepted

## Context

An ordinary `/sai-1-spec my-change` invocation can carry only a change name, leaving no request text for the reviewer's reference set. Requiring intent coverage in that case would make such invocations unable to complete a review pass without inventing context from the surrounding conversation.

## Decision

When the spec-phase reference set is empty, intent coverage does not apply. The reviewer still evaluates artifact consistency, testability, and unsupported assumptions. A valid result is a full completed pass, increments the completed-pass count, and marks `review` when it reports `High=0`. The worker never synthesizes missing intent from conversation history or its own reasoning.

## Alternatives Considered

- **Reject an empty reference set** — rejected because change-name-only invocations are valid inputs.
- **Treat the pass as partial and unable to mark review** — rejected because all applicable quality axes were evaluated.
- **Recover intent from conversation context** — rejected because it violates the closed invocation and reviewer-isolation boundaries.

## Consequences

Change-name-only spec runs can produce review evidence without context pollution. The pass makes no claim about intent coverage when no intent reference exists.

## Provenance

User — `openspec/changes/spec-design-review-progress-step/design.md` Decision 4 records the invariant and all three ADR/DDR qualification criteria.

## Related

- `openspec/changes/spec-design-review-progress-step/specs/planning-artifact-review-loop/spec.md`
- `/sai-1-spec`

<!-- adr-index: refs 0133; refs 0134 -->
