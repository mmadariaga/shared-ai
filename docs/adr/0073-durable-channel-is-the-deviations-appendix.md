# ADR 0073: The durable channel was always the deviations appendix, not the learnings memory

<!-- adr-index: reframes 0020 -->

## Status

Accepted

## Context

ADR 0020 made the `/sai-4-apply` coordinator's technical-learnings memory deliberately ephemeral: held in conversation context, never written to `implementation.md` or any other file. It weighed three options — append to `implementation.md`, add a sidecar file, or keep the memory in context — and chose the third as the correct minimal scope for its change.

`persist-sai-learnings` wants durability. Read naively, that reverses 0020. It does not, because 0020's alternatives table did not contain the artifact this change actually promotes from.

Roughly 53% of the deviations recorded across archived `implementation.md` files are ground-truth ignorance — the plan asserted something false about the toolchain, ORM, or test harness — and several are repo-wide facts rediscovered a month apart. Those deviations are already durable: the coordinator writes them into `## Appendix: Plan vs Final Implementation`, and they are committed alongside the changes they describe. Each entry's `**Final:**` value already carries "what works instead", the property the ephemeral memory was supposed to hold uniquely.

## Decision

Record that the durable channel for execution-observed facts was never the technical-learnings memory but the **deviations appendix** — an artifact ADR 0020 did not consider — and that `persist-sai-learnings` therefore promotes from field 5 (deviations) rather than persisting field 6 (the memory).

ADR 0020's ephemerality decision stands unchanged: the in-context memory remains in-context, is still never written to any file by its own mechanism, and is still never dumped in full into a dispatch. What changes is the framing of what 0020 settled — it chose a storage medium for the memory, not a policy against durability for the facts.

ADR 0020's own Consequences section pre-authorised this path: "If a future change wants durability across sessions, it must first extend `apply-coordinator-authority`'s write scope (or introduce a new spec) before persisting learnings anywhere — this ADR's choice is not a permanent constraint, only the correct minimal scope for this change." `persist-sai-learnings` extends that write scope by exactly one named file and then promotes.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Reframe 0020; promote from the deviations appendix (chosen) | Field 5 has empirical yield — every observed category-A fact in the archive survey came from a deviation; "observed, not inferred" is satisfied by construction, since a deviation is by definition something execution surfaced | Requires stating explicitly that this is not a reversal, or a future reader will read the two ADRs as contradictory |
| Mark 0020 superseded and persist the memory itself | One ADR to read instead of two | Factually wrong: 0020's decision about the memory is still in force. Field 6 has never been persisted, so its yield is unobservable, whereas field 5's is measured |
| Leave 0020 untouched and add no ADR | Cheapest | The apparent contradiction stays unexplained in the record; the next reader of 0020 has to re-derive why a durable file exists despite it |

## Consequences

- The promotion filter reads field 5, not field 6. Field 6 remains a supplementary source for the same run and is never the sole source of a promoted entry while the appendix is present.
- ADR 0020 is **not edited**. This repository records amendment relationships in the amending ADR and in `docs/adr/0000-INDEX.md`, never by marking the amended file — verified against the `0013 amends 0012` and `0062 amends 0026` pairs, whose amended ADRs both read a bare `Accepted`.
- A run that halts before the Final sweep promotes nothing, but loses nothing either: its deviations are already committed to the appendix, and a later run over the same change promotes them from there. This property exists only because the durable channel is the appendix rather than the in-context memory.

## Related

- `openspec/changes/persist-sai-learnings/design.md` — Decision D3
- `openspec/changes/persist-sai-learnings/specs/sai-learnings-promotion/spec.md` — "Promotion source is the deviations appendix"
- `docs/adr/0020-ephemeral-in-context-technical-learnings-memory.md` — framing reframed by this ADR; its ephemerality decision is unchanged
- `sai/instructions/apply.md` — `## Learnings Promotion Pass`, `## Technical Learnings Memory`
