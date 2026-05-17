## Requirements

### Requirement: sai-workflow schema defines the full artifact graph
A custom OpenSpec schema at `openspec/schemas/sai-workflow/schema.yaml` SHALL declare all artifacts of the shared-AI pipeline with their IDs, output paths, dependency edges, and apply requirements.

#### Scenario: schema declares all nine artifacts
- **WHEN** `openspec/schemas/sai-workflow/schema.yaml` is read
- **THEN** it declares artifacts with IDs: proposal, specs, design, tasks, implementation, review, security, performance, accessibility — each with an `outputPath` and optional `requires` list

#### Scenario: schema apply requirements are tasks and implementation
- **WHEN** `openspec status` is run on a change using the sai-workflow schema
- **THEN** `applyRequires` contains `["tasks", "implementation"]`

#### Scenario: dependency chain is enforced
- **WHEN** `openspec status` is run on a change with only proposal done
- **THEN** specs and design show status `ready`, and tasks shows `blocked` with `missingDeps: ["design", "specs"]`

### Requirement: sai-workflow schema provides custom templates for all artifact types
The schema directory SHALL include a `templates/` subdirectory with a `.md` template file for each of the nine artifact types.

#### Scenario: templates directory contains all artifact templates
- **WHEN** `openspec/schemas/sai-workflow/templates/` is listed
- **THEN** files proposal.md, specs.md, design.md, tasks.md, implementation.md, review.md, security.md, performance.md, accessibility.md are present

#### Scenario: design template includes ADR/DDR sections
- **WHEN** `openspec/schemas/sai-workflow/templates/design.md` is read
- **THEN** it contains sections for ADR/DDR decisions with the three evaluation criteria (hard to reverse, surprising without context, real trade-off), alternatives considered, and an endpoint map section

#### Scenario: implementation template includes RED/GREEN blocks
- **WHEN** `openspec/schemas/sai-workflow/templates/implementation.md` is read
- **THEN** it contains a RED block (failing test) section before the GREEN block (minimal implementation) section

### Requirement: audit artifact templates always include a Not-Applicable section
The templates for security.md, performance.md, and accessibility.md SHALL each include a mandatory "Not Applicable" section with a justification field.

#### Scenario: security template has Not Applicable section
- **WHEN** `openspec/schemas/sai-workflow/templates/security.md` is read
- **THEN** it contains a "Not Applicable" section with a required justification placeholder

#### Scenario: performance template has Not Applicable section
- **WHEN** `openspec/schemas/sai-workflow/templates/performance.md` is read
- **THEN** it contains a "Not Applicable" section with a required justification placeholder

#### Scenario: accessibility template has Not Applicable section
- **WHEN** `openspec/schemas/sai-workflow/templates/accessibility.md` is read
- **THEN** it contains a "Not Applicable" section with a required justification placeholder

### Requirement: openspec/config.yaml uses sai-workflow as active schema
The project's `openspec/config.yaml` SHALL declare `schema: sai-workflow` so that all new changes use the custom schema.

#### Scenario: config.yaml references sai-workflow
- **WHEN** `openspec/config.yaml` is read
- **THEN** the `schema` field is `sai-workflow`

#### Scenario: new change picks up sai-workflow schema
- **WHEN** `openspec new change <name>` is run after the config update
- **THEN** the created change reports `schemaName: sai-workflow` in its status JSON
