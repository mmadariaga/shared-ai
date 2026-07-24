# ADR 0067: Handoff provenance consumption as "premise to confirm and extend"

## Status

Accepted

## Context

When `sai-explore` includes `file:line` provenance in the `Ready to Propose` block, `sai-1-spec` could either treat those citations as settled scope (accepting and shortcutting research) or as a verifiable starting point to check and then build beyond.

## Decision

Mandate "confirm and extend" framing: `sai-1` reads cited sources first and validates them, then builds on them. The existing independent research obligation (never speculate about unread code, stop at ~80% confidence, structured research) stays unchanged. Provenance is additive, never a replacement.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Confirm and extend (chosen) | Preserves insight-divergence between explore and spec phases; shared blind spots are suppressed rather than propagated | Reclaimed research effort is not automatically banked as speed |
| Accept as settled scope | Faster spec generation when citations are accurate | Correlates the two research passes, collapsing insight-divergence; a disconfirming citation could enter specs unexamined |

## Consequences

- Delivered in the shared `sai/instructions/spec.propose.md` so it applies uniformly across Claude Code, opencode, and GitHub Copilot without touching any wrapper.
- A dead citation is neutral: `sai-1` falls back to normal from-scratch research without erroring.

## Related

- `openspec/changes/explore-handoff-evidence-provenance/design.md` — Decision D2
- `openspec/changes/explore-handoff-evidence-provenance/specs/spec-research-consumption/spec.md`
- `sai/instructions/spec.propose.md` — Research Guide handoff provenance consumption
