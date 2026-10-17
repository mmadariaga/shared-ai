# ADR 0196: An empty Implementation Details list is a user-confirmed `- None`

<!-- adr-index: amends 0137a -->

## Status

Accepted

## Context

ADR 0137a pinned `next-step` as the stage-advancement token and added that clear natural-language stage intent also advances the progression. Two contracts then disagreed about an empty I-list. The `explore-idea@1` machine advanced an empty `implementation-details` list on an intent-less emit, while the dispatchable profile of `ready-to-propose.js` rejected a block with no in-scope `I` item. An empty list therefore reached `Crystallize` and failed validation there. Documentation, configuration, and trivial changes have no technical decision, and the rule forced no-op filler items such as an invented `I1`. The per-slice split of the `I` items was also enforced by prose only, so a duplicated or unowned `I` passed validation.

## Decision

1. **`- None` is a valid Implementation Details value of a single change.** The dispatchable profile accepts it for Plan, Direct Build, and Manual. A slice of a sliced set still owns at least one in-scope `I`.
2. **An empty I-list advances only on user confirmation.** The `Implementation details` stage proposes exactly `- None` and waits. Only `next-step` or explicit agreement records the empty list and advances. The machine no longer advances an empty I-list on an intent-less emit; the automatic `- None` recording stays for `Review edge cases` only. The issue shortcut accepts an empty implementation list, and accepting the shortcut counts as that confirmation.
3. **The sentence "Clear natural-language stage intent also advances the progression" of ADR 0137a is retired.** Advancement needs the literal `next-step` token or the user's explicit confirmation of the proposed list. Nothing advances an I-list by content or by inferred intent.
4. **The validator enforces the `I` split.** Each `I` appears exactly once across a block's two implementation sections, and in a sliced set every `I` is in scope of at least one slice. Each rule has its own violation code. A shared `I` may stay in scope of several slices.
5. **Workers define the empty case.** With `- None`, the Direct Build implementer implements the request within the Edge Cases and Capabilities, and the `/sai-1-spec` worker derives the proposal and specs from Capabilities, Request, and Edge Cases.

## Alternatives Considered

- **`- None` automatic, like the E-list.** Rejected. Nobody verifies that no decision was left undiscussed.
- **An I-list that is never empty.** Rejected. It forces filler items.
- **Each `I` in scope of exactly one slice.** Rejected. It removes the deliberate shared-item rule of the crystallization protocol.

## Consequences

- Trivial changes cost one extra confirmation turn.
- A block with `- None` gives the Direct Build implementer no technical guidance beyond the request, Edge Cases, and Capabilities.
- The I-list holds technical decisions about how to implement, not tasks; what to build travels in the request, Edge Cases, and Capabilities.
