# ADR 0185: Remove hang rationale from sibling dispatch, keep recovery isolation

<!-- adr-index: amends 0172d -->

## Status

Accepted

## Context

ADR 0172d chose sibling worker dispatch for the fast lane over one long-lived mega-subagent. It cited two reasons: nesting pushes delegation depth past two, where an un-pre-approved permission prompt cannot render and hangs the session on opencode (anomalyco/opencode#13715), and nesting forces interview `needs_input` payloads to bubble through an intermediate worker, corrupting the opaque input history and verbatim-forwarding contracts.

The depth and `needs_input` hangs are fixed in opencode v2, so the hang justification is obsolete. The sibling decision itself still stands on its remaining ground: independent failure under Bounded Recovery and context hygiene across phases with different lifecycles. The path-composition rule stays as prompt hygiene with its observed dropped-segment evidence, and dual `subagent_depth` 2 plus doctor/installer validation stays for v1 compatibility. Users still on opencode v1 stay exposed to the hang if nesting at depth >= 2.

## Decision

Amend ADR 0172d (do not rewrite it — it stays historically accurate):

1. Every fast-lane phase stays a sibling dispatch from the coordinating session; no worker nests another phase's execution inside itself.
2. The retained justification is recovery isolation and context hygiene: each segment keeps its existing card byte-intact and fails independently, and cheap judgment-free mutations stay out of the expensive implementation context. The #13715 hang justification is removed.
3. The v1/v2 note is kept: the hang is fixed in opencode v2; opencode v1 users nesting at depth >= 2 remain exposed.
4. The only nested delegation permitted stays the backfill worker's read-only `budget-explorer` conflict scan at depth 2.
5. The coordinator still sequences siblings, resolves their gates, and owns the changed-files union across segments.
6. Dual `subagent_depth` 2 (top-level and `experimental`) plus doctor and installer depth >= 2 checks stay unchanged for v1 compatibility; relaxing them gives no benefit.
7. The path-composition rule stays as hygiene; only its hang sentence is removed. The active fetch-path-composition spec is rebalanced from hang to prompt hygiene by the normal flow; archived changes are not rewritten.

## Alternatives Considered

- **Full archive of 0172d and allow nesting** — rejected: no benefit, and it reopens context contamination across phases with different lifecycles plus double-hopped asks.
- **Delete depth validation and dual config** — rejected: breaks v1 compatibility with no benefit.
- **Rewrite 0172d in place** — rejected: decision records are historical; editing it would falsify what was decided when the hang was live.
- **Leave the obsolete hang rationale** — rejected: it misleads v2 readers into keeping a constraint for a fixed bug.

## Consequences

- ADR 0172d remains in force outside history; this record (0185) is the rationale authority. Readers who need the original why start at 0172d; readers who need the current why land here.
- Coordinator-side sequencing stays slightly more explicit than a single dispatch would be.
- Depth stays within every surface's demonstrated envelope; no new permission-scope territory is opened.
- A v1 compatibility note is carried after the fix so v1 users are not misled.
- Keep slightly explicit coordinator sequencing over a single mega-dispatch.

## Related

- ADR 0172d — Sibling worker dispatch for the fast lane; its Context hang citation is retired, its Decision topology is kept.
- `docs/ddr/0157-fast-lane-validation-and-mutation-stay-in-separate-actors.md`
- `docs/ddr/0143b-budget-explorer-out-of-root-access-is-purpose-bound.md`
- `skills/opencode/fetch/SKILL.md` — path rule kept, hang sentence removed.
- `configs/opencode.jsonc` — dual `subagent_depth` 2 retained.
