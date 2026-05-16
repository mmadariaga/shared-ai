## ADDED Requirements

### Requirement: All ai-* artifacts write to openspec change directory
Every artifact produced by ai-* commands (`implementation.md`, `review.md`, `security.md`, `performance.md`, `accessibility.md`) SHALL be written to `openspec/changes/{name}/`. The `plans/` directory SHALL NOT be used.

#### Scenario: ai-2-implement writes to change directory
- **WHEN** ai-2-implement completes for change `foo`
- **THEN** `implementation.md` exists at `openspec/changes/foo/implementation.md`
- **THEN** no file is created under `plans/`

#### Scenario: ai-4-review writes to change directory
- **WHEN** ai-4-review completes for change `foo`
- **THEN** `review.md` exists at `openspec/changes/foo/review.md`

#### Scenario: ai-pr reads from change directory
- **WHEN** ai-pr is invoked for change `foo`
- **THEN** it reads `openspec/changes/foo/proposal.md`, `implementation.md`, `review.md` as input artifacts

### Requirement: ai-4..7 and ai-pr accept change name as primary argument
Commands that previously accepted a path to `plans/{name}/spec.md` SHALL accept a change name (kebab-case) and resolve paths to `openspec/changes/{name}/` automatically.

#### Scenario: ai-4-review accepts change name
- **WHEN** user invokes `ai-4-review foo-feature`
- **THEN** command resolves all artifact paths under `openspec/changes/foo-feature/`

#### Scenario: argument-hint updated
- **WHEN** user inspects the command description
- **THEN** argument-hint shows `[change-name]` not `[path to spec.md]`

### Requirement: plans/ directory eliminated from pipeline
The `plans/` directory and references to it SHALL be removed from all documentation, command descriptions, and argument hints.

#### Scenario: AGENTS.md shows no plans/ references
- **WHEN** AGENTS.md artifact table is read
- **THEN** all artifact paths reference `openspec/changes/{name}/` — no `plans/` paths appear
