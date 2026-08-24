## MODIFIED Requirements

### Requirement: tasks-artifact-format
The active task-generation step SHALL remain the sole authority for the narrative task scaffold, Routing line, Files Affected entries, and mandatory trailing sections. `tasks.md` SHALL be a narrative planning document with no checkbox markers (`- [ ]`).

The file SHALL contain one numbered section per implementation step, structured as:

    ## Step N: <title>

    **Routing**: layer=<layer> · discipline=<discipline> · complexity=<complexity>

    **Files Affected**:
    A <path of a file this step creates>
    M <path of a file this step modifies>
    D <path of a file this step deletes>
    R <source path> -> <destination path>

    **What Will Be Done**: <prose description of the work in this step>

    **Testing Strategy**: <how correctness will be verified for this step>

    **Existing Tests Broken**: <existing tests this step breaks, each with failure mode `compile` or `runtime`; `None` when the step breaks none>

The `**Files Affected**` sub-field SHALL contain one file-system change per line, not a comma-separated list. Each line SHALL start with exactly one change-type token from the closed four-letter vocabulary `A` (created), `M` (modified), `D` (deleted), `R` (moved/renamed), followed by exactly one space and then the project-root-relative path of the file. An `R` line SHALL instead carry the source path, the separator ` -> `, and the destination path, so a move or rename is recorded as one entry and never as a `D` entry plus an `A` entry. The `R` token SHALL cover both a pure relocation and a relocation that rewrites the file's content; the extent of the content change is carried by the step's `**What Will Be Done**` prose, not by the token. The token SHALL declare what happens to the file in the step's commit, not what the code inside it does; the four tokens are a closed vocabulary and no fifth letter SHALL be invented. The token SHALL be determined by the repository state immediately before that step's commit, not by the step's title or prose verb: a path that does not exist at that baseline and is created by the step is `A`; a path that exists at that baseline and is changed in place is `M`; a path that exists at that baseline and is removed is `D`; a path that exists at that baseline and is moved or renamed is `R`. A file created by an earlier step of the same change therefore carries `M` in a later step that changes it. Any consumer of the sub-field SHALL strip the leading change-type token before interpreting the path, and for an `R` entry SHALL read the two paths on either side of the separator; which of the two paths a consumer then acts on is defined by that consumer's own requirement (the routing derivation acts on the destination path only).

The `**Routing**` line SHALL be the first sub-field under the step title, immediately preceding `**Files Affected**`. The line uses key=value tagged pairs (not positional tokens); the three keys `layer`, `discipline`, `complexity` are mandatory and in that order. The three values are drawn from the enumerations defined in the `tasks-routing-metadata` capability spec, and the derivation rubric is encoded in the design instructions. No `routing.md`, routing table, or routing JSON sidecar is emitted; the formatted line is the only routing artifact. An optional trailing parenthetical `(... )` is allowed for human audit and MUST be ignored by any parser of the line.

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
- **THEN** the sub-field label is exactly `**Existing Tests Broken**`
- **AND** no synonym such as "Tests Affected" or "Broken Tests" is emitted in its place

#### Scenario: Archived tasks.md files exempt from the fifth sub-field
- **WHEN** a reader inspects a `tasks.md` archived before this change
- **THEN** the absence of an `**Existing Tests Broken**` sub-field is not a violation

#### Scenario: each Files Affected entry declares its change type
- **WHEN** `sai-2-design` emits a step's `**Files Affected**`
- **THEN** every line starts with exactly one change-type token from the closed vocabulary `A`, `M`, `D`, `R` followed by a space and a project-root-relative path
- **AND** the sub-field is one entry per line with no comma-separated list

#### Scenario: a rename is one entry with source and destination
- **WHEN** a step moves or renames a file
- **THEN** the sub-field carries an `R` entry in the form `R <source path> -> <destination path>`
- **AND** the move is not emitted as a `D` entry plus an `A` entry

#### Scenario: consumers read the path after the change-type token
- **WHEN** a consumer reads a `**Files Affected**` entry (the routing derivation, the `/sai-4-apply` plan cross-check)
- **THEN** it reads the path after the leading change-type token
- **AND** for an `R` entry the two paths are available around the ` -> ` separator; which path a consumer then acts on is defined by that consumer's own requirement (the routing derivation acts on the destination path only — see the `routing derivation ignores the change-type token` scenario under `tasks-design-instruction-updated`)

#### Scenario: R covers relocation with and without rewrite
- **WHEN** a step both relocates a file and substantially rewrites its content
- **THEN** the entry is a single `R` entry, identical in form to a pure relocation
- **AND** the extent of the content change is described in the step's `**What Will Be Done**`, not encoded in the token

#### Scenario: token derived from the file's existence at the step's baseline
- **WHEN** a step adds content to a file that already exists at the repository state immediately before that step's commit
- **THEN** its `**Files Affected**` entry is `M`, not `A`, regardless of whether the step's title or prose uses the word "add"

#### Scenario: token baseline is the repository state before the step's commit
- **WHEN** a step changes a file that an earlier step of the same change created
- **THEN** the later step's entry is `M`, because the token is relative to the repository state immediately before that step's commit, not to the change's original baseline

#### Scenario: archived tasks.md files exempt from change-type entries
- **WHEN** a reader inspects a `tasks.md` archived before this change
- **THEN** the absence of change-type tokens on its `**Files Affected**` entries is not a violation

#### Scenario: task-format-is-step-owned
- **WHEN** `tasks.md` is generated
- **THEN** it uses the active step-owned scaffold with one bounded rule for each required field.

### Requirement: tasks-design-instruction-updated
The active task-generation step at `sai/commands/design/steps/tasks.md` SHALL describe the `**Files Affected**` sub-field as one entry per line, each entry starting with exactly one change-type token from the closed vocabulary `A` (created), `M` (modified), `D` (deleted), `R` (moved/renamed) followed by the project-root-relative path of the file; an `R` entry SHALL carry the source path and the destination path separated by ` -> `. The instruction SHALL NOT describe the sub-field as a comma-separated list of paths. The instruction SHALL direct the design agent to derive each entry's token from whether the path exists at the repository state immediately before that step's commit — not from the step's title or prose verb — so an entry for a file that already exists is `M` even when the step prose says "add". The instruction SHALL state that `R` covers both pure relocations and relocations that rewrite content, with the extent of content change carried by `**What Will Be Done**` prose rather than by the token.

The routing-derivation subsection of `sai/commands/design/steps/tasks.md` SHALL state that path patterns are matched against the paths of `**Files Affected**` entries after stripping the leading change-type token, so the four `layer` and five `discipline` pattern tables keep matching the same paths as before; an `R` entry SHALL contribute only its destination path to the pattern match, because routing describes where the step's work lands.

#### Scenario: design instruction emits the change-type format
- **WHEN** `sai-2-design` loads `sai/commands/design/steps/tasks.md` to generate `tasks.md`
- **THEN** the Files Affected format in the instruction is one entry per line with change-type tokens from the closed vocabulary `A`/`M`/`D`/`R`
- **AND** the sub-field is not described as a comma-separated list of paths

#### Scenario: routing derivation ignores the change-type token
- **WHEN** the routing derivation from `sai/commands/design/steps/tasks.md` maps a step's `**Files Affected**` entries to `layer` and `discipline` tokens
- **THEN** it matches the paths after stripping the leading change-type token
- **AND** an `R` entry contributes only its destination path to the match, so a single-file move does not flip the step's layer or discipline tokens

#### Scenario: design instruction derives tokens from file existence
- **WHEN** `sai-2-design` emits a step's `**Files Affected**` entries
- **THEN** it derives each token from whether the path exists at the repository state immediately before that step's commit
- **AND** a path that already exists is never emitted as `A` solely because the step's title or prose uses the word "add"

#### Scenario: task-routing-uses-destination-path
- **WHEN** routing derives metadata from an `R` Files Affected entry
- **THEN** it strips the token and matches only the destination path.

