# ADR 0197: `next-step` is the only stage-advancement keyword

<!-- adr-index: amends 0137a -->

## Status

Accepted

## Context

ADR 0137a pinned `next-step` as the stage-advancement token and added that clear natural-language stage intent also advances the progression. The `explore-idea@1` machine never implemented that sentence: it advances only on the exact `next-step` intent and rejects any other intent in-band. The sentence therefore described a path no contract could execute. ADR 0196 already retired it as part of its empty-I-list decision, but a reader of 0137a alone still learns that natural-language intent advances stages.

## Decision

1. **`next-step` is the only advancement keyword.** The stage progression advances on the literal `next-step`, recognized by the bare-token/dominant-intent rule of 0137a: a bare token, or a turn whose dominant intent is to advance the progression. No other word or phrase is an advancement keyword; at a list stage, the user's explicit confirmation of the proposed list also advances, as Decision 3 states.
2. **The sentence "Clear natural-language stage intent also advances the progression" of ADR 0137a is retired** for every stage; this record states the retirement as the standalone stage-advancement decision. The other content of 0137a stands.
3. **Recording a list and advancing stay two ordered events sent in the same turn.** A bare `next-step` or the user's explicit confirmation of the proposed list records the list and then advances, per `sai/commands/explore/steps/common.md` § List stages. This does not change ADR 0196.

## Alternatives Considered

- **Edit ADR 0137a in place.** Rejected. ADRs are historical records; a decision change uses a new related record.
- **Keep the sentence and implement natural-language advancement.** Rejected. It adds an ambiguous trigger that the machine's intent allowlist deliberately refuses.

## Consequences

- ADR 0137a keeps its history and points readers here through the index.
- The stage-advancement vocabulary has exactly one keyword to teach and to test.
