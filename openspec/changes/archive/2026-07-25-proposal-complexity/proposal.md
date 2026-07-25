## Why

The `sai-1` → `sai-2` boundary uses a single fixed model per harness, so a one-line markdown fix pays for the same design pass as a multi-capability architectural refactor. `tasks.md` already carries a `complexity` token that lets a future orchestrator size the `sai-3` step; extending the same idea one step earlier costs ~10–20 tokens at spec time and unlocks the same orchestrator for `sai-2` without re-tagging anything.

## What Changes

- Add a single `**Complexity**: low|medium|high` line to `proposal.md`, emitted by `/sai-1-spec`.
- Position the line as the **first line of the file, immediately preceding `## Why`**. The canonical template has no H1 title, so "top of file" is the only stable anchor; no `##` section can precede the first one, which keeps the line parser-stable.
- Allow an optional trailing parenthetical one-line justification, ignored by any parser from the first `(` onward — same audit affordance as the `**Routing**` line in `tasks.md`.
- Add a static, planning-time derivation rubric to `sai/instructions/spec.propose.md`, under a `## Complexity Derivation Rubric` section, over spec-phase signals only: capabilities count, requirements count, breaking-change flag, new dependencies, and the count of distinct affected paths named in the proposal's Impact section.
- Treat `high` as the ceiling: a change larger than `high` still emits `high`, with the overflow recorded as an Open Question in `design.md` rather than resolved by a fourth tier.
- Add the line to the proposal template at `openspec/schemas/sai-workflow/templates/proposal.md` so `/sai-1-spec` emits it by default.
- No consumer is built. `sai-2` does not read the tag; the metadata is descriptive, not prescriptive.
- Not **BREAKING**: proposals emitted before this change (and backfilled post-hoc records) remain valid without the line.

## Capabilities

### New Capabilities
- `proposal-complexity`: per-change `**Complexity**` line on `proposal.md` — closed three-tier vocabulary (`low|medium|high`), a reproducible derivation rubric over spec-phase signals, fixed position and optional parenthetical justification, and the "no consumer in this change" contract.

### Modified Capabilities
<!-- None. -->

## Impact

**Affected files**
- `openspec/schemas/sai-workflow/templates/proposal.md` — add the `**Complexity**` line above `## Why`.
- `openspec/schemas/sai-workflow/schema.yaml` (proposal `instruction:` block, lines 16–30) — describe the line so the emitting agent fills it.
- `sai/instructions/spec.propose.md` — encode the derivation rubric.

**Explicitly not touched**
- `commands/{claude,opencode,copilot}/sai-1-spec.*` and `commands/{claude,opencode,copilot}/sai-2-design.*` — no model change in this change.
- `sai/instructions/design.md` — no `sai-2` consumer.
- The per-change `.openspec.yaml` — no schema field added, no YAML frontmatter introduced.
- Archived and backfilled `proposal.md` files — no retroactive re-tagging.

**Dependencies**: none introduced.

## Proposal Research Documentation

**Local files**:
- `openspec/specs/tasks-routing-metadata/spec.md` (lines 18–20, 131–137, 165, 177–184) — vocabulary, optional parenthetical, reproducibility clause, no-consumer contract.
- `openspec/specs/tasks-scaffold-format/spec.md` (lines 24, 99–103) — `**Routing**` line position, archived-file exemption.
- `openspec/schemas/sai-workflow/templates/proposal.md` (lines 1–33) — canonical proposal template; confirmed it starts at `## Why` with no H1.
- `openspec/schemas/sai-workflow/schema.yaml` (lines 16–30) — proposal `instruction:` block.
- `sai/instructions/spec.propose.md` — where the rubric will live.
- `openspec/changes/archive/*/proposal.md` — surveyed first lines of 140 archived proposals to ground the anchor decision.

**External URLs**: none.

## Additional Notes

- **Anchor correction (grounded, differs from the original request).** The request positioned the line "between the `# Proposal:` title and `## Why`". No such title exists: `openspec/schemas/sai-workflow/templates/proposal.md:1` starts at `## Why`. A survey of 140 archived proposals found 93 starting with `## Why`, 41 starting with the `> **⚠ POST-HOC RECORD**` backfill blockquote, and only 4 with a hand-authored `# Proposal:` H1. The spec therefore anchors the line as the first line of the file, immediately preceding `## Why`, which preserves the stated intent ("top of file", parser-stable) without restructuring the template. Confirmed with the user during the spec phase.
- **Backfilled proposals are a distinct emit path.** `/sai-backfill` emits a post-hoc blockquote as line 1. Those proposals are not emitted by `/sai-1-spec` and are outside this change's mandate; the spec says so explicitly rather than leaving it inferred.
- **Deliberate asymmetry with `tasks.md`.** `tasks.md` carries all three routing tokens (`layer`, `discipline`, `complexity`) because per-step granularity gives each dimension real discrimination. At change level, `layer` and `discipline` collapse to nearly-always `cross-cutting` / `mixed`, so only `complexity` is carried. Same vocabulary, so a future orchestrator needs one mapping table, not two.
- **The tag is a hint, not a contract.** It is a coarse judgment made before `design.md` and `tasks.md` exist, so it may be mis-sized. `sai-2` is free to re-size the work and emit its own refined judgment without re-tagging `proposal.md` — the same bounded risk `tasks-routing-metadata` accepted.
- **The position invariant is a snapshot.** "First line of the file" holds against the template's current shape. If a later change adds a preamble above `## Why` — a change-id block or generated header — that change must re-anchor the line in the spec rather than let it drift. The spec states this obligation explicitly.
- **Reproducibility is uneven across the five signals.** Four are enumerable or binary (capabilities, requirements, **BREAKING**, new dependencies); the fifth reads a prose Impact section. The spec narrows it to a count of distinct literal affected paths, excluding the "explicitly not touched" list, so the weakest signal still resolves identically for two agents.
- **Rejected alternatives** (recorded so they are not re-litigated): a `.openspec.yaml` `routing.complexity` field (new parser obligation on a surface that today carries only `schema`, `created`, `approval`); YAML frontmatter on `proposal.md` (no other sai-workflow artifact uses frontmatter); the full 3-token `**Routing**` line (layer/discipline are noise at change level); auto-routing `sai-2` off the tag (no harness supports dynamic model selection in wrapper frontmatter today — the same constraint that kept `tasks.md`'s token unconsumed in its own change); a distinct `trivial|standard|complex|epic` vocabulary (breaks symmetry, forces two mapping tables).
