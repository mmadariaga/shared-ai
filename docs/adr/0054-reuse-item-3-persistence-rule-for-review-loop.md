# ADR 0054: Reuse item 3's path-keyed Persistence rule for post-crystallization review-loop re-asks

## Status

Accepted

## Context

The post-crystallization review loop produces review turns for different artifact sets (`proposal.md` + `specs/**` vs `design.md` + `tasks.md` + `interfaces.md`) across different changes. A reader might expect new per-change tracking state to be invented, but item 3 already tracks artifacts by path and re-asks when the set changes.

## Decision

Reuse item 3's existing Persistence rule unchanged. The sai-1 set (`proposal.md` + `specs/**`) and the sai-2 set (`design.md` + `tasks.md` + `interfaces.md`) are distinct path sets, and they differ across changes, so item 3's path-keyed tracking already re-asks on any change-or-set switch and reuses the choice on a same-set repeat — no new state is needed. Item 9 only has to name, per review turn, the exact artifact set as its tracked target so item 3's rule keys on it.

## Alternatives Considered

- **Add explicit new tracking keyed on `(change, artifact-set)`** — rejected: introduces new in-conversation state and complicates the Persistence contract when the existing path-keyed rule already discriminates correctly.
- **Reuse item 3's existing rule** — chosen: zero new state, consistent with the existing contract.

## Consequences

- No new persistence machinery is added to `explore.md`.
- The language-gate re-ask behavior is inherited exactly as specified in item 3, including `--fast-track` skip semantics.
- Future changes to item 3's Persistence rule automatically propagate to the review loop.

## Related

- `openspec/changes/explore-post-crystallization-review-loop/design.md` — Decision D3
- `openspec/changes/explore-post-crystallization-review-loop/specs/explore-post-crystallization-review-loop/spec.md` — "Language gate reuse for reviews"
