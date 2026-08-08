# DDR 0109: "Testable" (RED block) and "divisible" (production surface) are distinct Step properties

## Status

Accepted

## Context

The pipeline's routing vocabulary used "testable" for two distinct properties: "the Step's body contains a `##### RED phase` block" and "the Step gets the two-dispatch split". ADR 0071 separated the first overload — a RED block alone no longer implied two dispatches once the Step Contract was unavailable — but the conflation persisted in the other direction: the routing condition's part 2 could still hold for a Step with no production surface, so "testable" still implied "split-eligible" even though an implementation dispatch with an empty allowed-files list cannot perform its side of the split (observed in change `2026-08-06-deterministic-worker-contract-delivery` Step 1, landed by hand in commit `413e474`).

## Decision

"Testable" describes only the RED block; "divisible" names the production-surface property — a Step whose plan-level file scope contains at least one production file (a plan-authorized file the coordinator's allowed-files derivation classifies as production, neither a test file nor a declared interface); "Split-Routed Step" names the two-dispatch outcome that requires a RED block, an available Step Contract, AND divisibility. The three terms are distinct properties of the Step vocabulary: a Step can have a RED block and still lack production surface, a Step can be divisible and lack a RED block, and only the conjunction of all three properties routes the Step to the two-dispatch flow. A RED block alone never licenses the split.

## Alternatives Considered

- **Extend the single "testable" term to mean "RED block + production surface"** — rejected: it keeps the overload the flagged ambiguity documents and gives the no-production-surface absence shape no name; a distinct **Divisible Step** term makes the property testable in glossary scenarios and pins the *Avoid* aliases (splittable step, production step, split-eligible step, "testable").

## Consequences

The routing condition states its third part in terms of a named property, the glossary separates the three terms (testable / **Divisible Step** / **Split-Routed Step**), and the flagged-ambiguity entry records the resolution. The distinctness is a property the pipeline's domain imposes on its Step vocabulary and routing vocabulary at all times — a Step can have a RED block and still lack production surface — stated as a property of the domain rather than as the mechanism that upholds it, which is why this record is a DDR.

## Provenance

Derived — the separation was reasoned from the observed dead-end and the existing flagged ambiguity; the design records it as Decision 2 with the `ddr` family marker.

## Related

- `docs/adr/0115-three-part-dispatch-routing-condition.md` — the three-part routing condition whose part 3 this property names.

<!-- ddr-index: refs adr:0115 -->
