# decision-record-index-machinery Specification

## Purpose

This capability defines the **abstract decision-record index** — a contract every concrete decision-record index in a project (currently `docs/adr/0000-INDEX.md`, with future types allowed) inherits from. The concrete index binds three per-index parameters (storage directory, index filename, index H1); the abstract surface owns the canonical section skeleton, the `<domain unit>` noun derivation procedure, the cross-cutting threshold contract, the relationship-token rules, and the four index-output invariants. The abstract surface's framework values (mapping list, fallback noun, thresholds) are pinned in this spec as the contractually-defined defaults for unconfigured projects; this slice does NOT introduce a project-level config block for overriding them.

The capability exists so that (a) every concrete index in a project shares one source of truth for what a decision-record index is, (b) the framework's pinned values produce a byte-for-byte equivalent of today's live `docs/adr/0000-INDEX.md` for the cold-build output (modulo new ADRs added after the change lands), and (c) future decision-record types can be added by writing one concrete capability spec against this surface, not by editing every existing spec.

## Requirements

### Requirement: The abstract surface names the three per-index parameters

An abstract decision-record index SHALL be parameterizable along exactly three per-index axes. Every concrete decision-record index in a project SHALL declare its binding for each of these three, and SHALL inherit the abstract surface's canonical section skeleton, relationship-token rules, and four index-output invariants as-is.

The three per-index parameters:

1. **Storage directory** — the project-relative directory that holds the index file and the decision-record files it indexes (e.g. `docs/adr/`).
2. **Index filename** — the filename of the index file inside the storage directory (e.g. `0000-INDEX.md`).
3. **Index H1** — the first line of the index file, exactly one H1 (e.g. `# ADR Index`). The H1 is preserved verbatim across cold-build, warm-splice, and rerun.

The `<domain unit>` noun (the noun substituted into the `## By <domain unit>` H2 at cold-build time) is NOT a per-index parameter. It is a DERIVED value the cold build computes by applying the abstract surface's mapping list to the decision records' content. The mapping list, fallback noun, and cross-cutting thresholds are framework values pinned in this spec; they are not project-overridable in this slice.

#### Scenario: Concrete index binds the three per-index parameters

- **WHEN** a concrete decision-record index (e.g. the ADR index declared by `adr-index-maintenance`) inherits the abstract surface
- **THEN** the concrete spec SHALL name its storage directory, index filename, and index H1 verbatim
- **THEN** the concrete spec SHALL NOT bind a `<domain unit>` noun — the noun is a derived value, not a per-index parameter
- **THEN** the concrete spec SHALL inherit the abstract surface's canonical section skeleton, relationship-token rules, mapping list, fallback noun, and thresholds as-is

#### Scenario: Concrete spec does not restate the framework values

- **WHEN** a maintainer reads a concrete decision-record index spec
- **THEN** the concrete spec does NOT restate the mapping list, fallback noun, threshold values, or relationship-token rules verbatim
- **THEN** the concrete spec references them by name ("the mapping list from the abstract surface", "the framework fallback noun", "the threshold contract from the abstract surface")

### Requirement: The `<domain unit>` noun is derived from the mapping list and the records' content

The `<domain unit>` noun SHALL be derived at cold-build time by the cold build's procedure. The cold build:

1. Reads the abstract surface's mapping list (the framework values, pinned in this spec).
2. Scans every decision record's content for domain-unit references — the specific command/module/endpoint/etc. identifiers the records mention.
3. For each mapping rule in the mapping list (in precedence order), counts how many records mention a reference matching the rule's pattern.
4. Substitutes the noun produced by the rule with the highest count into `## By <domain unit>` (replacing the template placeholder).
5. On a tie between two rules at adjacent precedence positions, breaks the tie in favor of the earlier rule.
6. When no mapping rule matches any reference, the cold build SHALL derive a fallback noun from the dominant grouping noun found near the ADR references in the raw per-ADR context (the subagent's per-record report); if still unresolved, the cold build SHALL use the framework fallback noun `domain unit`.

The cold build's derivation is total and project-wide — it processes every record the project contains, not just the records the current session created.

#### Scenario: Cold build derives the noun with the highest matching count

- **WHEN** the cold build counts the decision records' domain-unit references against each mapping rule
- **THEN** the noun substituted into `## By <domain unit>` is the noun whose rule has the highest count
- **THEN** a tie between two mapping rules at adjacent precedence positions breaks in favor of the earlier rule (the one declared higher in the framework list)

#### Scenario: Cold build derives a fallback noun from the raw per-record context

- **WHEN** no mapping rule in the framework list matches any domain-unit reference the decision records mention
- **THEN** the cold build SHALL examine the dominant grouping noun found near the references in the raw per-ADR context returned by the `budget-explorer` subagent
- **THEN** the cold build SHALL substitute the dominant grouping noun into `## By <domain unit>`
- **THEN** if the dominant grouping noun cannot be resolved from the raw per-ADR context, the cold build SHALL substitute the framework fallback noun `domain unit` into `## By <domain unit>`

#### Scenario: Cold build falls back to the framework noun when no rule and no context match

- **WHEN** the cold build evaluates every mapping rule against the decision records' domain-unit references
- **AND** no mapping rule matches any reference
- **AND** the raw per-ADR context returns no dominant grouping noun
- **THEN** the cold build substitutes the framework fallback noun `domain unit` into `## By <domain unit>`
- **THEN** no error is raised — the fallback is the contractually-defined answer to "no mapping rule matches and no dominant grouping noun can be derived"

#### Scenario: Derived noun is not a per-index binding

- **WHEN** a concrete decision-record index spec declares its per-index bindings
- **THEN** the spec lists exactly three bindings (storage directory, index filename, index H1)
- **THEN** the spec does NOT include a `<domain unit>` noun among its bindings
- **THEN** the spec MAY reference the noun as "the noun derived by the cold build from the abstract surface's mapping list" but SHALL NOT pin a specific noun as the per-index binding

### Requirement: The mapping list is a closed precedence-ordered list of pattern-form rules

The mapping list is the abstract surface's framework declaration of "given the references our decision records mention, which noun groups them?" The mapping list SHALL be a list of `<pattern-form> → <noun>` rules ordered by precedence, with `<pattern-form>` drawn from a closed vocabulary: `slash-command` / `module-suffix` / `http-route` / `package-name` / `service-name`. The framework mapping list uses exactly these five pattern-forms and no others.

The framework mapping list (in precedence order):

1. `slash-command → command` — matches references of the form `/<name>` where `<name>` is a slash-command identifier (e.g. `/sai-1-spec`).
2. `module-suffix → module` — matches references of the form `<name>-module` or `module-<name>` (e.g. `auth-module`).
3. `http-route → endpoint` — matches HTTP method+path or path-only references starting with `/` (e.g. `GET /users/:id`).
4. `package-name → package` — matches single-token names that contain a `.` or match a known package-naming convention (e.g. `@scope/foo`, `foo.bar`).
5. `service-name → service` — matches tokens that resolve to a known service identifier in the project.

The fallback noun is `domain unit`. The cold build substitutes the fallback noun when no mapping rule matches any reference and the raw per-ADR context returns no dominant grouping noun (see the "Cold build falls back to the framework noun when no rule and no context match" scenario above).

#### Scenario: Framework mapping list uses exactly the five closed pattern-forms

- **WHEN** a maintainer reads this requirement's framework mapping list
- **THEN** every rule's pattern-form is one of the closed vocabulary's five entries: `slash-command`, `module-suffix`, `http-route`, `package-name`, `service-name`
- **THEN** the list contains exactly five rules in the precedence order named below
- **THEN** no rule in the framework list uses any other pattern-form

#### Scenario: Framework mapping list is pinned in the spec

- **WHEN** a maintainer reads this requirement's framework mapping list
- **THEN** the list is normative — it appears in this spec, not in `sai/commands/implement/instructions.md` or in a `bin/` script
- **THEN** a future change to a framework value (e.g. adding a sixth pattern-form, changing the precedence order) updates this requirement's framework list, not a code path

### Requirement: The cross-cutting threshold contract is pinned in the abstract surface

The cross-cutting threshold trio is the abstract surface's framework declaration of when a cross-cutting category earns its own `### ` subsection. The cold-build branch is the only branch that recomputes the threshold-driven structure. The warm-splice branch SHALL NOT recompute thresholds — it preserves the existing structure and only appends new entries under existing `### ` subsections or under the collapsed single list.

The framework threshold values:

- **`min_count`**: 2 — a cross-cutting category earns its own `### <category>` subsection when at least 2 decision records reference it.
- **`target_range`**: `[8, 12]` — the target number of `### <category>` subsections under `## Cross-cutting categories`.
- **`collapse_below`**: 8 — when the total number of decision records with a cross-cutting category assignment is below 8, the entire section collapses to a single unbulleted list with no `### ` subsections.

The threshold rule applies ONLY to the `## Cross-cutting categories` axis. The `## By <domain unit>` axis has NO threshold — each distinct domain-unit reference the decision records mention earns its own `### <domain unit reference>` subsection unconditionally.

#### Scenario: Cold build applies the `min_count` threshold to cross-cutting categories

- **WHEN** the cold build runs against a project whose cross-cutting threshold is the framework value `min_count = 2`
- **THEN** a cross-cutting category referenced by at least 2 decision records earns its own `### <category>` subsection
- **THEN** a cross-cutting category referenced by fewer than 2 decision records does NOT earn its own subsection and instead appears under the collapsed single list

#### Scenario: Cold build collapses the section when total count is below `collapse_below`

- **WHEN** the cold build runs against a project whose `collapse_below` is the framework value `8`
- **THEN** when the total number of decision records with a cross-cutting category assignment is below 8, the entire `## Cross-cutting categories` section collapses to a single unbulleted list with no `### ` subsections
- **THEN** when the total is at or above 8, the section uses `### ` subsections per the `min_count` rule

#### Scenario: Warm splice does not recompute thresholds

- **WHEN** the warm splice runs on an existing index and a session decision record would, under the threshold rules, promote a single-list cross-cutting category to its own subsection
- **THEN** the warm splice SHALL NOT create the new `### ` subsection
- **THEN** the new decision record is appended to the collapsed single list in place
- **THEN** the category SHALL be promoted to its own subsection only at the next cold build (accepted minor drift, not a defect)

#### Scenario: `target_range` is advisory guidance for the categorizing agent, not a hard re-bucketing rule

- **WHEN** the cold build applies the `min_count` threshold to the corpus and the resulting number of `### <category>` subsections is below 8, above 12, or otherwise outside the `target_range = [8, 12]`
- **THEN** the cold build SHALL NOT merge or split categories to land the count inside the range
- **THEN** the subsection count is determined solely by `min_count` (with `collapse_below` collapsing the whole section when total count is below 8)
- **THEN** the `target_range` is advisory guidance for the categorizing agent when it chooses cross-cutting category boundaries at cold-build time — the agent aims to land inside the range when the corpus admits it, but a result outside the range is accepted as the structural consequence of the corpus's actual content
- **THEN** a future change may add a re-bucketing rule; that change updates this requirement, not a code path

### Requirement: The canonical section skeleton is part of the index-output invariants

Every artifact produced by the cold-build or warm-splice branch of any concrete index inheriting this surface SHALL preserve the canonical section skeleton. The canonical section skeleton is the H1 (the per-index binding) followed by exactly five `## ` sections in this exact order:

1. `## Conventions` — rules the index follows (entry-line form, relationship tokens, threshold disclaimers).
2. `## By <domain unit>` — the H2 carrying the cold-build-derived noun. The noun is the derived value, not a frozen string; the H2 reads `## By command` in this repository under the framework mapping list.
3. `## Cross-cutting categories` — the section for cross-cutting category assignments, structured by the threshold contract.
4. `<type-specific correction-table heading>` — the section that lists relationship actions of type `amends | supersedes | reverses | reframes`. The exact heading text is a per-index binding (e.g. `## ADRs that extend or correct prior ones` for the ADR index).
5. `<type-specific historical-section heading>` — the section that lists superseded records. The exact heading text is a per-index binding (e.g. `## Superseded ADRs (historical)` for the ADR index).

The four abstract index-output invariants — language, links, record titles, index H1 — apply to all five sections uniformly. The H1 is preserved verbatim as the first line of the file.

The two type-specific headings (#4 and #5) carry the per-index vocabulary (`ADR` / `DDR` / future) so each family can name its own correction table and historical section without colliding with another family's vocabulary. The abstract surface fixes the section's POSITION in the skeleton (always #4 and #5) and the per-index spec fixes the section's HEADING TEXT.

#### Scenario: Section skeleton order is invariant across all indexes

- **WHEN** a concrete decision-record index inheriting this surface is cold-built or warm-spliced
- **THEN** the produced index carries the H1, then the five `## ` sections in the canonical order: `## Conventions`, `## By <domain unit>`, `## Cross-cutting categories`, the per-index correction-table heading, the per-index historical-section heading
- **THEN** no section is added, removed, or reordered; the H1 and the first three section headings are fixed by the abstract surface; the last two section headings are fixed by the per-index spec

#### Scenario: Concrete spec names the two type-specific section headings

- **WHEN** a concrete decision-record index spec inherits the abstract surface
- **THEN** the spec names its per-index correction-table heading (the section that lists `amends | supersedes | reverses | reframes` actions) verbatim
- **THEN** the spec names its per-index historical-section heading (the section that lists superseded records) verbatim
- **THEN** the two headings are part of the per-index bindings, not the abstract surface

### Requirement: The index-output invariants are preserved at the abstract level

Every artifact produced by the cold-build or warm-splice branch of any concrete index inheriting this surface SHALL preserve, at the abstract level, the five index-output invariants: the four named below plus the canonical section skeleton named in the previous requirement. Concrete specs MAY add per-index invariants but SHALL NOT weaken these.

- **Language**: the index file is written in English.
- **Links**: the index uses relative Markdown links from the index file to each decision-record file. The within-family form is `./NNNN-slug.md`; the cross-family form (used when a record references another family's record) is `../<family>/NNNN-slug.md`. Both forms are within the abstract surface; the cold build emits whichever form matches the relationship's target family.
- **Record titles**: each decision record's exact H1 title — the `{Title}` portion of the record's H1, without any record-type prefix the record carries — is preserved verbatim in the index entry line.
- **Index H1**: the index's own H1 (the per-index binding) is preserved verbatim across cold-build, warm-splice, and rerun; it is the first line of the file in both branches.

#### Scenario: Within-family link is the default form

- **WHEN** the cold build or warm splice inserts an entry for a decision record that lives in the same family as the index
- **THEN** the entry's link SHALL be `./NNNN-slug.md` (relative path from the index file to the record file), never an absolute path or URL

#### Scenario: Cross-family link is the form when target is in another family

- **WHEN** the cold build or warm splice inserts an entry whose relationship target resolves to a record in a different family (a relationship annotation or a correction-table row whose target record's family differs from the index's family)
- **THEN** the link SHALL be `../<family>/NNNN-slug.md` (relative path up one level and into the target family's directory)
- **THEN** the cold build SHALL detect the target family by inspecting the relationship target's `family:` prefix when present, or by resolving the bare number against the per-family directories
- **THEN** this slice ships only the ADR capability spec; the cross-family link form, however, already has observed effect because the live ADR index references DDR records — the cold build emits `../<family>/NNNN-slug.md` for any ADR whose relationship target resolves to another family's record; the `supersedes` family-boundary restriction, by contrast, has no observed effect until a cross-family supersede appears in the corpus

#### Scenario: Cold build and warm splice preserve the five invariants

- **WHEN** a concrete index inheriting this surface is cold-built or warm-spliced
- **THEN** the produced index is in English, uses the correct link form for each target, preserves the record H1 titles verbatim, starts with the per-index H1 as its first line, and follows the canonical five-section skeleton in order

#### Scenario: A concrete spec MAY add per-index invariants but SHALL NOT weaken the abstract invariants

- **WHEN** a concrete decision-record index spec (e.g. `adr-index-maintenance`) inherits this surface
- **THEN** the concrete spec MAY add per-index invariants (e.g. the per-ADR entry-line form, the per-ADR correction-table header, the per-ADR type-specific section headings)
- **THEN** the concrete spec SHALL NOT contradict any of the five abstract invariants (English, links, record titles, index H1, canonical section skeleton)

### Requirement: Relationship tokens respect family boundaries

The relationship-token set the maintenance cycle recognizes is `amends | supersedes | reverses | reframes | refs | pair-with`. Each token has a defined behavior at the cold-build and warm-splice branches. When a project declares more than one decision-record family (e.g. ADR and DDR), the following family-boundary rules apply:

- **`supersedes` is family-bound.** A record MAY supersede only records in the same family. A `supersedes` relationship whose target is in a different family is a classification error: it SHALL be resolved by reclassifying the source or target record into the correct family before the relationship takes effect, not by crossing the family boundary. Crossing the family boundary is impossible because the supersede-move (which physically relocates the superseded record's entry into the historical section) is a per-index operation, and the warm-splice / cold-build cycle is one cycle per declared index. A cross-family `supersedes` would force one family's cycle to rewrite another family's index, destroying the per-index isolation.
- **`refs`, `pair-with`, `amends`, `reframes`, `reverses` MAY cross families.** A record MAY reference, pair-with, amend, reframe, or reverse a record in a different family. The entry-line annotation and the correction-table row are written to the source record's own index only; the target family's index is untouched.
- **Cross-family relationship tokens are encoded with a `family:` prefix on the target.** A relationship line that references a record in a different family uses the form `<token> <family>:NNNN` (e.g. `refs adr:0069`, `refs ddr:0014`). The cold build and warm splice parse the `<family>:` prefix to determine the target family and emit the correct link form (within-family `./NNNN-slug.md` or cross-family `../<family>/NNNN-slug.md`).
- **This slice ships only the ADR capability spec.** The cross-family rules are part of the abstract surface because they constrain the maintenance cycle's behavior; their observed effect differs in this slice — the cross-family link form and `<family>:NNNN` encoding codify behavior already present in the live ADR index (which already links to DDR records), while the `supersedes` family-boundary restriction is dormant until a cross-family supersede appears — but they bind the abstract surface from this slice forward so a future slice adding a second capability does not have to re-derive them.

#### Scenario: Cross-family `supersedes` is a classification error

- **WHEN** a decision record's structured relationship line declares `supersedes <other-family>:NNNN`
- **THEN** the maintenance cycle SHALL treat this as a classification error
- **THEN** the source record is NOT moved; the target family's index is NOT touched
- **THEN** the entry-line annotation and the correction-table row are NOT written
- **THEN** the classification error is surfaced in chat (e.g. as a one-line message naming the source record, the offending relationship, and the family-boundary rule) so the user can reclassify the source or target record into the correct family
- **THEN** no file is mutated by the maintenance cycle as a consequence of the classification error — the cycle's write scope is the index files only, never the record files themselves

#### Scenario: Cross-family `refs` writes to the source family's index only

- **WHEN** a record in family `adr` declares `refs ddr:0014` via its structured relationship line
- **THEN** the entry-line annotation `— Refs ddr:0014` is written to the ADR index
- **THEN** the correction table for the ADR index does NOT add a row for this relationship (the relationship type `refs` does not produce a correction-table row, per the existing convention; only `amends | supersedes | reverses | reframes` do)
- **THEN** the DDR index is NOT touched by this relationship (no entry-line annotation, no correction-table row)

#### Scenario: Cross-family `amends` writes to the source family's index only

- **WHEN** a record in family `adr` declares `amends ddr:0014` via its structured relationship line
- **THEN** the entry-line annotation `— **Amends** ddr:0014` is written to the ADR index
- **THEN** the ADR index's correction table adds a row `[NNNN_adr] | amends | [0014](../ddr/0014-...)` using the cross-family link form
- **THEN** the DDR index is NOT touched by this relationship

### Requirement: The framework values are pinned in the spec, not in code

The abstract surface's framework values — the mapping list (with its five pattern-form rules and their precedence), the fallback noun (`domain unit`), the cross-cutting threshold trio (`min_count = 2`, `target_range = [8, 12]`, `collapse_below = 8`) — are pinned in this spec. They are NOT configurable by a project in this slice; the cold build reads them from this spec, not from a project-level config block, a sidecar file, or an environment variable.

A future slice MAY add a project-level config block for overriding the framework values; that slice is out of scope here, and the framework values SHALL remain the contractually-defined defaults until that slice lands.

#### Scenario: Unconfigured project inherits the framework values

- **WHEN** a project uses the cold build with no project-level config block for the framework values (this slice has no such block)
- **THEN** the cold build reads the mapping list, fallback noun, and threshold values from this spec's "Mapping list" and "Cross-cutting threshold contract" requirements
- **THEN** a project that today has a hand-curated `docs/adr/0000-INDEX.md` with a `## By command` H2 sees no change to the cold-build output, because the framework mapping list's `slash-command → command` rule produces the same H2 noun (`command`) and the framework threshold trio (`2 / 8–12 / 8`) produces the same threshold structure

#### Scenario: Framework values are pinned in the spec, not in code

- **WHEN** a maintainer reads the framework mapping list and threshold values
- **THEN** the values are normative — they appear in this spec, not in `sai/commands/implement/instructions.md` or in a `bin/` script
- **THEN** a future change to a framework value (e.g. adding a sixth pattern-form, raising the target to `[10, 15]`) updates this spec, not a code path

### Requirement: Concrete indexes consume the abstract surface, not duplicate it

A concrete decision-record index spec (e.g. `adr-index-maintenance`) SHALL consume this abstract surface by referencing the per-index parameters and the abstract requirements rather than restating them. The concrete spec declares its three per-index bindings (storage directory, filename, H1) and the two type-specific section headings (correction-table heading, historical-section heading); it references the project-wide parameters (mapping list, fallback noun, thresholds) by name; it SHALL NOT repeat the mapping list, the fallback noun, the threshold values, the precedence rule, the relationship-token rules, the canonical section skeleton, or any of the five index-output invariants verbatim.

The concrete spec MAY add per-index behavior that this abstract surface does not subsume (e.g. the per-ADR entry-line form, the per-ADR structured-relationship-line emission rule, the per-ADR correction-table header). The concrete spec SHALL NOT contradict any abstract requirement.

#### Scenario: Concrete spec declares the three per-index bindings and the two type-specific section headings

- **WHEN** a concrete decision-record index spec inherits this surface
- **THEN** the spec names its storage directory, index filename, and index H1 verbatim (the three per-index bindings)
- **THEN** the spec names its type-specific correction-table heading and historical-section heading verbatim (the two type-specific section headings)
- **THEN** the spec references the abstract surface's mapping list, fallback noun, threshold values, canonical section skeleton, relationship-token rules, and four index-output invariants by name

#### Scenario: Concrete spec adds per-index behavior without duplicating the abstract surface

- **WHEN** a concrete decision-record index spec adds per-index behavior (e.g. the per-ADR entry-line form `- [NNNN — {Title}](./NNNN-slug.md)`)
- **THEN** the per-index behavior is stated in the concrete spec, not in this abstract surface
- **THEN** the abstract surface is not edited to add the per-index behavior

#### Scenario: Concrete spec does not contradict the abstract surface

- **WHEN** a concrete decision-record index spec inherits this surface
- **THEN** the spec's text is consistent with the abstract surface's five invariants (English, links, record titles, index H1, canonical section skeleton)
- **THEN** the spec's text is consistent with the abstract surface's threshold contract (cold build is the sole recomputer; warm splice does not recompute)
- **THEN** the spec's text is consistent with the abstract surface's relationship-token rules (family-bound `supersedes`, MAY-cross `refs` / `pair-with` / `amends` / `reframes` / `reverses`)
- **THEN** a concrete spec that would weaken an abstract invariant is rejected at review
