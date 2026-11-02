# schema-instruction-pointers Specification

## Purpose
Keep every instruction file cited by the sai-workflow schema and its templates resolvable, so that a retired or mistyped pointer fails the test suite instead of passing silently.

## Requirements

### Requirement: sai-workflow schema and templates cite only existing instruction files
Every `sai/...` Markdown file cited by `openspec/schemas/sai-workflow/schema.yaml` or by a `.md` template under `openspec/schemas/sai-workflow/templates/`, with or without a leading `@`, SHALL exist at that path relative to the repository root. The test suite SHALL resolve each cited file on disk, rather than only matching the pointer string, and SHALL fail naming the citing source when a cited file does not exist.

#### Scenario: a cited instruction file is missing
- **WHEN** `schema.yaml` or a sai-workflow template cites an instruction file that does not exist, such as the retired `sai/commands/design/instructions.md`
- **THEN** the pointer test fails and reports the missing path for that source

#### Scenario: every cited instruction file exists
- **WHEN** the pointer test runs against the current schema and templates
- **THEN** it finds no missing cited file and passes

### Requirement: design artifact schema instructions cite their design step files
The `design`, `tasks`, and `interfaces` instructions in `openspec/schemas/sai-workflow/schema.yaml` SHALL cite `sai/commands/design/steps/design.md`, `sai/commands/design/steps/tasks.md`, and `sai/commands/design/steps/interfaces.md`, respectively, and the pointer test SHALL fail when the schema stops citing any of them.

#### Scenario: schema cites the three design step files
- **WHEN** the cited instruction files in `schema.yaml` are extracted
- **THEN** they include `sai/commands/design/steps/design.md`, `sai/commands/design/steps/tasks.md`, and `sai/commands/design/steps/interfaces.md`
