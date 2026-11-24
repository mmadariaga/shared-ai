# tasks-scaffold-format Specification

## Purpose
TBD - created by archiving change tasks-as-scaffold. Update Purpose after archive.

## Requirements

### Requirement: tasks-artifact-format

The active task-generation step SHALL remain the sole authority for the narrative task scaffold, the progress checkbox, Routing line, the per-kind step fields, and the mandatory trailing section. `tasks.md` SHALL be a planning document whose only checkbox markers are one `- [ ] Step N:` progress line per step, which `/sai-3-implement` checks off as each step is committed. `tasks.md` SHALL record only what the code of the plan RED does not express.

The file SHALL contain one numbered section per implementation step, of one of two kinds. A step with tests changes behavior that a test can pin and SHALL be structured as:

    ## Step N: <title>

    - [ ] Step N: <title>

    **Routing**: category=<category> · context=<context> · difficulty=<difficulty>

    **Scenarios**:
    - <title of a spec scenario the step covers>
    - <short title of an edge behavior the step must prove>

For a change whose `.openspec.yaml` sets `skip_specs: true`, the `**Scenarios**` bullets SHALL be short titles of the statements of the proposal's What Changes that the step covers. After the plan RED, the deterministic write-back of `file-manifest.js` SHALL add `**Tests**` and `**Test Command**` after `**Scenarios**`; the design agent SHALL NOT write those two fields by hand.

A step without tests changes files that no test can usefully pin (documentation, prompts, declarative configuration, glue code) and SHALL be structured as:

    ## Step N: <title>

    - [ ] Step N: <title>

    **Routing**: category=<category> · context=<context> · difficulty=<difficulty>

    **Files Affected**:
    - A <path of a file this step creates>
    - M <path of a file this step modifies>
    - D <path of a file this step deletes>
    - R <source path> -> <destination path>

    **What Changes**: <what changes in each file>

    **Closure criterion**: <one checkable sentence that states when the step is done>

A step that changes tested code and also untested files SHALL be split, so the untested files go to a step without tests. The fields after `**Routing**` SHALL be a closed set per kind: `**Scenarios**`, then the written-back `**Tests**` and `**Test Command**`, for a step with tests; `**Files Affected**`, `**What Changes**`, and `**Closure criterion**` for a step without tests. No step SHALL carry `**What Will Be Done**`, `**Testing Strategy**`, or `**Existing Tests Broken**`, and no other field SHALL be invented by the design agent.

The progress checkbox line SHALL sit directly beneath its `## Step N:` heading, SHALL be written unchecked as `- [ ] Step N: <title>`, and SHALL never be written as `- [x]` at generation. No other checkbox line SHALL appear in the file.

The `**Files Affected**` sub-field SHALL contain one file-system change per Markdown bullet line, not a comma-separated list. Newly generated ordinary entries SHALL start with `- ` followed by exactly one change-type token from the closed four-letter vocabulary `A` (created), `M` (modified), `D` (deleted), `R` (moved/renamed), followed by exactly one space and then the exact project-root-relative path of the file. An `R` line SHALL instead carry the source path, the separator ` -> `, and the destination path, so a move or rename is recorded as one entry and never as a `D` entry plus an `A` entry.

As the sole bounded generated-output exception to the exact-file form, an A entry MAY use `- A <directory>/<prefix>*<suffix> — generated count=<positive integer>`. The directory SHALL be exact and repository-relative, the basename SHALL have one wildcard between non-empty literal prefix and suffix, and the count SHALL be positive. Recursive and unrestricted wildcards SHALL not be permitted. This exception SHALL add neither a change-type token nor another Step field. Apply SHALL resolve the family to exact paths before close; the derivative manifest SHALL retain the declared count rather than turn the family into an executable path.

The `R` token SHALL cover both a pure relocation and a relocation that rewrites the file content; the extent of the content change is carried by the step `**What Changes**` prose, not by the token. The token SHALL declare what happens to the file in the step commit, not what the code inside it does; the four tokens are a closed vocabulary and no fifth letter SHALL be invented.

For ordinary exact entries, the token SHALL be determined by the repository state immediately before that step commit, not by the step title or prose verb: a path that does not exist at that baseline and is created by the step is `A`; a path that exists at that baseline and is changed in place is `M`; a path that exists at that baseline and is removed is `D`; a path that exists at that baseline and is moved or renamed is `R`. A file created by an earlier step of the same change therefore carries `M` in a later step that changes it.

Any consumer of an ordinary entry SHALL allow the Markdown `- ` presentation prefix and strip it, when present, before stripping the leading change-type token and interpreting the path, and for an `R` entry SHALL read the two paths on either side of the separator; which of the two paths a consumer then acts on is defined by that consumer own requirement. No Routing value is derived from these paths. Consumers of bounded generated entries SHALL retain the separate directory, family, and count semantics rather than treat the wildcard declaration as one exact file.

The `**Routing**` line SHALL be the first sub-field under the progress checkbox, immediately preceding `**Scenarios**` or `**Files Affected**`. The line uses key=value tagged pairs (not positional tokens); the three keys `category`, `context`, `difficulty` are mandatory and in that order. The three values are drawn from the enumerations defined in the `tasks-routing-metadata` capability spec, and each value is defined by its goal in the design instructions. No `routing.md`, routing table, or routing JSON sidecar is emitted; the formatted line is the only routing artifact. An optional trailing parenthetical `(... )` is allowed for human audit and MUST be ignored by any parser of the line.

The bullet presentation SHALL apply to new generation, not require rewriting existing artifacts. Legacy unbulleted entries SHALL remain valid input. Empty-list markers and all existing token, path, generated-family, and note semantics SHALL be preserved.

After all implementation steps, the file SHALL end with one mandatory section, `## Implementation Context`, populated by `/sai-2-design` from codebase research findings (see `tasks-implementation-context` capability). The file SHALL carry no `## Required Documentation` section. Archived `tasks.md` files and archived files that predate the `**Routing**` line are not required to be retroactively updated.

#### Scenario: tasks.md generated with one progress checkbox per step
- **WHEN** `sai-2-design` generates `tasks.md` for a change
- **THEN** each `## Step N:` section carries one `- [ ] Step N:` line directly beneath its heading, followed by the Routing line and the fields of its kind; no `- [x]` marker is present and no other checkbox line appears in the file

#### Scenario: tasks.md generated without checkboxes
- **WHEN** `sai-2-design` generates `tasks.md` for a change
- **THEN** no `- [x]` marker is present at generation, and no checkbox line other than the unchecked `- [ ] Step N:` progress line appears in the file

#### Scenario: tasks.md used as narrative context
- **WHEN** `/sai-3-implement` reads `tasks.md` to plan its steps
- **THEN** it reads the checkbox lines as progress, and writes no `implementation.md` that would use `tasks.md` as a narrative scaffold

#### Scenario: tasks.md used as progress tracker
- **WHEN** `/sai-3-implement` commits a step
- **THEN** it checks off that step `- [ ] Step N:` line in `tasks.md`, and `/sai-status` routes on the checked count

#### Scenario: tasks.md contains both mandatory trailing sections
- **WHEN** `sai-2-design` generates `tasks.md`
- **THEN** the file ends with `## Implementation Context` containing real content derived from design-phase research, and carries no `## Required Documentation` section

#### Scenario: Existing Tests Broken label is pinned
- **WHEN** `sai-2-design` generates a step of either kind
- **THEN** the step carries no `**Existing Tests Broken**` field, because the plan RED bounds its own edits to existing tests

#### Scenario: Archived tasks.md files exempt from the fifth sub-field
- **WHEN** a reader inspects a `tasks.md` archived before this change
- **THEN** the presence of `**What Will Be Done**`, `**Existing Tests Broken**`, or `## Required Documentation` in it is not a violation and the file is not rewritten

#### Scenario: each Files Affected entry declares its change type
- **WHEN** `sai-2-design` emits the `**Files Affected**` of a step without tests
- **THEN** every change entry starts with `- ` followed by a token from `A`, `M`, `D`, `R` and its repository-relative exact path or permitted bounded A family, one entry per line without a comma-separated list

#### Scenario: a rename is one entry with source and destination
- **WHEN** a step without tests moves or renames a file
- **THEN** the sub-field carries one `- R <source path> -> <destination path>` entry rather than a D entry plus an A entry

#### Scenario: consumers read the path after the change-type token
- **WHEN** a consumer reads an ordinary `**Files Affected**` entry
- **THEN** it allows the optional `- ` presentation prefix and reads the path after the leading change-type token, with both R paths available around ` -> `

#### Scenario: R covers relocation with and without rewrite
- **WHEN** a step without tests both relocates a file and substantially rewrites its content
- **THEN** the entry is a single R entry identical in form to a pure relocation, with the content change described in What Changes rather than the token

#### Scenario: token derived from the file's existence at the step's baseline
- **WHEN** a step adds content to a file that already exists immediately before that step commit
- **THEN** its ordinary Files Affected entry is M rather than A regardless of the step title or prose verb

#### Scenario: token baseline is the repository state before the step's commit
- **WHEN** a step changes a file that an earlier step of the same change created
- **THEN** the later entry is M because the token is relative to that step commit baseline rather than the change original baseline

#### Scenario: archived tasks.md files exempt from change-type entries
- **WHEN** a reader inspects a `tasks.md` archived before this change
- **THEN** the absence of change-type tokens on its Files Affected entries is not a violation

#### Scenario: task-format-is-step-owned
- **WHEN** `tasks.md` is generated
- **THEN** it uses the active step-owned scaffold with one bounded rule for each field of each step kind

#### Scenario: Bounded generated exception keeps the scaffold closed
- **WHEN** a step without tests declares a known generated family with an exact directory, literal prefix and suffix, one basename wildcard, and positive count
- **THEN** it uses the existing A token inside Files Affected without adding a token or Step field

#### Scenario: a step with tests carries only its scenarios before the write-back
- **WHEN** `sai-2-design-worker` writes a step whose behavior a test can pin
- **THEN** the step carries its checkbox, its `**Routing**` line, and `**Scenarios**`, and no `**Files Affected**`, `**What Changes**`, `**Tests**`, or `**Test Command**`

#### Scenario: a step mixing tested code and documentation is split
- **WHEN** a planned change touches tested code and also a documentation file
- **THEN** the documentation file goes to a separate step without tests that lists it under `**Files Affected**`

### Requirement: schema-tasks-instruction-updated

The `tasks` artifact entry in `openspec/schemas/sai-workflow/schema.yaml` SHALL have its `instruction` field delegate to the `## Generate tasks.md` section of `sai/commands/design/steps/tasks.md`, which SHALL describe the two step kinds, the mandatory trailing `## Implementation Context` section, the `**Routing**` keyword line, and the change-type-declaring `**Files Affected**` format of a step without tests. The schema instruction SHALL NOT restate that format, and SHALL NOT contain the sentence "IMPORTANT: The apply phase parses checkbox format."

The template at `openspec/schemas/sai-workflow/templates/tasks.md` SHALL show one step of each kind. Both SHALL show the `**Routing**` line immediately after the progress checkbox, using the key=value format with the placeholders `category=<!-- frontend-ui|frontend-code|backend|data|infra|docs|other -->`, `context=<!-- small|medium|large -->` and `difficulty=<!-- low|medium|high -->`. The step with tests SHALL show `**Scenarios**` and say that the write-back adds `**Tests**` and `**Test Command**`. The step without tests SHALL show `**Files Affected**` as one Markdown bullet line per change, each line carrying `- ` followed by a change-type token placeholder from the closed vocabulary (`A`/`M`/`D`/`R`) followed by a path placeholder, then `**What Changes**` and `**Closure criterion**`. The template SHALL end with `## Implementation Context` and SHALL carry no `## Required Documentation`, `**What Will Be Done**`, or `**Existing Tests Broken**`.

#### Scenario: schema instruction matches narrative format with trailing sections, Routing line, and change-type Files Affected
- **WHEN** `openspec instructions tasks --change <name>` is run
- **THEN** the returned `instruction` field directs the agent to the `## Generate tasks.md` section of `sai/commands/design/steps/tasks.md`, which describes both step kinds, the `**Routing**` line, the change-type `**Files Affected**` format, and the trailing `## Implementation Context` section; the schema instruction itself contains no reference to the apply phase parsing `- [ ]` markers

#### Scenario: tasks template shows the Routing line in key=value form and change-type Files Affected entries
- **WHEN** `openspec/schemas/sai-workflow/templates/tasks.md` is read
- **THEN** it shows a step with tests (Routing, Scenarios) and a step without tests (Routing, Files Affected with `- <A|M|D|R> <path>` bullets, What Changes, Closure criterion), each Routing line in key=value form with `category`, `context`, `difficulty` in that order, followed by `## Implementation Context`

### Requirement: tasks-design-instruction-updated

The active task-generation step at `sai/commands/design/steps/tasks.md` SHALL describe the `**Files Affected**` sub-field of a step without tests as one Markdown bullet entry per line. Newly generated ordinary entries SHALL start with `- ` followed by exactly one token from `A` (created), `M` (modified), `D` (deleted), `R` (moved/renamed) followed by the exact project-root-relative path; an R entry SHALL carry source and destination separated by ` -> `.

The instruction SHALL also permit the bounded generated exception `- A <directory>/<prefix>*<suffix> — generated count=<positive integer>` in the Files Affected of a step without tests, with an exact repository-relative directory, one basename wildcard, non-empty literal prefix and suffix, and a positive count. It SHALL forbid unrestricted and recursive wildcard declarations, require exact resolution before Apply close, and prohibit workers from widening the declaration. Ordinary paths SHALL remain exact.

The instruction SHALL NOT describe Files Affected as a comma-separated list. It SHALL direct the design agent to derive ordinary tokens from the file's existence, not from the Step's title or prose verb. An existing file SHALL be M even when prose says "add". R SHALL cover pure relocations and relocations with rewrites, with content changes described by What Changes rather than the token.

The Routing line subsection SHALL define each Routing value by its goal and SHALL NOT match Files Affected paths, the change-type token, or either R path against pattern tables to derive a Routing value.

#### Scenario: design instruction emits the change-type format
- **WHEN** `sai-2-design` loads `sai/commands/design/steps/tasks.md` to generate tasks
- **THEN** the instruction describes, for a step without tests, one Markdown bullet entry per line prefixed with `- ` and the closed A/M/D/R vocabulary and does not describe Files Affected as a comma-separated list

#### Scenario: Routing is not derived from Files Affected paths
- **WHEN** `sai-2-design` assigns a Step's Routing values
- **THEN** it judges them by goal and does not match the Step's Files Affected paths against any pattern table

#### Scenario: design instruction derives tokens from file existence
- **WHEN** `sai-2-design` emits ordinary Files Affected entries
- **THEN** it derives tokens from the file's existence and never labels an existing path A solely because prose says "add"

#### Scenario: Design instruction bounds generated output declarations
- **WHEN** Design needs a generated-output family rather than individual predetermined names
- **THEN** the instruction requires its exact directory, bounded basename family, positive expected count, and exact resolution before close

#### Scenario: routing derivation ignores the change-type token
- **WHEN** a design step declares Files Affected entries with change-type tokens
- **THEN** the Routing line values are not derived from the change-type token and are not affected by it

#### Scenario: task-routing-uses-destination-path
- **WHEN** a design step renames a file and includes a `- R <source> -> <destination>` entry
- **THEN** the Routing line values are not derived from the destination path

### Requirement: tasks-glossary-term-updated

The `## Language` section of `GLOSSARY.md` at the project root SHALL contain exactly one `**File Change Type**` entry with a one-sentence definition stating what it IS — a per-file declaration of what the commit of a `tasks.md` step without tests does to that file (create, modify, delete, or move/rename) — drawn from the closed four-letter vocabulary `A` / `M` / `D` / `R`. The entry SHALL carry an `*Avoid*` line rejecting the overloaded bare phrase "change type" (which collides with "OpenSpec change").

The `## Relationships` section of `GLOSSARY.md` SHALL contain an entry stating that a **File Change Type** prefixes every `**Files Affected**` entry of a step without tests and that an `R` entry names its source and destination paths. The entry SHALL NOT link **File Change Type** to a routing derivation.

The `## Flagged ambiguities` section of `GLOSSARY.md` SHALL contain an entry resolving the "change type" vs "OpenSpec change" overload in favor of **File Change Type** with a stated rationale.

A `## Language` entry for **File Change Type** is not duplicated: a pre-existing working-tree edit adding the term is reconciled to this contract rather than re-created.

#### Scenario: File Change Type entry present in Language with Avoid aliases

- **WHEN** `GLOSSARY.md` is read after the change lands
- **THEN** `## Language` contains exactly one `**File Change Type**` entry, which carries an `*Avoid*` line rejecting the overloaded bare phrase "change type"

#### Scenario: File Change Type relationship names Files Affected entries without routing derivation
- **WHEN** `GLOSSARY.md` is read after this change
- **THEN** `## Relationships` relates **File Change Type** to the `**Files Affected**` entries of a step without tests and their `R` source and destination paths, with no routing-derivation link

#### Scenario: change type vs OpenSpec change ambiguity resolved in Flagged ambiguities

- **WHEN** `GLOSSARY.md` is read after the change lands
- **THEN** `## Flagged ambiguities` contains an entry resolving the "change type" vs "OpenSpec change" overload in favor of **File Change Type**, with its rationale stated

#### Scenario: File Change Type linked to Routing Layer and Routing Discipline in Relationships
- **WHEN** `GLOSSARY.md` is read after this change
- **THEN** `## Relationships` relates **File Change Type** to the `**Files Affected**` entries of a step without tests and their `R` source and destination paths, with no routing-derivation link

### Requirement: Each step SHALL include a Routing line

Every `## Step N:` section in a new `tasks.md` SHALL include a line of the form `**Routing**: category=<category> · context=<context> · difficulty=<difficulty>` immediately after the step's progress checkbox and before `**Scenarios**` (a step with tests) or `**Files Affected**` (a step without tests). The three key=value pairs are drawn from the enumerations in the `tasks-routing-metadata` capability spec. The line is mandatory for all `tasks.md` files emitted by `/sai-2-design`; archived `tasks.md` files are exempt.

#### Scenario: New step carries a Routing line in key=value form
- **WHEN** `sai-2-design` generates a `tasks.md` step
- **THEN** the section's first sub-field is a `**Routing**` line with exactly the keys `category`, `context`, `difficulty` in that order, separated by middle dots (U+00B7), each value from its `tasks-routing-metadata` enumeration

#### Scenario: Archived tasks.md files are exempt

- **WHEN** a reader inspects a `tasks.md` archived before the `**Routing**` line existed
- **THEN** the absence of a `**Routing**` line is not a violation, and only `tasks.md` files emitted by `/sai-2-design` are checked for the line

#### Scenario: Routing line position is invariant

- **WHEN** a reader scans a step section top-to-bottom
- **THEN** the order of sub-fields is Routing, Scenarios, Tests, Test Command for a step with tests, or Routing, Files Affected, What Changes, Closure criterion for a step without tests, and no other ordering is acceptable

### Requirement: Files Affected permits bounded generated families

The active task-generation step SHALL permit `A <directory>/<prefix>*<suffix> — generated count=<positive integer>` inside the existing Files Affected field. The directory SHALL be exact and repository-relative, the basename SHALL contain one wildcard between non-empty literal prefix and suffix, and the count SHALL be positive.

This form SHALL extend the existing A token without adding a sixth Step field or another change-type token. Other changes SHALL retain exact A, M, D, or R entries. Recursive or unrestricted wildcards SHALL not be accepted. The File Manifest SHALL carry a generated declaration as a derivative rather than an executable path; Apply SHALL resolve exact files before close. Workers SHALL not widen the declaration.

#### Scenario: Known generated family is planned
- **WHEN** a Step produces a bounded family of generated files whose names are not yet individually known
- **THEN** Files Affected declares its exact directory, literal basename family, and expected positive count

#### Scenario: Recursive wildcard is declared
- **WHEN** an affected-file declaration uses a recursive or unrestricted wildcard
- **THEN** the shared declaration parser rejects it rather than treating it as authorized paths
