# ADR 0060: The post-crystallization review loop's explicit trigger is the hyphenated literal token `review-loop`

## Status

Accepted

## Context

`sai/instructions/explore.md` item 9 (the post-crystallization review loop) had exactly one entry path: semantic detection of a request to review the downstream artifacts of the changes crystallized in this chat. Item 3 (the artifact-review language gate) fires on overlapping natural language — its own documented positive example is `"mira los specs de oauth2-auth"` — and no precedence rule existed between the two. A turn like *"revisa los artefactos de sai-1"* satisfies both descriptions and reliably resolved to item 3's one-shot review, leaving item 9's loop unreachable in practice.

The file already contains the fix pattern: the **Emission gate** advertises a literal token (`crystallize`) in a one-line readiness signal, and firing that token acts immediately without a confirmation round-trip. Adding a second literal token to item 9 gives the loop a deterministic entry that does not depend on the semantic detection that is failing. The open question was which string that token should be.

## Decision

Use the hyphenated literal token `review-loop`, lowercase ASCII, no slash prefix. Firing it enters the per-change review loop directly, skipping the plain-text global sí/no question, because typing the token already expresses consent.

## Alternatives Considered

- **`review` or `revisar`** — shortest to type, and the words a user would reach for unprompted. Rejected: these are exactly the ambiguous words item 3 already claims. A one-word trigger reintroduces the very collision the change exists to remove, and a bare common verb cannot be distinguished from ordinary prose.
- **A slash-style pseudo-command such as `/review-loop`** — visually distinct from prose and self-evidently a command. Rejected: `sai-explore` runs inside harnesses where a leading slash is a real command namespace; a token that looks like a command but resolves to nothing invites a "command not found" experience and couples the trigger to per-harness slash-parsing behavior.
- **`review-loop`** — chosen: a hyphenated compound cannot occur incidentally in English or Spanish prose, reads as a token rather than as a sentence, and mirrors `crystallize` in being a bare word typed into an ordinary turn rather than a harness command.

## Consequences

- The review loop gains a deterministic entry path that is independent of semantic detection, and the item-3 collision no longer makes the loop unreachable.
- Users must remember one more literal token. This is mitigated by items 5 and 6, which print the token verbatim in the keep-window-open recommendation that closes every crystallization turn — single-change and sliced alike — so it is never recalled unprompted.
- The token is English-invariant and joins item 8's closed scaffolding list (bold field labels, kebab-case change name, `/sai-1-spec`, the `Open a new chat` line). A localized rendering would advertise a non-working word.
- Renaming the token later is costly in the way tokens always are: it silently breaks the muscle memory of every user who learned it, with no error message to signal the change. That irreversibility is why the string was chosen deliberately rather than by convenience.
- The token fires on intent, not substring containment (see the firing condition in item 9), so this repository's own explore sessions can discuss `review-loop` without triggering it.

## Related

- `openspec/changes/explore-review-loop-keyword-trigger/design.md` — Decision D1 (and D2 for the intent-not-substring firing rule)
- `openspec/changes/explore-review-loop-keyword-trigger/specs/explore-post-crystallization-review-loop/spec.md` — "Literal `review-loop` token enters the per-change loop directly"
- ADR 0061 — the additive item-3 precedence rule that ships alongside this token
- ADR 0053 — post-crystallization review loop fires once per turn
- ADR 0058 — gate UX tweaks expressed as deltas against existing capabilities
