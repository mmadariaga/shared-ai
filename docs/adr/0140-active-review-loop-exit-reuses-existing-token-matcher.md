# ADR 0140: Active review-loop exit reuses the existing token matcher

## Status

Accepted

## Context

The post-crystallization review loop needs an explicit termination path after its native navigation menu is reduced to four options. The loop already has the item-9 bare-token and dominant-intent matcher, an active tracked-change window, and a render-only active review item. Introducing a second parser or a fifth visible option would either duplicate matching semantics or violate the native picker limit.

## Decision

Keep the four native picker options for review and `Skip`, and recognize the literal English `exit` token only while the active per-change processing window is open. Reuse the existing bare-token and dominant-intent matcher, with the dominant-intent branch requiring an English spelling variant of `exit`. Resolve only the active review item to `pending`, preserve review evidence, leave later tracked changes unprocessed, and use the existing loop-closing acknowledgment.

## Alternatives Considered

- Add a visible fifth `Exit review loop` option — rejected because the native picker is limited to four options.
- Add a separate exit parser — rejected because it would duplicate the existing token-matching semantics and create another cross-harness contract.
- Treat every occurrence of `exit` as termination — rejected because it would fire outside the active per-change window and on incidental or localized text.

## Consequences

The shared explore instruction remains the single behavior contract for Claude Code and opencode. Navigation keeps the native picker, termination is explicit through active-loop free text, and the existing evidence and render-only state rules remain unchanged.

## Provenance

Derived decision recorded in the `review-loop-exit-token` design, Decision 2.
