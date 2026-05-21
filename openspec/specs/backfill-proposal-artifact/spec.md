## ADDED Requirements

### Requirement: proposal.md generated inside openspec/changes/{name}/
The command SHALL create `openspec/changes/{name}/proposal.md` using the standard sai-workflow proposal template, where `{name}` is the change name provided by the user or derived from their description of the backfilled feature.

#### Scenario: Proposal written to correct location
- **WHEN** the user runs `/sai-backfill` for a feature named "add-user-auth"
- **THEN** `openspec/changes/add-user-auth/proposal.md` is created

### Requirement: Proposal carries a mandatory, prominent post-hoc marker
The `proposal.md` file SHALL carry a retroactive marker that is impossible to miss. The marker MUST appear at the very top of the file, before any section content, and MUST be visually distinct (not a subtle footnote or inline comment). The exact format is defined in the design phase, but the requirement is that any future reader immediately understands this proposal describes a decision already made, not one being proposed.

#### Scenario: Post-hoc marker visible at file top
- **WHEN** a future reader opens the proposal.md
- **THEN** the first thing they see is an unmistakable retroactive marker before any section heading

#### Scenario: Marker does not appear mid-document or as a footnote
- **WHEN** the proposal.md is written
- **THEN** there is no inline or footnote-style marker that a reader could miss while scanning the document

### Requirement: Proposal content reflects actual behavior, not intent
The proposal.md SHALL be written from the diff and interview answers. It MUST describe what was implemented, not what was originally intended or what might have been ideal.

#### Scenario: Proposal based on diff not ideal design
- **WHEN** the diff and the user's answers suggest the implementation took a shortcut
- **THEN** the proposal describes the shortcut, not the ideal approach

### Requirement: design.md, tasks.md, and implementation.md are out of scope
The command SHALL NOT generate `design.md`, `tasks.md`, or `implementation.md`. These artifacts are either unreliable when reconstructed post-hoc (design) or redundant since the implementation is already done (tasks, implementation).

#### Scenario: No design.md created
- **WHEN** `/sai-backfill` completes successfully
- **THEN** no `design.md` exists in `openspec/changes/{name}/`
