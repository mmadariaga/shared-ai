# tasks-scaffold-format Specification

## Purpose
TBD - created by archiving change tasks-as-scaffold. Update Purpose after archive.
## Requirements
### Requirement: tasks-artifact-format

`tasks.md` SHALL be a narrative planning document with no checkbox markers (`- [ ]`).

The file SHALL contain one numbered section per implementation step, structured as:

    ## Step N: <title>

    **Files Affected**: <comma-separated list of paths>

    **What Will Be Done**: <prose description of the work in this step>

    **Testing Strategy**: <how correctness will be verified for this step>

The file SHALL NOT contain any `- [ ]` or `- [x]` markers.

After all implementation steps, the file SHALL contain the following two mandatory sections in order:

1. `## Required Documentation` — populated by `/sai-2-design` from docs visited during codebase research (see `tasks-required-documentation` capability)
2. `## Implementation Context` — populated by `/sai-2-design` from codebase research findings (see `tasks-implementation-context` capability)

Both sections are mandatory for all new changes. Archived `tasks.md` files that predate this change are not required to be retroactively updated.

#### Scenario: tasks.md generated without checkboxes

- **WHEN** `sai-2-design` generates `tasks.md` for a change
- **THEN** the file contains only numbered `## Step N:` sections with Files Affected, What Will Be Done, and Testing Strategy sub-fields; no `- [ ]` markers are present anywhere in the file

#### Scenario: tasks.md used as narrative context

- **WHEN** `sai-3-implement` reads `tasks.md` to produce `implementation.md`
- **THEN** it uses tasks.md as a high-level scaffold to organize the granular steps in `implementation.md`, not as a progress tracker

#### Scenario: tasks.md contains both mandatory trailing sections

- **WHEN** `sai-2-design` generates `tasks.md`
- **THEN** the file ends with `## Required Documentation` followed by `## Implementation Context`, both containing real content derived from design-phase research

### Requirement: schema-tasks-instruction-updated

The `tasks` artifact entry in `openspec/schemas/sai-workflow/schema.yaml` SHALL have its `instruction` field updated to describe the narrative scaffold format including the two mandatory trailing sections, and SHALL NOT contain the sentence "IMPORTANT: The apply phase parses checkbox format."

#### Scenario: schema instruction matches narrative format with trailing sections

- **WHEN** `openspec instructions tasks --change <name>` is run
- **THEN** the returned `instruction` field describes the `## Step N:` scaffold format, references `## Required Documentation` and `## Implementation Context` as mandatory trailing sections, and contains no reference to checkboxes or the apply phase parsing `- [ ]` markers

