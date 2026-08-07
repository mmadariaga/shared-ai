# adr-index-maintenance Specification

## Purpose

This capability governs `sai-3-implement` Step 3's post-ADR-write maintenance of the relational `docs/adr/0000-INDEX.md`. The capability is the ADR-side instantiation of the abstract surface defined in `decision-record-index-machinery`. The capability inherits the canonical section skeleton, the `<domain unit>` noun derivation procedure, the cross-cutting threshold contract, the relationship-token rules, the link-form rules, and the four index-output invariants from the abstract surface; this spec declares the three per-index bindings (storage directory, index filename, index H1), the two type-specific section headings (correction-table heading, historical-section heading), and the per-ADR behavior (entry-line form, structured-relationship-line format, correction-table header) that the abstract surface does not subsume.

This capability was previously written against hardcoded values — the storage directory `docs/adr/`, the index H1 `# ADR Index`, the mapping rules and their precedence, the fallback noun, the cross-cutting thresholds — all appeared verbatim in the spec text. This change delegates every one of those parameterizable values to the new abstract surface, where the framework values are pinned as the contractually-defined defaults for unconfigured projects.

This slice ships the abstract surface instantiated for the ADR family only. The cross-family `supersedes` rule and the cross-family `refs` / `amends` / etc. rules are part of the abstract surface and bind this slice from this point forward; their observed effect differs in this slice — the `supersedes` family-boundary restriction is dormant (no cross-family supersede exists in the corpus), while the cross-family link form and `<family>:NNNN` encoding codify behavior already present in the live ADR index, which already links to DDR records.

## Requirements

### Requirement: Step 3 shall maintain the ADR index after creating ADR files

After `sai-3-implement` Step 3 validates design decisions against the three ADR/DDR criteria and writes one or more `docs/adr/NNNN-slug.md` files in the current Step 3 run, Step 3 SHALL enter one index-maintenance branch for the full session ADR set — exactly one maintenance cycle at the end of Step 3 — choosing the branch by the absence or presence of `docs/adr/0000-INDEX.md`:

- Cold build — when `docs/adr/0000-INDEX.md` is absent.
- Warm splice — when `docs/adr/0000-INDEX.md` exists.

The maintenance cycle runs once per Step 3 invocation over the ADRs the current run created; it SHALL NOT run per-file. When Step 3 created no ADR files in the current run, no maintenance cycle executes and the hook is a no-op.

#### Scenario: Step 3 end-of-run with zero ADRs created

- **WHEN** the current `sai-3-implement` Step 3 run created no `docs/adr/NNNN-slug.md` files (no design decision met all three ADR criteria, or the user declined ADR creation for each)
- **THEN** Step 3 SHALL NOT touch `docs/adr/0000-INDEX.md` and SHALL NOT print any index-maintenance instruction into `implementation.md`; the hook is a no-op for this run

#### Scenario: Step 3 end-of-run after the hook decides per-invocation state

- **WHEN** Step 3 has finished writing its ADR(s) for the current run and reaches the end of Step 3
- **THEN** exactly one index-maintenance cycle SHALL run, covering every ADR the current run created, before Step 3 yields control to Step 4

### Requirement: ADR index parameterization binds the three per-index parameters and the two type-specific section headings

The ADR index inherits the abstract surface from `decision-record-index-machinery` and binds its parameters as follows.

The three per-index bindings:

1. **Storage directory**: `docs/adr/`.
2. **Index filename**: `0000-INDEX.md`.
3. **Index H1**: `# ADR Index`.

The two type-specific section headings (positions #4 and #5 in the canonical section skeleton):

4. **Correction-table heading**: `## ADRs that extend or correct prior ones`.
5. **Historical-section heading**: `## Superseded ADRs (historical)`.

The `<domain unit>` noun substituted into `## By <domain unit>` is the derived value the cold build computes from the abstract surface's mapping list and the ADRs' content. The ADR index SHALL NOT be bound to any one noun at the spec level; the cold build produces the noun (e.g. `command` in this repository, `module` / `endpoint` / `package` / `service` in other projects).

The ADR-specific H1 `# ADR Index` is preserved verbatim across cold-build, warm-splice, and rerun, per the abstract surface's "index-output invariants".

#### Scenario: ADR index binds its three per-index parameters and the two type-specific section headings

- **WHEN** a maintainer reads this spec's "ADR index parameterization" requirement
- **THEN** the three per-index bindings are exactly `docs/adr/`, `0000-INDEX.md`, `# ADR Index`
- **THEN** the two type-specific section headings are exactly `## ADRs that extend or correct prior ones` and `## Superseded ADRs (historical)`
- **THEN** the `<domain unit>` noun is NOT a per-index binding — it is a derived value the cold build computes

#### Scenario: Cold build derives `## By command` for the ADR index in this repository

- **WHEN** the cold build runs in this repository, whose ADRs reference commands
- **THEN** the abstract surface's framework mapping list applies, the `slash-command → command` rule matches the most ADR references, and the cold build substitutes `command` into `## By <domain unit>`, yielding `## By command` for `docs/adr/0000-INDEX.md`
- **THEN** the cold-build output is consistent with the live `docs/adr/0000-INDEX.md` H2, which already reads `## By command`

### Requirement: Index template shall be a referenced, project-agnostic skeleton file consumed by Step 3

The cold-build boilerplate for the relational ADR index SHALL live as a separate template file at `sai/instructions/_templates/adr-index.md`, referenced by `sai/instructions/implement.md` via exact path. Step 3 SHALL NOT inline the index boilerplate into `implement.md`. The template file's structure SHALL mirror the abstract surface's canonical section skeleton (H1 `# ADR Index`, then the five `## ` sections in canonical order: `## Conventions`, `## By <domain unit>`, `## Cross-cutting categories`, `## ADRs that extend or correct prior ones`, `## Superseded ADRs (historical)`). The `## By <domain unit>` H2 SHALL carry the **literal placeholder `<domain unit>`** in the template (per the abstract surface — the placeholder is what the cold build substitutes, never a concrete noun). The template SHALL be **project-agnostic**: (a) the `## By <domain unit>` and `## Cross-cutting categories` sections carry only empty placeholder skeletons; (b) the `## By <domain unit>` H2 carries the literal placeholder `<domain unit>`, not the concrete word "command"; (c) the template SHALL NOT bake in any project-specific domain-unit snapshot, command names, category names, or ADR entries.

The mapping rules, fallback noun, threshold values, and relationship-token rules that govern what the cold build substitutes into `<domain unit>` and how it annotates entries are NOT in the template — they are in the abstract surface (which this spec inherits). The template's job is the section skeleton; the abstract surface's job is the substitution and annotation.

#### Scenario: Implement.md references the template, not the boilerplate

- **WHEN** a maintainer reads `sai/instructions/implement.md` Step 3's index-maintenance branch
- **THEN** the branch instruction SHALL name `sai/instructions/_templates/adr-index.md` by exact path as the cold-build source rather than reproducing the index structure inline

#### Scenario: Template structure matches the canonical section skeleton

- **WHEN** `sai/instructions/_templates/adr-index.md` is consulted
- **THEN** it SHALL contain the abstract surface's canonical section skeleton: H1 `# ADR Index`, then the five `## ` sections in canonical order: `## Conventions`, `## By <domain unit>` (literally carrying the placeholder `<domain unit>` in the H2 — never the concrete word "command"), `## Cross-cutting categories`, `## ADRs that extend or correct prior ones`, `## Superseded ADRs (historical)`. The H1 counts as a preserved-verbatim artifact, not as one of the sections; the five `## ` headings are the five canonical sections.

#### Scenario: Template is project-agnostic (no baked-in domain-unit snapshot, no frozen "command" H2)

- **WHEN** `sai/instructions/_templates/adr-index.md` is consulted
- **THEN** the `## By <domain unit>` H2 SHALL carry the literal placeholder token `<domain unit>` (never the concrete word "command" or any other concrete noun), AND the `## By <domain unit>` and `## Cross-cutting categories` sections SHALL contain only empty placeholder skeletons (e.g. a single HTML comment insertion site per section, or an explicitly empty body with a `<!-- cold-build: derive <domain unit> / cross-cutting subsections from ADR content -->` marker), AND SHALL NOT list any specific `### /sai-N-*` subsection or any specific cross-cutting category subsection name

### Requirement: Cold build shall construct the full relational index from the template and the abstract surface

When `docs/adr/0000-INDEX.md` does not exist, Step 3 SHALL cold-build the full relational index over every ADR file currently present under `docs/adr/`, using the template at `sai/instructions/_templates/adr-index.md` AND the abstract surface inherited from `decision-record-index-machinery`. The cold build is a **total reconstruction over every ADR in `docs/adr/`**, NOT a session-scoped increment — it processes every ADR the project contains (whether the current session created it or it pre-exists the session) on equal terms. The cold build SHALL:

- Create `docs/adr/0000-INDEX.md` with the abstract surface's canonical section skeleton (H1 `# ADR Index`, the five `## ` sections in canonical order), using the per-index bindings for the two type-specific section headings.
- **Derive the `<domain unit>` noun from the abstract surface** — apply the framework mapping list and the framework fallback noun to the ADRs' domain-unit references and substitute the resulting noun into `## By <domain unit>` (replacing the template placeholder). The mapping list, precedence order, and fallback rule are the abstract surface's contract, not this spec's; the cold build's job is to read them and apply them. (Previously this spec restated the mapping list, precedence, and fallback verbatim; that restatement is removed and the abstract surface is the single source of truth.)
- **Derive the domain-unit references and the cross-cutting categories from the ADRs' own content at cold-build time** — the cold build SHALL scan every ADR's content, collect the distinct domain-unit references (the specific command/module/endpoint/etc. identifiers each ADR mentions) and the cross-cutting categories the ADRs actually reference, and create the `### <domain unit reference>` subsections under `## By <domain unit>` and the `### <category>` subsections under `## Cross-cutting categories` from that derived set.
- **Categorize each existing ADR into the relevant derived `### <domain unit reference>` subsection(s)** under `## By <domain unit>` based on which domain-unit reference(s) the ADR's content references.
- **Categorize each ADR into the relevant derived cross-cutting category subsection(s)** under `## Cross-cutting categories` based on its content — this relational judgment is performed by the main `sai-3` agent from the RAW per-ADR context returned by the `budget-explorer` subagent, NOT by the subagent itself.
- Preserve each ADR's exact H1 title (`# ADR NNNN: {Title}`) in its entry line, using the entry-line form `- [NNNN — {Title}](./NNNN-slug.md)`.
- Annotate relationships among ADRs (Pair with / Refs / Amends / Supersedes / Reverses / Reframes) using these pinned in-line entry token forms: `— Pair with NNNN`, `— Refs NNNN`, `— **Amends** NNNN`, `— **Reframes** NNNN`, `— **Reverses** NNNN`, `— Supersedes NNNN`; read each relationship from the ADR's structured relationship line when present, and fall back to ADR prose only for hand-written pre-requirement ADRs (best-effort).
- Populate the `## ADRs that extend or correct prior ones` correction table with one row per ADR that amends, supersedes, reverses, or reframes an earlier ADR.
- **Move EVERY superseded ADR into the `## Superseded ADRs (historical)` section** — for every ADR `NNNN_old` whose structured relationship line (or, for hand-written pre-requirement ADRs, its prose) declares `supersedes ... NNNN_new`, the cold build SHALL move `NNNN_old`'s entry out of `## By <domain unit>` and `## Cross-cutting categories` into `## Superseded ADRs (historical)`, appending `*Superseded by [NNNN_new]*` to its entry line. When the supersede target is NOT a decision record — e.g. ADRs 0080 and 0089 in this repository, whose supersede declarations name the change `simplify-routed-phase-coordination` rather than an ADR number — the cold build SHALL preserve the note text verbatim (`— *Superseded by <target text>*`, no numeric link, no rewrite) so the byte-for-byte equivalence claim holds against the live index.

**Cold-build delegation (cost discipline).** The cold-build branch's bulk read of every `docs/adr/NNNN-*.md` file is delegated to a `budget-explorer` subagent per the cost-discipline rule in `sai/policies/remember.md`; the main `sai-3` agent MUST NOT read every ADR in bulk. The subagent returns a RAW per-ADR context report only — for each ADR `NNNN`: its exact H1 title (`{Title}`), its structured `<!-- adr-index: ... -->` relationship-line declarations (parsed verbatim), the domain-unit references its content mentions (e.g. `/sai-1-spec`, `auth-module`), the first paragraph of its `## Context` section (raw text, capped at ~80 words), and best-effort prose relationship candidates for ADRs without a structured relationship line. The subagent SHALL NOT return pre-decided cross-cutting categories. The main `sai-3` agent performs the cross-cutting categorization (which `### <category>` subsection(s) each ADR belongs to, and which categories earn their own subsection under the threshold rules) from that raw context.

The cold build SHALL be the sole branch that recomputes the cross-cutting threshold structure (per the abstract surface's "cross-cutting threshold contract" requirement). The warm path SHALL NOT recompute these thresholds.

#### Scenario: Cold build from an ADR directory with no index

- **WHEN** Step 3 ends its run with at least one ADR created, and `docs/adr/0000-INDEX.md` does not exist
- **THEN** Step 3 SHALL construct `docs/adr/0000-INDEX.md` from the template and the abstract surface, categorising every existing `docs/adr/NNNN-*.md` file by domain-unit reference and cross-cutting category, annotating relationships, populating the correction table, and placing superseded ADRs in the historical section

#### Scenario: Cold build preserves exact H1 titles

- **WHEN** an ADR file (e.g. `docs/adr/0014-decision-summary-derived-from-artifacts-only.md` with H1 `# ADR 0014: Decision summary derived exclusively from written artifacts`) is categorised by the cold build
- **THEN** the cold-built index entry SHALL list it under the domain-unit reference subsection(s) that ADR's content references (in this repository, `/sai-1-spec` / `/sai-2-design` under a `## By command` H2; in a consumer project, whatever domain-unit references the ADR mentions under a `## By <domain unit>` H2 whose noun matches the project's vocabulary) with the exact title `Decision summary derived exclusively from written artifacts` (without the `# ADR NNNN:` prefix in the entry text, matching the live index's entry-line form)

#### Scenario: Cold build moves every superseded ADR, reading each ADR's structured relationship line

- **WHEN** the cold build is triggered by a session that created, e.g., ADR `0072`, and `docs/adr/` already contains pre-existing ADRs `0002`, `0003`, `0004`, where ADR `0004`'s structured relationship line (or, because `0004` predates the structured-line requirement, its prose) declares that `0004` supersedes `0002` and `0003`
- **THEN** the cold-built index SHALL move `0002` and `0003` out of `## By <domain unit>` and `## Cross-cutting categories` into `## Superseded ADRs (historical)`, each with a `*Superseded by [0004]*` note appended to its entry line, AND shall add the correction-table rows `[0004] | supersedes | [0002]` and `[0004] | supersedes | [0003]`

#### Scenario: Cold build preserves non-decision-record supersede notes verbatim

- **WHEN** the cold build moves an ADR whose supersede target is NOT a decision record — e.g. ADR 0080 and ADR 0089 in this repository, whose supersede declarations name the change `simplify-routed-phase-coordination` rather than an ADR number
- **THEN** the moved historical entry SHALL carry the note text verbatim (`— *Superseded by simplify-routed-phase-coordination*`) with no numeric link and no rewrite, matching the live index byte-for-byte

#### Scenario: Cold build substitutes the project's `<domain unit>` noun into the H2

- **WHEN** the cold build runs in this repository (whose ADRs reference commands) versus a consumer project whose ADRs reference modules
- **THEN** the cold-built index in THIS repository SHALL have a `## By command` H2 (the derived noun "command" substituted for the template's `<domain unit>` placeholder), containing `### `/sai-N-*`` subsections, while the cold-built index in the MODULE-BASED consumer project SHALL have a `## By module` H2 (the derived noun "module" substituted), containing `### `auth-module`` / `### `billing-module`` subsections — the H2 noun always matches the project's own ADR vocabulary, never frozen as "command"

#### Scenario: Cold-build subagent returns raw context, main agent performs cross-cutting categorization

- **WHEN** the cold build delegates its bulk read of every ADR to a `budget-explorer` subagent
- **THEN** the subagent's per-ADR report SHALL contain only raw fields (exact H1 title, parsed structured-relationship-line declarations, domain-unit references the ADR mentions verbatim, first paragraph of `## Context` capped at ~80 words, and best-effort prose relationship candidates for ADRs lacking structured lines) and SHALL NOT contain any pre-decided cross-cutting category; the main `sai-3` agent SHALL derive each ADR's cross-cutting category membership from that raw context, and SHALL make the threshold judgments itself

#### Scenario: Cold build is the sole threshold recomputer

- **WHEN** the warm splice would need to decide whether a cross-cutting category with one existing entry plus the new session ADR (now ≥2 entries) earns its own subsection
- **THEN** the warm splice SHALL NOT create the new subsection; that structural promotion SHALL only happen at the next cold build (an accepted minor drift, not a defect)

### Requirement: Warm splice shall incrementally insert the session ADRs

When `docs/adr/0000-INDEX.md` exists, Step 3 SHALL splice ONLY the ADR files the current Step 3 run created into the existing index structure, leaving all hand-curated content for ADRs not created this session unchanged. The warm splice SHALL:

- Insert each session ADR into every correct `### <domain unit reference>` subsection under `## By <domain unit>` based on the ADR's content. **On the `## By <domain unit>` axis the warm path has NO threshold and SHALL create a new `### <domain unit reference>` subsection on demand** for any session ADR whose domain-unit reference has no subsection yet in the existing structure — each command/module/endpoint is its own bucket (the cross-cutting threshold rule applies ONLY to `## Cross-cutting categories`, not to `## By <domain unit>`). See the "Warm splice creates a new domain-unit subsection on demand" scenario.
- Insert each session ADR into every correct cross-cutting category subsection under `## Cross-cutting categories` based on its content — but here the warm path SHALL NOT create a new `### <category>` subsection for the ADR's category unless that subsection already exists in the structure (the warm path does NOT recompute the cross-cutting threshold — see the abstract surface's threshold contract; this restriction is specific to cross-cutting categories and does NOT apply to `## By <domain unit>`). When the category subsection is missing, the warm path SHALL append the ADR entry to the collapsed single list under `## Cross-cutting categories` in place.
- Preserve each session ADR's exact H1 title on its entry line, using the entry-line form `- [NNNN — {Title}](./NNNN-slug.md)`.
- Annotate relationships TO OTHER session ADRs AND TO existing ADRs using the same pinned in-line entry token forms (`— Pair with NNNN`, `— Refs NNNN`, `— **Amends** NNNN`, `— **Reframes** NNNN`, `— **Reverses** NNNN`, `— Supersedes NNNN`), reading each relationship from the session ADR's structured `<!-- adr-index: ... -->` line first and falling back to best-effort prose parsing only for hand-written pre-requirement ADRs.
- Move any ADR the session supersedes out of the `## By <domain unit>` and `## Cross-cutting categories` sections into `## Superseded ADRs (historical)`, per the warm-supersede rule below.
- Add any correction-table row required by a session ADR that amends, supersedes, reverses, or reframes an earlier ADR.

#### Scenario: Warm splice touches only session ADRs

- **WHEN** the session created ADRs 0072 and 0073 and the index already has entries for 0001–0071 with hand-curated annotations
- **THEN** the warm splice SHALL insert 0072 and 0073 entries and SHALL leave every existing 0001–0071 entry byte-for-byte unchanged except where a session ADR supersedes one of them (a supersede-move is the only permitted mutation of a non-session entry)

#### Scenario: Warm splice preserves exact H1 titles for new entries

- **WHEN** the session ADR file `docs/adr/0072-foo.md` has the H1 `# ADR 0072: Foo`
- **THEN** the warm-spliced index entry SHALL list it with the exact title `Foo` (matching the entry-line form used in the live index, without the `# ADR NNNN:` prefix in the entry text)

#### Scenario: Warm splice annotates a session ADR relationship to an existing ADR

- **WHEN** the session ADR's structured `<!-- adr-index: ... -->` line (or, because the session ADR pre-dates this requirement, its prose) declares `Reframes 0053` and the warm splice inserts the new entry
- **THEN** the entry line SHALL carry the in-line annotation `— **Reframes** 0053` (or the equivalent token form already used in the live index for that relationship type) and the correction table SHALL gain a row `[0072] | reframes | [0053]`

#### Scenario: Warm splice does not promote a cross-cutting category to its own subsection

- **WHEN** the session ADR is the second ADR in cross-cutting category "Foo" (the first being an existing entry under the collapsed single list because the count was previously below the threshold) and the warm splice inserts the new entry
- **THEN** the warm splice SHALL append the new entry to the single list in place rather than creating a `### Foo` subsection under `## Cross-cutting categories`; the category SHALL be promoted to its own subsection only at the next cold build (this restriction applies to cross-cutting categories only — NOT to `## By <domain unit>`)

#### Scenario: Warm splice creates a new domain-unit subsection on demand

- **WHEN** the session creates the first ADR for a domain-unit reference that has NO existing `### <domain unit reference>` subsection under `## By <domain unit>` (e.g. the first ADR for `/sai-status` in this repository's `## By command` H2, in a session whose trigger happened to be an ADR for a different command)
- **THEN** the warm splice SHALL create the new `### /sai-status` subsection under `## By <domain unit>` and insert the session ADR's entry into it — the warm path has NO threshold on the `## By <domain unit>` axis and SHALL NOT refuse to place the session ADR just because the subsection does not yet exist

### Requirement: Warm supersede move shall follow the abstract surface's family-boundary rule

When a session ADR supersedes a prior ADR, the warm splice SHALL move the superseded ADR out of the `## By <domain unit>` and `## Cross-cutting categories` sections into the `## Superseded ADRs (historical)` section, keeping its entry line with a `*Superseded by [NNNN]*` note appended, AND SHALL add a correction-table row to `## ADRs that extend or correct prior ones` recording the supersede action. The move SHALL preserve the superseded ADR's exact H1 title and any pre-existing relationship annotations on its entry line. The warm supersede move SHALL NOT clobber, reword, reorder, or delete any unrelated hand-curated entry elsewhere in the index.

The supersede-move operates only on records within the same family (per the abstract surface's "Relationship tokens respect family boundaries" requirement). A `supersedes` relationship whose target is in a different family is a classification error; it is NOT executed, the source record is NOT moved, and the target family's index is NOT touched.

#### Scenario: Warm splice moves a superseded ADR into the historical section

- **WHEN** the session ADR `0073` declares `Supersedes 0002` (via its structured `<!-- adr-index: supersedes 0002 -->` line, or prose for a hand-written pre-requirement ADR) and the warm splice runs
- **THEN** the entry for `0002` SHALL be removed from its `### <domain unit reference>` subsection under `## By <domain unit>` and from any `### <category>` subsection under `## Cross-cutting categories`; the same entry (with its existing title and any existing annotations) SHALL be appended to `## Superseded ADRs (historical)` with a `*Superseded by [0073]*` note, and the correction table SHALL gain a row `[0073] | supersedes | [0002]`

#### Scenario: Warm supersede preserves unrelated hand-curated content

- **WHEN** the warm supersede move places the superseded ADR into the historical section
- **THEN** every entry for ADRs other than the superseded one and the superseding one (the session ADR) SHALL be byte-for-byte unchanged across the move, including their relationship annotations, ordering, and any hand-curated subsection structure

#### Scenario: Cross-family `supersedes` is rejected as a classification error

- **WHEN** a session ADR's structured relationship line declares `supersedes ddr:NNNN` (a target in a different family)
- **THEN** the warm splice SHALL treat this as a classification error per the abstract surface's family-boundary rule
- **THEN** no entry is moved, no correction-table row is added, and the target family's index is not touched
- **THEN** the classification error is surfaced in chat so the user can reclassify the source or target record into the correct family

### Requirement: Index maintenance shall be idempotent on sai-3 rerun

When `sai-3-implement` is re-run for the same change and an ADR created in a prior run already has an entry in `docs/adr/0000-INDEX.md`, the index maintenance hook SHALL detect the existing entry and SHALL NOT duplicate it. The cold-build branch SHALL remain a no-op once the index has been cold-built by an earlier run. The warm-splice branch SHALL treat a session ADR whose entry already exists as a no-op for that ADR (no duplicate entry, no duplicate correction-table row, no duplicate supersede-move).

#### Scenario: Re-running sai-3 with an already-indexed session ADR

- **WHEN** Step 3 re-runs for a change whose ADR `0072` was already inserted into the index in the prior run, and the current run would re-insert `0072`'s entry
- **THEN** the hook SHALL detect the existing entry for `0072` and SHALL skip it, producing zero new entries, zero new correction-table rows, and zero new supersede-moves for that ADR

#### Scenario: Re-running sai-3 after a prior cold build

- **WHEN** Step 3 re-runs after a prior run cold-built `docs/adr/0000-INDEX.md` (the file now exists)
- **THEN** the current run SHALL take the warm-splice branch, NEVER re-cold-build, even if the warm splice produces no new entries

### Requirement: Step 3 shall emit a structured relationship line in ADRs it creates

When `sai-3-implement` Step 3 creates an ADR file (`docs/adr/NNNN-slug.md`) for a decision that declares a relationship to another ADR (or, in a future slice, to a record in another family — using the same `adr-index:` key form, per the abstract surface's family-boundary rule) — amends, supersedes, reverses, reframes, refs, or pair-with — Step 3 SHALL emit a structured, parseable relationship line in the ADR file itself, in addition to any prose discussion of the relationship. The structured line SHALL use a deterministic form the index-maintenance hook reads without prose parsing, with relationship tokens from `amends|supersedes|reverses|reframes|refs|pair-with`, for example an HTML comment at a known location:

  `<!-- adr-index: supersedes 0002; amends 0003 -->`

The hook's warm-splice and cold-build branches SHALL read this structured line first; the prose-content fallback (parsing the ADR body for `Supersedes NNNN` phrasing) is best-effort only and SHALL be used solely for hand-written ADRs that predate this requirement. Step 3 SHALL NOT omit the structured line for an ADR that declares a relationship; an ADR with no relationship carries no structured line and the hook annotates nothing.

#### Scenario: Step 3 writes an ADR that supersedes a prior ADR

- **WHEN** Step 3 decides to create `docs/adr/0073-foo.md` for a decision that supersedes ADR 0002
- **THEN** the ADR file `0073-foo.md` SHALL contain a structured relationship line (e.g. `<!-- adr-index: supersedes 0002 -->`) in addition to the ADR's prose, and the index-maintenance hook SHALL read that structured line to annotate `0073`'s entry and populate the correction table, without parsing the ADR's prose body

#### Scenario: Step 3 writes an ADR with no relationship

- **WHEN** Step 3 creates an ADR that declares no relationship to any other ADR
- **THEN** the ADR file SHALL NOT carry a structured relationship line, and the index-maintenance hook SHALL insert the entry with no in-line relationship annotation and no correction-table row

#### Scenario: Hand-written pre-requirement ADR falls back to prose parsing

- **WHEN** the cold build or warm splice categorises a hand-written ADR (e.g. `0004`) that predates this requirement and carries its supersede declaration only in prose
- **THEN** the hook SHALL fall back to best-effort prose parsing for that ADR only, and the structured-line requirement SHALL NOT retroactively apply to it

### Requirement: Index output shall follow the abstract surface's invariants and the per-ADR type-specific headings

Every artifact produced by either index-maintenance branch — `docs/adr/0000-INDEX.md` (cold build) or the post-splice state of `docs/adr/0000-INDEX.md` (warm splice) — SHALL preserve the five index-output invariants defined by `decision-record-index-machinery`.

In addition to the abstract invariants, the ADR index SHALL carry these per-index invariants:

- The correction table header is `| ADR | Action | Over |` (the `ADR` keyword matches the per-index family vocabulary; a future DDR family uses `| DDR | Action | Over |`).
- The entry-line form is `- [NNNN — {Title}](./NNNN-slug.md)`, with the title in the verbatim `{Title}` portion of the ADR's H1.
- The historical section is `## Superseded ADRs (historical)` and the correction-table section is `## ADRs that extend or correct prior ones` (the two type-specific section headings pinned by this spec's per-index binding).

#### Scenario: Index links are relative within the ADR family

- **WHEN** the warm splice inserts an entry for `docs/adr/0072-foo.md`
- **THEN** the entry's link SHALL be `./0072-foo.md` (relative path from `docs/adr/0000-INDEX.md`), never an absolute path or URL

#### Scenario: Index H1 is preserved across reruns

- **WHEN** the warm splice runs on an existing `docs/adr/0000-INDEX.md` whose first line is `# ADR Index`
- **THEN** the post-splice file SHALL still begin with exactly `# ADR Index` as its first line, unchanged

#### Scenario: ADR titles are preserved verbatim

- **WHEN** an ADR file's H1 reads `# ADR 0072: Foo Bar Baz`
- **THEN** the index entry listing that ADR SHALL carry the verbatim title text `Foo Bar Baz` (without the `# ADR NNNN:` prefix in the entry text, and with no rewording, casing, or punctuation change)

#### Scenario: ADR correction-table header and section names use ADR vocabulary

- **WHEN** the cold build writes the correction table and the historical section
- **THEN** the table header is `| ADR | Action | Over |` and the section headings are `## ADRs that extend or correct prior ones` and `## Superseded ADRs (historical)`
- **THEN** the same file does NOT carry `| DDR | Action | Over |`, `## DDRs that extend or correct prior ones`, or `## Superseded DDRs (historical)` — those headers belong to a DDR family, which is not in scope for this slice
