## Requirements

### Requirement: sai-1-spec stops after specs and prints a hand-off message
After generating `proposal.md` and all `specs/**/*.md` files, `sai-1-spec` SHALL stop execution and print a message directing the user to run `/sai-2-design <change-name>` when ready.

#### Scenario: sai-1-spec does not continue to design or tasks
- **WHEN** `/sai-1-spec <change-name>` is invoked
- **THEN** the command creates proposal.md and specs/ files but does NOT create design.md or tasks.md

#### Scenario: sai-1-spec prints hand-off message
- **WHEN** `/sai-1-spec <change-name>` completes
- **THEN** the final output includes a message of the form: "Specs ready in openspec/changes/{name}/. Review them and run /sai-2-design {name} when ready."

### Requirement: specs approval is recorded in .openspec.yaml
After the user confirms they have reviewed the specs, the approval SHALL be recorded in the change's `.openspec.yaml` under `approval.specs` with fields `approved_at` (ISO 8601 timestamp) and `notes` (optional string).

#### Scenario: .openspec.yaml updated with approval after confirmation
- **WHEN** the user confirms spec approval (either via explicit command or flag)
- **THEN** `openspec/changes/<change-name>/.openspec.yaml` contains an `approval.specs.approved_at` field with a valid ISO 8601 timestamp

#### Scenario: approval notes captured when provided
- **WHEN** the user provides notes during spec approval
- **THEN** `openspec/changes/<change-name>/.openspec.yaml` contains `approval.specs.notes` with the user's text

### Requirement: sai-2-design verifies specs approval before proceeding
Before generating `design.md` or `tasks.md`, `sai-2-design` SHALL read `.openspec.yaml` and verify that `approval.specs.approved_at` is present.

#### Scenario: sai-2-design proceeds when approval is present
- **WHEN** `/sai-2-design <change-name>` is run and `.openspec.yaml` contains `approval.specs.approved_at`
- **THEN** the command proceeds to generate design.md and tasks.md

#### Scenario: sai-2-design halts when approval is missing
- **WHEN** `/sai-2-design <change-name>` is run and `.openspec.yaml` does not contain `approval.specs.approved_at`
- **THEN** the command halts and prints: "Specs not yet approved for '<change-name>'. Review openspec/changes/<change-name>/specs/ and confirm approval before running /sai-2-design."
