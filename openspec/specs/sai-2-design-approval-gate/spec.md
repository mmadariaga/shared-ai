## MODIFIED Requirements

### Requirement: sai-2-design approval gate placement
sai-2-design SHALL ask for specs approval at the start of the command, before any generation work. It MUST write the approval fields to `.openspec.yaml` before generating `design.md` or `tasks.md`.

The approval block SHALL be placed after the prereqs/existence check and before `## Load behaviors`.

#### Scenario: user approves with notes
- **WHEN** the user runs `/sai-2-design {name}` and answers "yes" with optional notes
- **THEN** sai-2-design writes `approval.specs.approved_at` (current UTC ISO 8601) and `approval.specs.notes` to `openspec/changes/{name}/.openspec.yaml`, then proceeds to generate `design.md` and `tasks.md`

#### Scenario: user declines
- **WHEN** the user runs `/sai-2-design {name}` and answers "no"
- **THEN** sai-2-design stops without generating any files

#### Scenario: approval fields written
- **WHEN** approval is confirmed
- **THEN** `.openspec.yaml` contains `approval.specs.approved_at` in ISO 8601 format and `approval.specs.notes` as a string (empty string if no notes provided)
