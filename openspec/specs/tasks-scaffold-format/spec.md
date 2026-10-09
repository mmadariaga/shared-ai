# tasks-scaffold-format Specification

## Purpose
TBD - created by archiving change tasks-as-scaffold. Update Purpose after archive.

## Requirements

### Requirement: tasks-artifact-format

The active task-generation step SHALL remain the sole authority for the narrative task scaffold, Routing line, Files Affected entries, and mandatory trailing sections. `tasks.md` SHALL be a narrative planning document with no checkbox markers (`- [ ]`).

The file SHALL contain one numbered section per implementation step, structured as:

    ## Step N: <title>

    **Routing**: category=<category> · context=<context> · difficulty=<difficulty>

    **Files Affected**:
    A <path of a file this step creates>
    M <path of a file this step modifies>
    D <path of a file this step deletes>
    R <source path> -> <destination path>

    **What Will Be Done**: <prose description of the work in this step>

    **Testing Strategy**: <how correctness will be verified for this step>

    **Existing Tests Broken**: <existing tests this step breaks, each with failure mode `compile` or `runtime`; `None` when the step breaks none>

The `**Files Affected**` sub-field SHALL contain one file-system change per line, not a comma-separated list. Ordinary entries SHALL start with exactly one change-type token from the closed four-letter vocabulary `A` (created), `M` (modified), `D` (deleted), `R` (moved/renamed), followed by exactly one space and then the exact project-root-relative path of the file. An `R` line SHALL instead carry the source path, the separator ` -> `, and the destination path, so a move or rename is recorded as one entry and never as a `D` entry plus an `A` entry.

As the sole bounded generated-output exception to the exact-file form, an A entry MAY use `A <directory>/<prefix>*<suffix> — generated count=<positive integer>`. The directory SHALL be exact and repository-relative, the basename SHALL have one wildcard between non-empty literal prefix and suffix, and the count SHALL be positive. Recursive and unrestricted wildcards SHALL not be permitted. This exception SHALL add neither a change-type token nor a sixth Step field. Apply SHALL resolve the family to exact paths before close; the derivative manifest SHALL retain the declared count rather than turn the family into an executable path.

The `R` token SHALL cover both a pure relocation and a relocation that rewrites the file's content; the extent of the content change is carried by the step's `**What Will Be Done**` prose, not by the token. The token SHALL declare what happens to the file in the step's commit, not what the code inside it does; the four tokens are a closed vocabulary and no fifth letter SHALL be invented.

For ordinary exact entries, the token SHALL be determined by the repository state immediately before that step's commit, not by the step's title or prose verb: a path that does not exist at that baseline and is created by the step is `A`; a path that exists at that baseline and is changed in place is `M`; a path that exists at that baseline and is removed is `D`; a path that exists at that baseline and is moved or renamed is `R`. A file created by an earlier step of the same change therefore carries `M` in a later step that changes it.

Any consumer of an ordinary entry SHALL strip the leading change-type token before interpreting the path, and for an `R` entry SHALL read the two paths on either side of the separator; which of the two paths a consumer then acts on is defined by that consumer's own requirement. No Routing value is derived from these paths. Consumers of bounded generated entries SHALL retain the separate directory, family, and count semantics rather than treat the wildcard declaration as one exact file.

The `**Routing**` line SHALL be the first sub-field under the step title, immediately preceding `**Files Affected**`. The line uses key=value tagged pairs (not positional tokens); the three keys `category`, `context`, `difficulty` are mandatory and in that order. The three values are drawn from the enumerations defined in the `tasks-routing-metadata` capability spec, and each value is defined by its goal in the design instructions. No `routing.md`, routing table, or routing JSON sidecar is emitted; the formatted line is the only routing artifact. An optional trailing parenthetical `(... )` is allowed for human audit and MUST be ignored by any parser of the line.

The `**Existing Tests Broken**` sub-field SHALL be the fifth and last sub-field of every step section, immediately following `**Testing Strategy**`. Its literal label SHALL be exactly `**Existing Tests Broken**` — the label is pinned so two independent design runs emit the same parseable token. Its content contract is defined by the `tasks-existing-test-impact` capability spec. The sub-field is mandatory for all `tasks.md` files emitted by `/sai-2-design` after this change lands; archived `tasks.md` files are exempt.

The five sub-fields enumerated above are the complete and closed set for a `## Step N` section. No sixth sub-field SHALL be invented by the design agent.

The file SHALL NOT contain any `- [ ]` or `- [x]` markers.

After all implementation steps, the file SHALL contain the following two mandatory sections in order:

1. `## Required Documentation` — populated by `/sai-2-design` from docs visited during codebase research (see `tasks-required-documentation` capability)
2. `## Implementation Context` — populated by `/sai-2-design` from codebase research findings (see `tasks-implementation-context` capability)

Both sections are mandatory for all new changes. Archived `tasks.md` files that predate this change are not required to be retroactively updated. Archived `tasks.md` files that predate the `**Routing**` line are exempt from carrying it; only new `tasks.md` files emitted after the `tasks-routing-metadata` change lands carry the line.

#### Scenario: tasks.md generated without checkboxes
- **WHEN** `sai-2-design` generates `tasks.md` for a change
- **THEN** the file contains only numbered `## Step N:` sections with Routing, Files Affected, What Will Be Done, Testing Strategy, and Existing Tests Broken sub-fields; no `- [ ]` markers are present anywhere in the file

#### Scenario: tasks.md used as narrative context
- **WHEN** `sai-3-implement` reads `tasks.md` to produce `implementation.md`
- **THEN** it uses tasks.md as a high-level scaffold to organize the granular steps in `implementation.md`, not as a progress tracker

#### Scenario: tasks.md contains both mandatory trailing sections
- **WHEN** `sai-2-design` generates `tasks.md`
- **THEN** the file ends with `## Required Documentation` followed by `## Implementation Context`, both containing real content derived from design-phase research

#### Scenario: Existing Tests Broken label is pinned
- **WHEN** `sai-2-design` emits a step's existing-test-impact declaration
- **THEN** the sub-field label is exactly `**Existing Tests Broken**`, with no synonym such as "Tests Affected" or "Broken Tests"

#### Scenario: Archived tasks.md files exempt from the fifth sub-field
- **WHEN** a reader inspects a `tasks.md` archived before this change
- **THEN** the absence of an `**Existing Tests Broken**` sub-field is not a violation

#### Scenario: each Files Affected entry declares its change type
- **WHEN** `sai-2-design` emits a step's `**Files Affected**`
- **THEN** every change entry starts with a token from `A`, `M`, `D`, `R` and its repository-relative exact path or permitted bounded A family, one entry per line without a comma-separated list

#### Scenario: a rename is one entry with source and destination
- **WHEN** a step moves or renames a file
- **THEN** the sub-field carries one `R <source path> -> <destination path>` entry rather than a D entry plus an A entry

#### Scenario: consumers read the path after the change-type token
- **WHEN** a consumer reads an ordinary `**Files Affected**` entry
- **THEN** it reads the path after the leading token, with both R paths available around ` -> `

#### Scenario: R covers relocation with and without rewrite
- **WHEN** a step both relocates a file and substantially rewrites its content
- **THEN** the entry is a single R entry identical in form to a pure relocation, with the content change described in What Will Be Done rather than the token

#### Scenario: token derived from the file's existence at the step's baseline
- **WHEN** a step adds content to a file that already exists immediately before that step's commit
- **THEN** its ordinary Files Affected entry is M rather than A regardless of the step's title or prose verb

#### Scenario: token baseline is the repository state before the step's commit
- **WHEN** a step changes a file that an earlier step of the same change created
- **THEN** the later entry is M because the token is relative to that step's commit baseline rather than the change's original baseline

#### Scenario: archived tasks.md files exempt from change-type entries
- **WHEN** a reader inspects a `tasks.md` archived before this change
- **THEN** the absence of change-type tokens on its Files Affected entries is not a violation

#### Scenario: task-format-is-step-owned
- **WHEN** `tasks.md` is generated
- **THEN** it uses the active step-owned scaffold with one bounded rule for each required field

#### Scenario: Bounded generated exception keeps the scaffold closed
- **WHEN** a Step declares a known generated family with an exact directory, literal prefix and suffix, one basename wildcard, and positive count
- **THEN** it uses the existing A token inside Files Affected without adding a token or Step field

### Requirement: schema-tasks-instruction-updated

The `tasks` artifact entry in `openspec/schemas/sai-workflow/schema.yaml` SHALL have its `instruction` field updated to describe the narrative scaffold format including the two mandatory trailing sections, the `**Routing**` keyword line, and the change-type-declaring `**Files Affected**` format. The instruction SHALL NOT contain the sentence "IMPORTANT: The apply phase parses checkbox format." The instruction SHALL describe the Routing line as the first sub-field of every `## Step N` section, SHALL specify the key=value tagged format (`category=<category> · context=<context> · difficulty=<difficulty>`), and SHALL reference the `tasks-routing-metadata` capability spec for the token enumerations and goal definitions. The instruction SHALL describe `**Files Affected**` as one entry per line, each entry starting with exactly one change-type token from the closed vocabulary `A` (created), `M` (modified), `D` (deleted), `R` (moved/renamed, with the source path and the destination path separated by ` -> `), and SHALL NOT describe the sub-field as a comma-separated list of paths.

The template at `openspec/schemas/sai-workflow/templates/tasks.md` SHALL show the `**Routing**` line in its `## Step N` skeleton, immediately after the step title and before `**Files Affected**`, using the key=value format with the placeholders `category=<!-- frontend-ui|frontend-code|backend|data|infra|docs|other -->`, `context=<!-- small|medium|large -->` and `difficulty=<!-- low|medium|high -->`. The template SHALL show `**Files Affected**` as one line per change, each line carrying a change-type token placeholder from the closed vocabulary (`A`/`M`/`D`/`R`) followed by a path placeholder.

#### Scenario: schema instruction matches narrative format with trailing sections, Routing line, and change-type Files Affected

- **WHEN** `openspec instructions tasks --change <name>` is run
- **THEN** the returned `instruction` field describes the `## Step N:` scaffold format
- **THEN** the instruction describes the `**Routing**` line as the first sub-field, in the same position as Files Affected / What Will Be Done / Testing Strategy / Existing Tests Broken
- **THEN** the instruction specifies the key=value format with the three keys `category`, `context`, `difficulty` in that order
- **THEN** the instruction describes `**Files Affected**` as one entry per line with change-type tokens from the closed vocabulary `A`, `M`, `D`, `R` and the `R` source -> destination form
- **THEN** the instruction does not describe `**Files Affected**` as a comma-separated list of paths
- **THEN** the instruction references `## Required Documentation` and `## Implementation Context` as mandatory trailing sections
- **THEN** the instruction contains no reference to checkboxes or the apply phase parsing `- [ ]` markers

#### Scenario: tasks template shows the Routing line in key=value form and change-type Files Affected entries

- **WHEN** `openspec/schemas/sai-workflow/templates/tasks.md` is read
- **THEN** the `## Step N` template skeleton includes a `**Routing**` line as the first sub-field
- **THEN** the template's `## Step N` block lists Routing, Files Affected, What Will Be Done, Testing Strategy, and Existing Tests Broken in that order
- **THEN** the `**Routing**` line in the template uses the key=value format with the three keys `category`, `context`, `difficulty` in that order
- **THEN** the template's `**Files Affected**` block shows one entry per line with a change-type token placeholder from the closed vocabulary `A`/`M`/`D`/`R` followed by a path placeholder

### Requirement: tasks-design-instruction-updated

The active task-generation step at `sai/commands/design/steps/tasks.md` SHALL describe the `**Files Affected**` sub-field as one entry per line. Ordinary entries SHALL start with exactly one token from `A` (created), `M` (modified), `D` (deleted), `R` (moved/renamed) followed by the exact project-root-relative path; an R entry SHALL carry source and destination separated by ` -> `.

The instruction SHALL also permit the bounded generated exception `A <directory>/<prefix>*<suffix> — generated count=<positive integer>`, with an exact repository-relative directory, one basename wildcard, non-empty literal prefix and suffix, and a positive count. It SHALL forbid unrestricted and recursive wildcard declarations, require exact resolution before Apply close, and prohibit workers from widening the declaration. Ordinary paths SHALL remain exact.

The instruction SHALL NOT describe Files Affected as a comma-separated list. It SHALL direct the design agent to derive ordinary tokens from whether the path exists immediately before that Step's commit, not from the Step's title or prose verb. An existing file SHALL be M even when prose says "add". R SHALL cover pure relocations and relocations with rewrites, with content changes described by What Will Be Done rather than the token.

The Routing line subsection SHALL define each Routing value by its goal and SHALL NOT match Files Affected paths, the change-type token, or either R path against pattern tables to derive a Routing value.

#### Scenario: design instruction emits the change-type format
- **WHEN** `sai-2-design` loads `sai/commands/design/steps/tasks.md` to generate tasks
- **THEN** the instruction describes one entry per line with the closed A/M/D/R vocabulary and does not describe Files Affected as a comma-separated list

#### Scenario: Routing is not derived from Files Affected paths
- **WHEN** `sai-2-design` assigns a Step's Routing values
- **THEN** it judges them by goal and does not match the Step's Files Affected paths against any pattern table

#### Scenario: design instruction derives tokens from file existence
- **WHEN** `sai-2-design` emits ordinary Files Affected entries
- **THEN** it derives tokens from existence immediately before the Step's commit and never labels an existing path A solely because prose says "add"

#### Scenario: Design instruction bounds generated output declarations
- **WHEN** Design needs a generated-output family rather than individual predetermined names
- **THEN** the instruction requires its exact directory, bounded basename family, positive expected count, and exact resolution before close

#### Scenario: routing derivation ignores the change-type token
- **WHEN** a design step declares Files Affected entries with change-type tokens
- **THEN** the Routing line values are not derived from the change-type token and are not affected by it

#### Scenario: task-routing-uses-destination-path
- **WHEN** a design step renames a file and includes an `R <source> -> <destination>` entry
- **THEN** the Routing line values are not derived from the destination path

### Requirement: tasks-glossary-term-updated

The `## Language` section of `GLOSSARY.md` at the project root SHALL contain exactly one `**File Change Type**` entry with a one-sentence definition stating what it IS — a per-file declaration of what a `tasks.md` step's commit does to that file (create, modify, delete, or move/rename) — drawn from the closed four-letter vocabulary `A` / `M` / `D` / `R`. The entry SHALL carry an `*Avoid*` line rejecting the overloaded bare phrase "change type" (which collides with "OpenSpec change").

The `## Relationships` section of `GLOSSARY.md` SHALL contain an entry stating that a **File Change Type** prefixes every `**Files Affected**` entry of a step and that an `R` entry names its source and destination paths. The entry SHALL NOT link **File Change Type** to a routing derivation.

The `## Flagged ambiguities` section of `GLOSSARY.md` SHALL contain an entry resolving the "change type" vs "OpenSpec change" overload in favor of **File Change Type** with a stated rationale.

A `## Language` entry for **File Change Type** is not duplicated: a pre-existing working-tree edit adding the term is reconciled to this contract rather than re-created.

#### Scenario: File Change Type entry present in Language with Avoid aliases

- **WHEN** `GLOSSARY.md` is read after the change lands
- **THEN** `## Language` contains exactly one `**File Change Type**` entry
- **AND** the entry carries an `*Avoid*` line rejecting the overloaded bare phrase "change type"

#### Scenario: File Change Type relationship names Files Affected entries without routing derivation
- **WHEN** `GLOSSARY.md` is read after this change
- **THEN** `## Relationships` relates **File Change Type** to the `**Files Affected**` entries and their `R` source and destination paths, with no routing-derivation link

#### Scenario: change type vs OpenSpec change ambiguity resolved in Flagged ambiguities

- **WHEN** `GLOSSARY.md` is read after the change lands
- **THEN** `## Flagged ambiguities` contains an entry resolving the "change type" vs "OpenSpec change" overload in favor of **File Change Type**
- **AND** a rationale for the resolution is stated

#### Scenario: File Change Type linked to Routing Layer and Routing Discipline in Relationships
- **WHEN** `GLOSSARY.md` is read after this change
- **THEN** `## Relationships` relates **File Change Type** to the `**Files Affected**` entries and their `R` source and destination paths, with no routing-derivation link

### Requirement: Each step SHALL include a Routing line

Every `## Step N:` section in a new `tasks.md` SHALL include a line of the form `**Routing**: category=<category> · context=<context> · difficulty=<difficulty>` immediately after the step title and before `**Files Affected**`. The three key=value pairs are drawn from the enumerations in the `tasks-routing-metadata` capability spec. The line is mandatory for all `tasks.md` files emitted by `/sai-2-design` after this change lands; archived `tasks.md` files are exempt.

#### Scenario: New step carries a Routing line in key=value form
- **WHEN** `sai-2-design` generates a `tasks.md` step after this change lands
- **THEN** the section's first sub-field is a `**Routing**` line with exactly the keys `category`, `context`, `difficulty` in that order, separated by middle dots (U+00B7), each value from its `tasks-routing-metadata` enumeration

#### Scenario: Archived tasks.md files are exempt

- **WHEN** a reader inspects a `tasks.md` archived before this change
- **THEN** the absence of a `**Routing**` line is not a violation
- **THEN** only `tasks.md` files emitted by `/sai-2-design` after this change are checked for the line

#### Scenario: Routing line position is invariant

- **WHEN** a reader scans a step section top-to-bottom
- **THEN** the order of sub-fields is: Routing, Files Affected, What Will Be Done, Testing Strategy, Existing Tests Broken
- **THEN** no other ordering of these five sub-fields is acceptable
- **THEN** the relative order of the original four sub-fields is unchanged by the addition of the fifth

### Requirement: Files Affected permits bounded generated families

The active task-generation step SHALL permit `A <directory>/<prefix>*<suffix> — generated count=<positive integer>` inside the existing Files Affected field. The directory SHALL be exact and repository-relative, the basename SHALL contain one wildcard between non-empty literal prefix and suffix, and the count SHALL be positive.

This form SHALL extend the existing A token without adding a sixth Step field or another change-type token. Other changes SHALL retain exact A, M, D, or R entries. Recursive or unrestricted wildcards SHALL not be accepted. The File Manifest SHALL carry a generated declaration as a derivative rather than an executable path; Apply SHALL resolve exact files before close. Workers SHALL not widen the declaration.

#### Scenario: Known generated family is planned
- **WHEN** a Step produces a bounded family of generated files whose names are not yet individually known
- **THEN** Files Affected declares its exact directory, literal basename family, and expected positive count

#### Scenario: Recursive wildcard is declared
- **WHEN** an affected-file declaration uses a recursive or unrestricted wildcard
- **THEN** the shared declaration parser rejects it rather than treating it as authorized paths

### Requirement: tasks.md Steps correspond one-to-one to implementation Steps

The design task-generation step SHALL state that Step numbering is final and that each `## Step N` of `tasks.md` corresponds one-to-one to the `#### Step N:` of `implementation.md`, so `/sai-3-implement` neither splits nor merges Steps. It SHALL NOT permit `/sai-3-implement` to split, merge, or otherwise refine Steps without re-tagging `tasks.md`.

#### Scenario: Design instruction pins step correspondence
- **WHEN** `sai/commands/design/steps/tasks.md` is read
- **THEN** it states that each `tasks.md` Step corresponds one-to-one to an `implementation.md` Step and contains no clause letting `/sai-3-implement` split or merge Steps
