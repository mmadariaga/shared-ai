# tasks-scaffold-format Specification

## Purpose
TBD - created by archiving change tasks-as-scaffold. Update Purpose after archive.
## Requirements
### Requirement: tasks-artifact-format

`tasks.md` SHALL be a narrative planning document with no checkbox markers (`- [ ]`).

The file SHALL contain one numbered section per implementation step, structured as:

    ## Step N: <title>

    **Routing**: layer=<layer> · discipline=<discipline> · complexity=<complexity>

    **Files Affected**: <comma-separated list of paths>

    **What Will Be Done**: <prose description of the work in this step>

    **Testing Strategy**: <how correctness will be verified for this step>

The `**Routing**` line SHALL be the first sub-field under the step title, immediately preceding `**Files Affected**`. The line uses key=value tagged pairs (not positional tokens); the three keys `layer`, `discipline`, `complexity` are mandatory and in that order. The three values are drawn from the enumerations defined in the `tasks-routing-metadata` capability spec, and the derivation rubric is encoded in the design instructions. No `routing.md`, routing table, or routing JSON sidecar is emitted; the formatted line is the only routing artifact. An optional trailing parenthetical `(... )` is allowed for human audit and MUST be ignored by any parser of the line.

The file SHALL NOT contain any `- [ ]` or `- [x]` markers.

After all implementation steps, the file SHALL contain the following two mandatory sections in order:

1. `## Required Documentation` — populated by `/sai-2-design` from docs visited during codebase research (see `tasks-required-documentation` capability)
2. `## Implementation Context` — populated by `/sai-2-design` from codebase research findings (see `tasks-implementation-context` capability)

Both sections are mandatory for all new changes. Archived `tasks.md` files that predate this change are not required to be retroactively updated. Archived `tasks.md` files that predate the `**Routing**` line are exempt from carrying it; only new `tasks.md` files emitted after the `tasks-routing-metadata` change lands carry the line.

#### Scenario: tasks.md generated without checkboxes

- **WHEN** `sai-2-design` generates `tasks.md` for a change
- **THEN** the file contains only numbered `## Step N:` sections with Routing, Files Affected, What Will Be Done, and Testing Strategy sub-fields; no `- [ ]` markers are present anywhere in the file

#### Scenario: tasks.md used as narrative context

- **WHEN** `sai-3-implement` reads `tasks.md` to produce `implementation.md`
- **THEN** it uses tasks.md as a high-level scaffold to organize the granular steps in `implementation.md`, not as a progress tracker

#### Scenario: tasks.md contains both mandatory trailing sections

- **WHEN** `sai-2-design` generates `tasks.md`
- **THEN** the file ends with `## Required Documentation` followed by `## Implementation Context`, both containing real content derived from design-phase research

### Requirement: schema-tasks-instruction-updated

The `tasks` artifact entry in `openspec/schemas/sai-workflow/schema.yaml` SHALL have its `instruction` field updated to describe the narrative scaffold format including the two mandatory trailing sections AND the new `**Routing**` keyword line. The instruction SHALL NOT contain the sentence "IMPORTANT: The apply phase parses checkbox format." The instruction SHALL describe the Routing line as the first sub-field of every `## Step N` section, SHALL specify the key=value tagged format (`layer=<layer> · discipline=<discipline> · complexity=<complexity>`), and SHALL reference the `tasks-routing-metadata` capability spec for the token enumerations and derivation rules.

The template at `openspec/schemas/sai-workflow/templates/tasks.md` SHALL show the `**Routing**` line in its `## Step N` skeleton, immediately after the step title and before `**Files Affected**`, using the key=value format.

#### Scenario: schema instruction matches narrative format with trailing sections and Routing line

- **WHEN** `openspec instructions tasks --change <name>` is run
- **THEN** the returned `instruction` field describes the `## Step N:` scaffold format
- **THEN** the instruction describes the `**Routing**` line as the first sub-field, in the same position as Files Affected / What Will Be Done / Testing Strategy
- **THEN** the instruction specifies the key=value format with the three keys `layer`, `discipline`, `complexity` in that order
- **THEN** the instruction references `## Required Documentation` and `## Implementation Context` as mandatory trailing sections
- **THEN** the instruction contains no reference to checkboxes or the apply phase parsing `- [ ]` markers

#### Scenario: tasks template shows the Routing line in key=value form

- **WHEN** `openspec/schemas/sai-workflow/templates/tasks.md` is read
- **THEN** the `## Step N` template skeleton includes a `**Routing**` line as the first sub-field
- **THEN** the template's `## Step N` block lists Routing, Files Affected, What Will Be Done, and Testing Strategy in that order
- **THEN** the `**Routing**` line in the template uses the key=value format with the three keys `layer`, `discipline`, `complexity` in that order

### Requirement: Each step SHALL include a Routing line

Every `## Step N:` section in a new `tasks.md` SHALL include a line of the form `**Routing**: layer=<layer> · discipline=<discipline> · complexity=<complexity>` immediately after the step title and before `**Files Affected**`. The three key=value pairs are drawn from the enumerations in the `tasks-routing-metadata` capability spec. The line is mandatory for all `tasks.md` files emitted by `/sai-2-design` after this change lands; archived `tasks.md` files are exempt.

#### Scenario: New step carries a Routing line in key=value form

- **WHEN** `sai-2-design` generates a `tasks.md` step after this change lands
- **THEN** the section contains a `**Routing**` line as the first sub-field
- **THEN** the line has three key=value pairs separated by middle-dot characters (U+00B7)
- **THEN** the three keys are exactly `layer`, `discipline`, `complexity` in that order
- **THEN** each value belongs to its respective enumeration in `tasks-routing-metadata`

#### Scenario: Archived tasks.md files are exempt

- **WHEN** a reader inspects a `tasks.md` archived before this change
- **THEN** the absence of a `**Routing**` line is not a violation
- **THEN** only `tasks.md` files emitted by `/sai-2-design` after this change are checked for the line

#### Scenario: Routing line position is invariant

- **WHEN** a reader scans a step section top-to-bottom
- **THEN** the order of sub-fields is: Routing, Files Affected, What Will Be Done, Testing Strategy
- **THEN** no other ordering of these four sub-fields is acceptable

