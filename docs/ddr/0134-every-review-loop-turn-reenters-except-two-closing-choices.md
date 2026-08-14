# DDR 0134: Every review-loop turn re-enters except for two complementary closing choices

## Status

Accepted

## Context

The post-crystallization review loop mixed a four-option picker with an enumerated re-entry rule that named only some review transactions. New transaction kinds could therefore fall outside the list and end silently or advance accidentally. The loop also required one `Skip` per tracked change because it had no direct exit.

## Decision

Every loop turn over a change re-presents that same change's five-option picker unless the user selects one of exactly two closing choices. `Skip` advances to the next tracked change; `Exit review loop` terminates the loop immediately. Completed reviews and non-completing transactions are illustrations of the invariant rather than an exhaustive trigger list.

## Alternatives Considered

- **Extend the enumerated transaction list** — rejected because each new transaction kind could reopen the omission defect.
- **Repeat re-entry rules inside every transaction clause** — rejected because distributed closure rules can drift independently.

## Consequences

No non-closing turn may end silently, advance without `Skip`, or propose a command prompt. Consumers and contract tests can reason from the two complementary exceptions instead of maintaining an open-ended list. This is a DDR because picker re-entry is a property that must hold for every per-change loop turn.

## Provenance

User — the approved design defines complementary closing choices as the review-loop invariant.
