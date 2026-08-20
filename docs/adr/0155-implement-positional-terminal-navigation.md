# ADR 0155: Implement terminal_navigation is positional (apply-pattern match)

<!-- adr-index: refs 0149; refs 0083; refs 0152 -->

## Status

Accepted

## Context

Standalone `/sai-3-implement` must keep printing the pinned completion that invites `/sai-4-apply {name}` in a new chat. Under `/sai-build`, implement is non-final and must transition to apply without that invitation. Ad-hoc string filtering in build would couple the supervisor to implement's message text and risk double messaging. Apply already parameterizes `terminal_navigation` by adapter position.

## Decision

Implement's phase adapter gains positional `terminal_navigation` matching apply:

- **Sole/final** (direct `/sai-3-implement`): existing standalone MANDATORY STOP completion literal inviting `/sai-4-apply {name}` (--fast-track) in a new chat.
- **Non-final** (build phase 1): communicate summary + changed-files only; invoke only the composition-owned authorized transition to position 1; never print the standalone completion literal.

Failed/cancelled never fire standalone completion or composition transition in any position.

## Alternatives Considered

- **Leave implement always printing standalone completion; build suppresses ad hoc** — rejected; couples build to string filtering and risks double messaging.
- **Parameterize by adapter position in the shared adapter field** (chosen) — matches apply and keeps suppression inside the adapter contract tests already pin.

## Consequences

- Standalone implement completion text remains pinned in existing tests.
- Build composition transitions without inventing a second completion channel.
- The completion string stays in `implement/coordinator.md` (invocation owns no terminal message).

## Provenance

Derived — `openspec/changes/sai-build-command/design.md`, Decision D3.
