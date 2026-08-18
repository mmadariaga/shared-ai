## Requirements

### Requirement: sai-2-design approval gate placement
`sai-2-design` SHALL stamp the specs approval at the start of the command, before any generation work. It MUST write the approval fields to `.openspec.yaml` before generating `design.md` or `tasks.md`.

The approval block SHALL be placed after the prereqs/existence check and before `## Load behaviors`.

#### Scenario: approval is stamped before generation
- **WHEN** the user runs `/sai-2-design {name}` on a change with `proposal.md` and at least one `specs/**/*.md`
- **THEN** sai-2-design writes `approval.specs.approved_at` (current UTC ISO 8601, only when absent or empty) and `approval.specs.notes` (empty string) to `openspec/changes/{name}/.openspec.yaml`, then proceeds to generate `design.md` and `tasks.md`

#### Scenario: no interactive gate at the start of sai-2-design
- **WHEN** the user runs `/sai-2-design {name}`
- **THEN** no approval question is presented and there is no answer that stops the command before generation

#### Scenario: approval fields written
- **WHEN** the approval is stamped
- **THEN** `.openspec.yaml` contains `approval.specs.approved_at` in ISO 8601 format and `approval.specs.notes` as a string (always the empty string)

### Requirement: the amendment gate stays interactive
The spec-divergence amendment gate reached during design SHALL remain an interactive closed choice and SHALL keep writing `approval.specs.amendment.{at, notes}`, merging over the stamped `approval.specs.approved_at` and `approval.specs.notes` without truncating them.

#### Scenario: amendment merges over the stamp
- **WHEN** the user selects the in-place amendment during design
- **THEN** `.openspec.yaml` gains `approval.specs.amendment.at` and `approval.specs.amendment.notes` while `approval.specs.approved_at` and `approval.specs.notes` are preserved verbatim
