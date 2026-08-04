## ADDED Requirements

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

### Requirement: Index template shall be a referenced, project-agnostic skeleton file consumed by Step 3

The cold-build boilerplate for the relational ADR index SHALL live as a separate template file at `sai/instructions/_templates/adr-index.md`, referenced by `sai/instructions/implement.md` via exact path. Step 3 SHALL NOT inline the index boilerplate into `implement.md`. The template file's structure SHALL mirror the relational model's section skeleton (H1 `# ADR Index`, a `## Conventions` section, a `## By <domain unit>` section, a `## Cross-cutting categories` section, a `## ADRs that extend or correct prior ones` correction table, and a `## Superseded ADRs (historical)` section) — in the same top-level section order as `docs/adr/0000-INDEX.md`. The `## By <domain unit>` H2 SHALL be **parameterized on the project's domain unit**, not frozen as the literal string "command": at cold-build time the cold build derives a single `<domain unit>` noun from the project's ADR content (the noun the ADRs use to group themselves — "command" in this repository, but "module", "endpoint", "package", "service", or whatever else each consumer project's ADRs reference) and substitutes it into the H2 (yielding `## By command` here, `## By module` in a module-based consumer, `## By endpoint` in an endpoint-based consumer, etc.). The same `<domain unit>` noun propagates to the subsection tag form (`### <command>` here, `### <module>` in a module-based consumer, etc.). The template file itself carries the literal placeholder `<domain unit>` in the H2 position (never any concrete noun) so the cold build fills it in per project. The template SHALL be **project-agnostic** in three senses at once: (a) the `## By <domain unit>` and `## Cross-cutting categories` sections carry only empty placeholder skeletons (clearly-marked insertion sites with no pre-populated `### /sai-N-*` or category subsection names); (b) the `## By <domain unit>` H2 carries the literal placeholder `<domain unit>`, not the concrete word "command"; (c) the template SHALL NOT bake in any project-specific domain-unit snapshot — neither shared-ai's `### /sai-N-*` command subsection names nor its `### Repo layout, fetch paths and skill installation` / `### Doctor` / similar cross-cutting subsection names. The domain units (the `<domain unit>` noun + the per-ADR domain-unit references, and the cross-cutting categories) are derived from the ADRs' own content at cold-build time (see the "Cold build shall construct the full relational index from the template" requirement), never carried as a snapshot in the template. The template uses the literal placeholder `<domain unit>` in the H2 so that the same template file produces a correct relational index in any SAI consumer project — a module-based consumer's cold build produces `## By module` containing `### <module>` subsections, not `## By command` containing `### <module>` (which would be self-contradictory) — and not only this repository.

#### Scenario: Implement.md references the template, not the boilerplate

- **WHEN** a maintainer reads `sai/instructions/implement.md` Step 3's index-maintenance branch
- **THEN** the branch instruction SHALL name `sai/instructions/_templates/adr-index.md` by exact path as the cold-build source rather than reproducing the index structure inline

#### Scenario: Template structure matches the live index's section skeleton

- **WHEN** `sai/instructions/_templates/adr-index.md` is consulted
- **THEN** it SHALL contain the same top-level section skeleton as `docs/adr/0000-INDEX.md`: H1 `# ADR Index`, then `## Conventions`, `## By <domain unit>` (literally carrying the placeholder `<domain unit>` in the H2 — never the concrete word "command"), `## Cross-cutting categories`, `## ADRs that extend or correct prior ones`, `## Superseded ADRs (historical)` — in this exact order. The H1 counts as a preserved-verbatim artifact, not as one of the sections; the five `##` headings are the five canonical sections.

#### Scenario: Template is project-agnostic (no baked-in domain-unit snapshot, no frozen "command" H2)

- **WHEN** `sai/instructions/_templates/adr-index.md` is consulted
- **THEN** the `## By <domain unit>` H2 SHALL carry the literal placeholder token `<domain unit>` (never the concrete word "command" or any other concrete noun), AND the `## By <domain unit>` and `## Cross-cutting categories` sections SHALL contain only empty placeholder skeletons (e.g. a single HTML comment insertion site per section, or an explicitly empty body with a `<!-- cold-build: derive <domain unit> / cross-cutting subsections from ADR content -->` marker), AND SHALL NOT list any specific `### /sai-N-*` subsection or any specific cross-cutting category subsection name (no `### /sai-1-spec`, no `### Repo layout, fetch paths and skill installation`, no `### Doctor`, etc.). A consumer project running `sai-3` cold-build against this template SHALL therefore produce a H2 named after ITS OWN domain-unit noun (e.g. `## By module`) — never receive a skeleton pre-populated with another project's domain units AND never receive a H2 that contradicts the noun the project's own ADRs use to group themselves.

#### Scenario: Relocation preserves the template content and index behavior

- **WHEN** the template is moved from `sai/compat/_templates/adr-index.md` to `sai/instructions/_templates/adr-index.md`
- **THEN** the destination content SHALL be byte-for-byte identical to the source content before the move, and no ADR index output or maintenance behavior SHALL change

### Requirement: Cold build shall construct the full relational index from the template, deriving the domain unit and all categorization from ADR content

When `docs/adr/0000-INDEX.md` does not exist, Step 3 SHALL cold-build the full relational index over every ADR file currently present under `docs/adr/` using the template at `sai/instructions/_templates/adr-index.md`. The cold build is a **total reconstruction over every ADR in `docs/adr/`**, NOT a session-scoped increment — it processes every ADR the project contains (whether the current session created it or it pre-exists the session) on equal terms. The cold build SHALL:

- Create `docs/adr/0000-INDEX.md` with the template's five canonical sections (plus the preserved `# ADR Index` H1).
- **Derive the `<domain unit>` noun from ADR-derived references with deterministic mapping plus open fallback** — the cold build SHALL derive domain-unit references from ADR content, then map those references to the H2 noun using this precedence: slash command references (e.g. `/sai-*`) map to `command`; `*-module` / `module-*` references map to `module`; HTTP route references map to `endpoint`; package-name references map to `package`; service-name references map to `service`. It SHALL substitute the resulting noun into `## By <domain unit>` (replacing the template placeholder). The chosen noun is the mapping with the highest ADR count; ties break by the same precedence order. If none of these mappings matches, the cold build SHALL derive a fallback noun from the dominant grouping noun found near the ADR references in the raw per-ADR context; if still unresolved, it SHALL use the literal noun `domain unit`.
- **Derive the domain-unit references and the cross-cutting categories from the ADRs' own content at cold-build time** — the cold build SHALL scan every ADR's content, collect the distinct domain-unit references (the specific command/module/endpoint/etc. identifiers each ADR mentions) and the cross-cutting categories the ADRs actually reference, and create the `### <domain unit reference>` subsections under `## By <domain unit>` and the `### <category>` subsections under `## Cross-cutting categories` from that derived set. The cold build SHALL NOT assume any fixed list of domain-unit references or categories (the template carries none); the derived set reflects whatever the project's ADRs reference. In this repository, the ADRs reference the `/sai-N-*` commands, so the cold build produces the `### `/sai-N-*`` subsections observed in the live hand-curated index (with the substituted H2 `## By command`); in a consumer project whose ADRs reference modules, the cold build produces `## By module` containing `### `module-name`` subsections.
- **Categorize each existing ADR into the relevant derived `### <domain unit reference>` subsection(s)** under `## By <domain unit>` based on which domain-unit reference(s) the ADR's content references.
- **Categorize each ADR into the relevant derived cross-cutting category subsection(s)** under `## Cross-cutting categories` based on its content — this relational judgment (which cross-cutting categories an ADR belongs to) is performed by the main `sai-3` agent from the RAW per-ADR context returned by the `budget-explorer` subagent (see the delegation clause below), NOT by the subagent itself.
- Preserve each ADR's exact H1 title (`# ADR NNNN: {Title}`) in its entry line.
- Annotate relationships among ADRs (Pair with / Refs / Amends / Supersedes / Reverses / Reframes) using these pinned in-line entry token forms: `— Pair with NNNN`, `— Refs NNNN`, `— **Amends** NNNN`, `— **Reframes** NNNN`, `— **Reverses** NNNN`, `— Supersedes NNNN`; read each relationship from the ADR's structured relationship line when present (see the "Step 3 shall emit a structured relationship line in ADRs it creates" requirement), and fall back to ADR prose only for hand-written pre-requirement ADRs (best-effort). The note `*Superseded by [NNNN]*` is NOT the superseding-entry annotation; it is reserved for the moved historical entry under the supersede-move rule.
- Populate the `## ADRs that extend or correct prior ones` correction table with one row per ADR that amends, supersedes, reverses, or reframes an earlier ADR.
- **Move EVERY superseded ADR into the `## Superseded ADRs (historical)` section** — for every ADR `NNNN_old` whose structured relationship line (or, for hand-written pre-requirement ADRs, its prose) declares `supersedes ... NNNN_new`, the cold build SHALL move `NNNN_old`'s entry out of `## By <domain unit>` and `## Cross-cutting categories` into `## Superseded ADRs (historical)`, appending `*Superseded by [NNNN_new]*` to its entry line. This is NOT session-scoped: the cold build moves every superseded ADR across the whole project, reading each ADR's own structured relationship line as the detection key for what it supersedes (or what supersedes it). The superseding ADR `NNNN_new` is whatever the structured line declares — it MAY be a session-created ADR or a pre-existing ADR; the cold build does not assume "new" (session-scoped) anywhere. In this repository, the pre-existing ADR `0004` supersedes the pre-existing ADRs `0002` and `0003`, so a cold build (even one triggered by a session creating `0072`) SHALL move `0002` and `0003` into `## Superseded ADRs (historical)` with `*Superseded by [0004]*` notes — because `0004`'s structured line / prose declares those supersede.

**Cold-build delegation (cost discipline).** The cold-build branch's bulk read of every `docs/adr/NNNN-*.md` file is delegated to a `budget-explorer` subagent per the cost-discipline rule in `sai/instructions/remember.md`; the main `sai-3` agent MUST NOT read every ADR in bulk. The subagent returns a RAW per-ADR context report only — for each ADR `NNNN`: its exact H1 title (`{Title}`), its structured `<!-- adr-index: ... -->` relationship-line declarations (parsed verbatim), the domain-unit references its content mentions (e.g. `/sai-1-spec`, `auth-module`), the first paragraph of its `## Context` section (raw text, capped at ~80 words), and best-effort prose relationship candidates for ADRs without a structured relationship line (normalized relationship token, target ADR number, source section label, short evidence snippet). The subagent SHALL NOT return pre-decided cross-cutting categories. The main `sai-3` agent performs the cross-cutting categorization (which `### <category>` subsection(s) each ADR belongs to, and which categories earn their own subsection under the ≥2 / 8–12 / <8 threshold rules) from that raw context. This separation preserves the relational judgment that gives the index its value ("8–12 well-named categories") in the main agent, never the cheap subagent.

The cold build SHALL be the sole branch that recomputes global structural thresholds (a cross-cutting category appearing in ≥2 ADRs earns its own subsection; the 8–12 target count for cross-cutting subsections; fewer than 8 cross-cutting ADRs collapses to a single list). The warm path SHALL NOT recompute these thresholds. NOTE: this threshold rule applies ONLY to the `## Cross-cutting categories` axis; the `## By <domain unit>` axis has NO threshold — each distinct domain-unit reference the ADRs mention earns its own `### <domain unit reference>` subsection unconditionally (each command/module/endpoint is its own bucket, no ≥2 promotion required).

#### Scenario: Cold build from an ADR directory with no index

- **WHEN** Step 3 ends its run with at least one ADR created, and `docs/adr/0000-INDEX.md` does not exist
- **THEN** Step 3 SHALL construct `docs/adr/0000-INDEX.md` from the template, categorising every existing `docs/adr/NNNN-*.md` file by command and cross-cutting category, annotating relationships, populating the correction table, and placing superseded ADRs in the historical section

#### Scenario: Cold build preserves exact H1 titles

- **WHEN** an ADR file (e.g. `docs/adr/0014-decision-summary-derived-from-artifacts-only.md` with H1 `# ADR 0014: Decision summary derived exclusively from written artifacts`) is categorised by the cold build
- **THEN** the cold-built index entry SHALL list it under the domain-unit reference subsection(s) that ADR's content references (in this repository, `/sai-1-spec` / `/sai-2-design` under a `## By command` H2; in a consumer project, whatever domain-unit references the ADR mentions under a `## By <domain unit>` H2 whose noun matches the project's vocabulary) with the exact title `Decision summary derived exclusively from written artifacts` (without the `# ADR NNNN:` prefix in the entry text, matching the live index's entry-line form)

#### Scenario: Cold build moves every superseded ADR, reading each ADR's structured relationship line — pre-existing or session-created (F1' fix)

- **WHEN** the cold build is triggered by a session that created, e.g., ADR `0072`, and `docs/adr/` already contains pre-existing ADRs `0002`, `0003`, `0004`, where ADR `0004`'s structured relationship line (or, because `0004` predates the structured-line requirement, its prose) declares that `0004` supersedes `0002` and `0003`
- **THEN** the cold-built index SHALL move `0002` and `0003` out of `## By <domain unit>` and `## Cross-cutting categories` into `## Superseded ADRs (historical)`, each with a `*Superseded by [0004]*` note appended to its entry line, AND shall add the correction-table rows `[0004] | supersedes | [0002]` and `[0004] | supersedes | [0003]` — DESPITE the cold-build trigger being a session-created `0072` that has nothing to do with the pre-existing `0004`/`0002`/`0003` supersede chain. The cold build's supersede detection is per-ADR and project-wide, reading each ADR's own structured relationship line; it is never session-scoped.

#### Scenario: Cold build substitutes the project's `<domain unit>` noun into the H2 (F2' fix)

- **WHEN** the cold build runs in this repository (whose ADRs reference commands) versus a consumer project whose ADRs reference modules
- **THEN** the cold-built index in THIS repository SHALL have a `## By command` H2 (the derived noun "command" substituted for the template's `<domain unit>` placeholder), containing `### `/sai-N-*`` subsections, while the cold-built index in the MODULE-BASED consumer project SHALL have a `## By module` H2 (the derived noun "module" substituted), containing `### `auth-module`` / `### `billing-module`` subsections — the H2 noun always matches the project's own ADR vocabulary, never frozen as "command"

#### Scenario: Cold-build subagent returns raw context, main agent performs cross-cutting categorization (F4' fix)

- **WHEN** the cold build delegates its bulk read of every ADR to a `budget-explorer` subagent
- **THEN** the subagent's per-ADR report SHALL contain only raw fields (exact H1 title, parsed structured-relationship-line declarations, domain-unit references the ADR mentions verbatim, first paragraph of `## Context` capped at ~80 words, and best-effort prose relationship candidates for ADRs lacking structured lines) and SHALL NOT contain any pre-decided cross-cutting category; the main `sai-3` agent SHALL derive each ADR's cross-cutting category membership from that raw context, and SHALL make the ≥2 / 8–12 / <8 threshold judgments itself

#### Scenario: Cold build is the sole threshold recomputer

- **WHEN** the warm splice would need to decide whether a cross-cutting category with one existing entry plus the new session ADR (now ≥2 entries) earns its own subsection
- **THEN** the warm splice SHALL NOT create the new subsection; that structural promotion SHALL only happen at the next cold build (an accepted minor drift, not a defect)

### Requirement: Warm splice shall incrementally insert the session ADRs

When `docs/adr/0000-INDEX.md` exists, Step 3 SHALL splice ONLY the ADR files the current Step 3 run created into the existing index structure, leaving all hand-curated content for ADRs not created this session unchanged. The warm splice SHALL:

- Insert each session ADR into every correct `### <domain unit reference>` subsection under `## By <domain unit>` based on the ADR's content. **On the `## By <domain unit>` axis the warm path has NO threshold and SHALL create a new `### <domain unit reference>` subsection on demand** for any session ADR whose domain-unit reference has no subsection yet in the existing structure — each command/module/endpoint is its own bucket (the cold-build threshold rule applies ONLY to `## Cross-cutting categories`, not to `## By <domain unit>`). See the "Warm splice creates a new domain-unit subsection on demand" scenario.
- Insert each session ADR into every correct cross-cutting category subsection under `## Cross-cutting categories` based on its content — but here the warm path SHALL NOT create a new `### <category>` subsection for the ADR's category unless that subsection already exists in the structure (the warm path does NOT recompute the ≥2-category threshold — see the cold build requirement; this restriction is specific to cross-cutting categories and does NOT apply to `## By <domain unit>`). When the category subsection is missing, the warm path SHALL append the ADR entry to the collapsed single list under `## Cross-cutting categories` in place.
- Preserve each session ADR's exact H1 title on its entry line.
- Annotate relationships TO OTHER session ADRs AND TO existing ADRs using the same pinned in-line entry token forms (`— Pair with NNNN`, `— Refs NNNN`, `— **Amends** NNNN`, `— **Reframes** NNNN`, `— **Reverses** NNNN`, `— Supersedes NNNN`), reading each relationship from the session ADR's structured `<!-- adr-index: ... -->` line first and falling back to best-effort prose parsing only for hand-written pre-requirement ADRs.
- Move any ADR the session supersedes out of the `## By <domain unit>` and `## Cross-cutting categories` sections into `## Superseded ADRs (historical)`, per the warm-supersede rule below.
- Add any correction-table row required by a session ADR that amends, supersedes, reverses, or reframes an earlier ADR.

#### Scenario: Warm splice touches only session ADRs

- **WHEN** the session created ADRs 0072 and 0073 and the index already has entries for 0001–0071 with hand-curated annotations
- **THEN** the warm splice SHALL insert 0072 and 0073 entries and SHALL leave every existing 0001–0071 entry byte-for-byte unchanged except where a session ADR amends or supersedes one of them (a supersede-move is the only permitted mutation of a non-session entry)

#### Scenario: Warm splice preserves exact H1 titles for new entries

- **WHEN** the session ADR file `docs/adr/0072-foo.md` has the H1 `# ADR 0072: Foo`
- **THEN** the warm-spliced index entry SHALL list it with the exact title `Foo` (matching the entry-line form used in the live index, without the `# ADR NNNN:` prefix in the entry text)

#### Scenario: Warm splice annotates a session ADR relationship to an existing ADR

- **WHEN** the session ADR's structured `<!-- adr-index: ... -->` line (or, because the session ADR pre-dates this requirement, its prose) declares `Reframes 0053` and the warm splice inserts the new entry
- **THEN** the entry line SHALL carry the in-line annotation `— **Reframes** 0053` (or the equivalent token form already used in the live index for that relationship type) and the correction table SHALL gain a row `[0072] | reframes | [0053]`

#### Scenario: Warm splice does not promote a cross-cutting category to its own subsection

- **WHEN** the session ADR is the second ADR in cross-cutting category "Foo" (the first being an existing entry under the collapsed single list because the count was previously below the threshold) and the warm splice inserts the new entry
- **THEN** the warm splice SHALL append the new entry to the single list in place rather than creating a `### Foo` subsection under `## Cross-cutting categories`; the category SHALL be promoted to its own subsection only at the next cold build (this restriction applies to cross-cutting categories only — NOT to `## By <domain unit>`)

#### Scenario: Warm splice creates a new domain-unit subsection on demand (F3' fix)

- **WHEN** the session creates the first ADR for a domain-unit reference that has NO existing `### <domain unit reference>` subsection under `## By <domain unit>` (e.g. the first ADR for `/sai-status` in this repository's `## By command` H2, in a session whose trigger happened to be an ADR for a different command)
- **THEN** the warm splice SHALL create the new `### /sai-status` subsection under `## By <domain unit>` and insert the session ADR's entry into it — the warm path has NO threshold on the `## By <domain unit>` axis and SHALL NOT refuse to place the session ADR just because the subsection does not yet exist. (This is the discriminate from cross-cutting categories, where a missing subsection stays missing until the next cold build.)

### Requirement: Warm supersede move shall follow template Rule 6 faithfully

When a session ADR supersedes a prior ADR, the warm splice SHALL move the superseded ADR out of the `## By <domain unit>` and `## Cross-cutting categories` sections into the `## Superseded ADRs (historical)` section, keeping its entry line with a `*Superseded by [NNNN]*` note appended, AND SHALL add a correction-table row to `## ADRs that extend or correct prior ones` recording the supersede action. The move SHALL preserve the superseded ADR's exact H1 title and any pre-existing relationship annotations on its entry line. The warm supersede move SHALL NOT clobber, reword, reorder, or delete any unrelated hand-curated entry elsewhere in the index. (The vocabulary here is `<domain unit>` because the warm path inherits the cold-build-derived H2 noun for the project's index — see the "Index template shall be a referenced, project-agnostic skeleton file consumed by Step 3" requirement.)

#### Scenario: Warm splice moves a superseded ADR into the historical section

- **WHEN** the session ADR `0073` declares `Supersedes 0002` (via its structured `<!-- adr-index: supersedes 0002 -->` line, or prose for a hand-written pre-requirement ADR) and the warm splice runs
- **THEN** the entry for `0002` SHALL be removed from its `### <domain unit reference>` subsection under `## By <domain unit>` and from any `### <category>` subsection under `## Cross-cutting categories`; the same entry (with its existing title and any existing annotations) SHALL be appended to `## Superseded ADRs (historical)` with a `*Superseded by [0073]*` note, and the correction table SHALL gain a row `[0073] | supersedes | [0002]`

#### Scenario: Warm supersede preserves unrelated hand-curated content

- **WHEN** the warm supersede move places the superseded ADR into the historical section
- **THEN** every entry for ADRs other than the superseded one and the superseding one (the session ADR) SHALL be byte-for-byte unchanged across the move, including their relationship annotations, ordering, and any hand-curated subsection structure

### Requirement: Index maintenance shall be idempotent on sai-3 rerun

When `sai-3-implement` is re-run for the same change and an ADR created in a prior run already has an entry in `docs/adr/0000-INDEX.md`, the index maintenance hook SHALL detect the existing entry and SHALL NOT duplicate it. The cold-build branch SHALL remain a no-op once the index has been cold-built by an earlier run. The warm-splice branch SHALL treat a session ADR whose entry already exists as a no-op for that ADR (no duplicate entry, no duplicate correction-table row, no duplicate supersede-move).

#### Scenario: Re-running sai-3 with an already-indexed session ADR

- **WHEN** Step 3 re-runs for a change whose ADR `0072` was already inserted into the index in the prior run, and the current run would re-insert `0072`'s entry
- **THEN** the hook SHALL detect the existing entry for `0072` and SHALL skip it, producing zero new entries, zero new correction-table rows, and zero new supersede-moves for that ADR

#### Scenario: Re-running sai-3 after a prior cold build

- **WHEN** Step 3 re-runs after a prior run cold-built `docs/adr/0000-INDEX.md` (the file now exists)
- **THEN** the current run SHALL take the warm-splice branch, NEVER re-cold-build, even if the warm splice produces no new entries

### Requirement: Step 3 shall emit a structured relationship line in ADRs it creates

When `sai-3-implement` Step 3 creates an ADR file (`docs/adr/NNNN-slug.md`) for a decision that declares a relationship to another ADR — amends, supersedes, reverses, reframes, refs, or pair-with — Step 3 SHALL emit a structured, parseable relationship line in the ADR file itself, in addition to any prose discussion of the relationship. The structured line SHALL use a deterministic form the index-maintenance hook reads without prose parsing, with relationship tokens from `amends|supersedes|reverses|reframes|refs|pair-with`, for example an HTML comment at a known location:

  `<!-- adr-index: supersedes 0002; amends 0003 -->`

or an equivalent dedicated section:

  `## Relationships` followed by `supersedes: 0002` and `amends: 0003` lines.

The hook's warm-splice and cold-build branches SHALL read this structured line first; the prose-content fallback (parsing the ADR body for `Supersedes NNNN` phrasing) is best-effort only and SHALL be used solely for hand-written ADRs that predate this requirement (e.g. `docs/adr/0004-source-layout-and-install-path-restructure.md`, whose supersede/amend declaration lives in prose per the proposal's research notes). Step 3 SHALL NOT omit the structured line for an ADR that declares a relationship; an ADR with no relationship carries no structured line and the hook annotates nothing.

#### Scenario: Step 3 writes an ADR that supersedes a prior ADR

- **WHEN** Step 3 decides to create `docs/adr/0073-foo.md` for a decision that supersedes ADR 0002
- **THEN** the ADR file `0073-foo.md` SHALL contain a structured relationship line (e.g. `<!-- adr-index: supersedes 0002 -->`) in addition to the ADR's prose, and the index-maintenance hook SHALL read that structured line to annotate `0073`'s entry and populate the correction table, without parsing the ADR's prose body

#### Scenario: Step 3 writes an ADR with no relationship

- **WHEN** Step 3 creates an ADR that declares no relationship to any other ADR
- **THEN** the ADR file SHALL NOT carry a structured relationship line, and the index-maintenance hook SHALL insert the entry with no in-line relationship annotation and no correction-table row

#### Scenario: Hand-written pre-requirement ADR falls back to prose parsing

- **WHEN** the cold build or warm splice categorises a hand-written ADR (e.g. `0004`) that predates this requirement and carries its supersede declaration only in prose
- **THEN** the hook SHALL fall back to best-effort prose parsing for that ADR only, and the structured-line requirement SHALL NOT retroactively apply to it

### Requirement: Index output shall follow the invariants (language, links, titles)

Every artifact produced by either index-maintenance branch — `docs/adr/0000-INDEX.md` (cold build) or the post-splice state of `docs/adr/0000-INDEX.md` (warm splice) — SHALL: be written in English; use relative Markdown links from the index to each ADR file (e.g. `./0072-foo.md`); and preserve each ADR's exact H1 title verbatim (the `{Title}` portion of `# ADR NNNN: {Title}`, without the `# ADR NNNN:` prefix in the entry text, matching the live index's entry-line form). The H1 `# ADR Index` of the index file itself SHALL be preserved verbatim across both branches.

#### Scenario: Index links are relative

- **WHEN** the warm splice inserts an entry for `docs/adr/0072-foo.md`
- **THEN** the entry's link SHALL be `./0072-foo.md` (relative path from `docs/adr/0000-INDEX.md`), never an absolute path or URL

#### Scenario: Index H1 is preserved across reruns

- **WHEN** the warm splice runs on an existing `docs/adr/0000-INDEX.md` whose first line is `# ADR Index`
- **THEN** the post-splice file SHALL still begin with exactly `# ADR Index` as its first line, unchanged

#### Scenario: ADR titles are preserved verbatim

- **WHEN** an ADR file's H1 reads `# ADR 0072: Foo Bar Baz`
- **THEN** the index entry listing that ADR SHALL carry the verbatim title text `Foo Bar Baz` (without the `# ADR NNNN:` prefix in the entry text, and with no rewording, casing, or punctuation change)
