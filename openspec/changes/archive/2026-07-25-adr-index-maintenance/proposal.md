## Why

`sai-3-implement` Step 3 is the single physical site that creates `docs/adr/NNNN-slug.md` files, yet nothing keeps the relational `docs/adr/0000-INDEX.md` current as ADRs accumulate — the hand-curated index drifts out of sync the moment a Step 3 run writes an ADR. No capability spec governs Step 3's ADR-creation behavior today, so the maintenance rule must be added as a new spec with a cold-build (when the index is absent) and an incremental warm-splice (when present) path, both driven from a referenced template file so `implement.md` stays thin.

## What Changes

- Extend `sai-3-implement` Step 3 so that, at the **end of Step 3** (after every ADR the current Step 3 run has actually written), it maintains `docs/adr/0000-INDEX.md`:
  - **Cold build** — when `docs/adr/0000-INDEX.md` is absent, build the full categorised, relational index over every ADR in `docs/adr/` from the shared template.
  - **Warm splice** — when the index exists, splice only the session's newly-created ADR(s) into the existing structure: insert into the correct By-command and/or cross-cutting sections, annotate relationships (Pair with / Refs / Amends / Supersedes), move superseded ADRs into the historical list per template Rule 6, and add correction-table rows.
- Introduce a new referenced, **project-agnostic** template file consumed by Step 3 (not inlined): the cold-build boilerplate for the relational index lives at `sai/instructions/_templates/adr-index.md`; `implement.md` references it by exact path. The template carries only the section skeleton (H1 `# ADR Index` + five `##` canonical sections); it carries NO baked-in domain-unit snapshot (no `### /sai-N-*` command subsection names, no `### Repo layout…/### Doctor` cross-cutting subsection names). The cold build derives the domain units (commands, cross-cutting categories) from the ADRs' own content at cold-build time, so the same template produces a correct relational index in any SAI consumer project, not only this repository.
- Extend `sai-3-implement` Step 3's ADR-creation behavior so that when it creates an ADR that declares a relationship (amends / supersedes / reverses / reframes / refs / pairs with), it SHALL emit a structured, parseable relationship line in the ADR file itself (e.g. `<!-- adr-index: supersedes 0002; amends 0003 -->` or a `## Relationships` section). The index-maintenance hook reads this structured line deterministically; prose parsing is a best-effort fallback for hand-written ADRs that predate this requirement.
- Introduce the **idempotent-on-rerun** contract: if an ADR already has an entry line in the index, the warm path MUST NOT duplicate it (detection keys on an actual entry line for the ADR number, not on the bare link target appearing anywhere, which would false-positive against the correction table and supersede notes).
- **BREAKING**: none. ADR files created by hand outside `sai-3` are not seen by the warm path (it only knows the session's ADRs) — this is an accepted trade-off, not a breaking change.

## Capabilities

### New Capabilities

- `adr-index-maintenance`: Governs `sai-3-implement` Step 3's post-ADR-write maintenance of the relational `docs/adr/0000-INDEX.md` — cold-build from the project-agnostic shared template (deriving the domain units — commands and cross-cutting categories — from the ADRs' own content at cold-build time) when the index is absent, and incremental warm-splice of the session's newly-created ADRs (insert, annotate relationships read from each ADR's structured relationship line, move superseded entries, add correction-table rows, idempotent on rerun) when the index exists. Also governs Step 3's emission of a structured, parseable relationship line in any ADR it creates that declares a relationship.

### Modified Capabilities

<!-- None. Step 3's ADR-creation behavior is currently ungoverned by any spec (verified: docs-sync touches ADR-0003 amendment state; sai-workflow-schema touches design.md template ADR/DDR sections; proposal-research-documentation lists ADRs as docs read — none governs what Step 3 does when it writes an ADR file). -->

## Impact

- **Instruction files** — `sai/instructions/implement.md` Step 3 gains the index-maintenance hook (cold + warm branches) and a "Required Documentation" pointer to the template and an example ADR for relationships.
- **New template** — `sai/instructions/_templates/adr-index.md` (cold-build boilerplate carrying only the section skeleton — ADR Index H1, Conventions, By command, Cross-cutting categories, ADRs that extend or correct prior ones correction table, Superseded ADRs (historical) — with NO baked-in domain-unit snapshot; the `## By command` and `## Cross-cutting categories` sections carry only empty placeholder skeletons, and the cold build derives the actual subsection names from the ADRs' own content).
- **No production code touched** beyond instruction/template artifacts — no `bin/`, `commands/`, `skills/`, or test files. The change is instruction-only.
- **No spec currently governs Step 3's ADR-creation behavior** — confirmed by research; the new `adr-index-maintenance` capability spec fills that gap.
- **Harness-agnostic and project-agnostic** — `implement.md` and the template are shared instruction files fetched unchanged by all three harness wrappers (Claude Code, opencode, Copilot) and installed into every SAI consumer project; the warm branch is new instruction the existing template does not cover, applied identically across harnesses, and the project-agnostic template skeleton means cold-build produces a correct relational index in any consumer project (not only this repository).

## Proposal Research Documentation

**Local files**:
- `sai/instructions/implement.md` — Step 3 "Validate Design Decisions for ADR/DDR" (~line 95): the hook site; current text "If the project already maintains ADRs/DDRs, create the file directly without asking." Confirmed as the single ADR-creation site.
- `sai/instructions/spec.propose.md` — "ADR/DDR Proposal Check" + "Required Documentation discipline" + "Handoff provenance consumption" + Cost Discipline rules.
- `docs/adr/0000-INDEX.md` — the existing hand-curated relational index (the cold-build template source): "By command", "Cross-cutting categories", "ADRs that extend or correct prior ones" correction table, "Superseded ADRs (historical)"; in-line annotation patterns (`*Pair with NNNN*`, `— Refs NNNN`, `**Amends** 0026`, `*Superseded by [0004]*`).
- `docs/adr/0001-sai-separate-harness-files.md` — sample ADR file shape: H1 `# ADR NNNN: {Title}`, Status/Context/Decision/Alternatives Considered/Consequences sections; the exact H1 form the warm path preserves (template Rule 7).
- `docs/adr/0004-source-layout-and-install-path-restructure.md` — the Supersedes exercise pattern (supersedes 0002, amends 0003, 0001 remains valid via `skills/`); the relationship the warm splice must move correctly.
- `openspec/schemas/sai-workflow/templates/` — directory listing confirms there is NO existing ADR-index template among the artifact templates (`design.md`, `implementation.md`, etc.) — supports placing the new template at `sai/instructions/_templates/` per chosen convention.
- `openspec/specs/` — directory listing confirms no spec governs Step 3's ADR behavior: closest tangential specs are `docs-sync`, `sai-workflow-schema`, `proposal-research-documentation` — none creates the Step 3 maintenance rule.
- `GLOSSARY.md` — reviewed; ADR/index are general programming concepts excluded by the glossary's own scope rule, so no new term is added.

**External URLs**:

(none — all research used local files; openspec CLI and SAI instruction files only.)

## Additional Notes

- The cold-vs-warm axis is cost, not relational-vs-mechanical: the relational model applies in both branches. Cold fires once (when the index is absent) and is expensive; warm fires thereafter and touches only the session's ADRs, so it is cheap.
- The provided `docs/adr/0000-INDEX.md` is effectively the cold-branch source — its structure already encodes the relational boilerplate the template must reproduce (the four canonical sections + the correction table). The cold branch reuses that structure near-verbatim; the warm splice is the novel authored instruction the template does not cover today.
- **Accepted limitation**: the warm incremental path cannot recompute global structural thresholds (a cross-cutting category appearing in ≥2 ADRs earns its own subsection; the 8–12 target count; fewer than 8 collapses to a single list) without a full pass. Minor category/threshold drift between cold builds is accepted; no on-demand rebuild mode is provided (YAGNI).
- **Known scope boundary**: ADRs created by hand outside `sai-3` Step 3 are not visible to the warm path (it only knows the session's ADRs) — the index stays faithful only along the Step 3 path. This is documented as an accepted trade-off, not a defect.
- Template file naming convention: `sai/instructions/_templates/` is the chosen location (underscore-prefixed to mark it private/non-fetched), following the existing `sai/instructions/` grouping pattern; this diverges from `openspec/schemas/sai-workflow/templates/` because the ADR index is an implement.md template, not an OpenSpec artifact template.
- The H1 `# ADR NNNN: {Title}` form and the in-line relationship annotation form (`*Pair with NNNN*`, `— Refs NNNN`, `**Amends** NNNN`, `*Superseded by [NNNN]*`) are the existing ADR/index conventions the spec's source-grounding rules preserve verbatim (template Rule 7, 8, 10 in the existing `0000-INDEX.md`).
- The warm supersede-move rule follows template Rule 6 faithfully: a superseding ADR moves the superseded one out of the By-command / cross-cutting sections into "Superseded ADRs (historical)" while keeping its line with a `*Superseded by NNNN*` note AND adds a correction-table row — without clobbering unrelated hand-curated content.
