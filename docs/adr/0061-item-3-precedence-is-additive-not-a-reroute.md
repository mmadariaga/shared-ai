# ADR 0061: An artifact-review turn naming a tracked crystallized change is served first and then offered the loop, never rerouted into it

## Status

Accepted

## Context

`sai/instructions/explore.md` item 3 (the artifact-review language gate) and item 9 (the post-crystallization review loop) fire on identical natural language, and the spec declared no precedence between them. The change `explore-review-loop-keyword-trigger` fixes that ambiguity by declaring precedence explicitly. Declaring it requires choosing what happens to a turn that satisfies both gates — specifically, an artifact-review request naming a change that is in the chat-scoped tracked crystallized set.

Item 9's global invitation has a hard-stop semantic: answering `no` terminates the entire review section. That property is what makes the direction of precedence consequential rather than cosmetic.

## Decision

The precedence rule is **additive**. When an item-3 artifact-review turn names a change in the tracked crystallized set, item 3 produces the requested review exactly as it does today — same trigger conditions, same language gate, same Persistence rule, same read-only behavior — and then emits item 9's plain-text global sí/no invitation *after* that review. The request is never converted into the global question in place of the review.

When the same turn also fires the `review-loop` token, item 9's mixed-trigger rule governs instead: the review is served first, then the loop is entered directly and the invitation is skipped, because the token already carries the user's consent.

## Alternatives Considered

- **Reroute the review request into item 9's global sí/no question when the named change is tracked** — the more obvious reading of "declare precedence", and uniform in that one gate wins outright. Rejected: because `no` is a hard stop on the whole review section, a user who explicitly asked for a review could answer `no` to a question they did not ask for and end up with no review at all. That is a strict regression against existing behavior.
- **Token only, no precedence rule** — smaller and unambiguous. Rejected: forgetting the token restores today's behavior exactly, which is the failure state the change exists to remove.
- **Precedence rule only, no token** — nothing new for the user to memorize. Rejected: loop entry would stay dependent on the semantic detection that is already failing.
- **Additive: serve the review, then append the invitation** — chosen: it has no regression path. Whatever the user answers to the appended invitation, the review has already been delivered.

## Consequences

- A user who asks for a review of a tracked change always receives that review, and separately gains a path into the loop. `no` after the appended invitation ends the review section and leaves the already-produced review untouched; `yes` enters the per-change loop.
- Item 3's own contract is unchanged for every other turn: when the named change is not in the tracked crystallized set, item 3 behaves byte-identically to before and no invitation is appended. The rule's blast radius is bounded by tracked-set membership.
- Some turns now end with an invitation the user did not ask for. This is the accepted cost of not dropping reviews; it is one line of plain text and carries no hard-stop risk of its own.
- The token and the precedence rule ship together, so neither the "forgot the word" path nor the "semantic detection lost" path leaves the loop unreachable.
- Reversing to a reroute later would reintroduce the hard-stop regression, which is why the direction is recorded here rather than left as an implementation detail of item 3.

## Related

- `openspec/changes/explore-review-loop-keyword-trigger/design.md` — Decision D3
- `openspec/changes/explore-review-loop-keyword-trigger/specs/explore-post-crystallization-review-loop/spec.md` — "Artifact-review turns naming a tracked crystallized change also emit the invitation"
- ADR 0060 — the `review-loop` literal token that ships alongside this rule
- ADR 0054 — reuse of item 3's Persistence rule for the review loop
- ADR 0053 — post-crystallization review loop fires once per turn
