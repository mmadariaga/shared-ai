# DDR 0158: The autofast implementer receives only the crystallized block

<!-- ddr-index: refs ddr:0156 -->

## Status

Accepted

## Context

The fast lane skips `design.md`, `tasks.md`, and `implementation.md`, so the implementer worker has no planning artifacts to work from. Something must define its input boundary precisely, or conversation context and repository discovery will silently substitute for the missing artifacts.

## Decision

1. The implementer receives exactly one opaque string: the marker line `--autofast` followed by the complete crystallized `Ready to Propose` block; that block is its sole substantive input.
2. No conversation context, inferred requirements, or repository discovery beyond what implementing the block requires may supplement it.
3. Functional review verifies presence of the block's Capabilities and Edge Cases in the diff — never conformance to a plan, because no plan exists (the α model).

## Alternatives Considered

- The β model — an ephemeral internal mini-plan generated before coding, giving the fix loop a plan to verify against — rejected because fast mode values functional presence, not plan conformity, and β's only benefit targets exactly that discarded axis.
- Forwarding the explore conversation as context — rejected because it contaminates the worker with negotiation history the block already distilled.
- Letting the implementer run repository discovery to infer intent — rejected because inferred intent is unverifiable against the crystallized agreement.

## Consequences

- Block quality becomes the ceiling on implementation quality; crystallization gates carry the full weight.
- The fix loop's findings are functional findings, which keeps review cheap and criterion-driven.
- Research Leads stay non-authoritative starting points, preserving their existing contract.

## Related

- `docs/ddr/0156-fast-lane-artifacts-follow-implementation.md`
