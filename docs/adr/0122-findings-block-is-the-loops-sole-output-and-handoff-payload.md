# ADR 0122: The findings block is the loop's sole output and handoff payload

<!-- adr-index: refs 0058; refs ddr:0060 -->

## Status

Accepted

## Context

`sai-explore`'s post-crystallization review loop (item 9 of `sai/instructions/explore.md`, owned by the `explore-post-crystallization-review-loop` capability) closed a review transaction with a two-stage correction ceremony: per-finding `Accept` / `Decline` pickers iterating in deterministic order, a confirmation of the accepted set, and then a separate paste-ready `## DesignCorrectionRequest` fenced block with a `change:` header re-encoding the accepted findings. Two defects made that ceremony dead weight. First, its justification rested on a false premise: the requirement claimed "the harness pickers are single-select (per `sai/policies/remember.md`)", but `remember.md` never claims single-select for Claude Code and calls it only a default for opencode. Second, the separate `## DesignCorrectionRequest` block carried no consumer contract: only `sai/instructions/explore.md` emitted it, while `sai/policies/artifact-feedback-gate.md` consumes generic five-field findings text and never the block's format; its `change:` header duplicated the `/sai-2-design {name}` invocation scope. Once auto-handoff removed the acceptance ceremony, the block became a literal copy of the findings themselves.

## Decision

The review loop prints exactly one findings block after a closed transaction and nothing else; the block itself IS the handoff payload. The findings block presents every finding of the transaction in the shared review finding shape per `sai/policies/artifact-review-contract.md` — a severity-prefixed identifier heading (the `Finding H1`-style label) that renders the contract's `Identifier` field, followed by the contract's remaining four fields in order (`Severity`, `Artifact location`, `Issue`, `Recommended correction`) — in deterministic order (High → Medium → Low, then ascending numeric identifier within each severity), closing with the base-form `Summary:` tally. The acceptance ceremony (per-finding `Accept` / `Decline` pickers, accepted-set confirmation, in-loop filtering) and the separate `## DesignCorrectionRequest` block with its `change:` header are removed from the loop output and from the owning contract. The user pastes the findings block at the feedback gate of a re-invoked `/sai-2-design`; a user who wants to drop a specific finding removes that line when pasting, and a contested finding is declined at the downstream design gate instead.

## Alternatives Considered

- **Keep the acceptance ceremony and fix only the premise** — rejected: the premise is not the only defect; the ceremony adds a gate with no consuming contract.
- **Keep a separate `## DesignCorrectionRequest` block** — rejected: nothing consumes its format (the feedback gate parses generic five-field findings text) and its `change:` header duplicates the `/sai-2-design {name}` invocation scope.
- **Filter findings in-loop before emission** — rejected: the loop never applies or forwards corrections itself, so "auto-accept" in the loop only ever meant "include in the block".

## Consequences

- One output serves both consumers of the payload (the human reader and the design worker); deleting the redundant re-encoding removes dead weight without losing information.
- The loop's former "SHALL NOT auto-accept" clause is dropped deliberately: it described a behavior the loop could not exhibit; the read-only guarantee and downstream consent are unchanged.
- Reversing this decision means re-adding an acceptance ceremony and a re-encoded block across the owning spec, the instruction, and the contract tests — a deliberate, documented change whose reversion would ripple through the same four surfaces.

## Related

- `openspec/changes/review-loop-findings-auto-handoff/design.md` — Decision D1
- ADR 0058 — the review-loop UX expressed as deltas against the owning capabilities
- DDR 0060 — the `review-loop` literal token that enters the loop whose output this decision redefines
