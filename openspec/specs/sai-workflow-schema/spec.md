## Purpose

Define the shared-AI OpenSpec schema, artifact graph, and authoring-template contracts.
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
The schema directory SHALL include a `templates/` subdirectory with a `.md` template file for each of the eleven artifact types. The `design.md`, `tasks.md`, and `interfaces.md` templates SHALL be structural projections of the command-owned instructions: they SHALL retain the live headings and ordering needed to scaffold each artifact, carry concise non-normative comments that identify retained fields where useful, carry a non-normative pointer to the corresponding section of `sai/commands/design/instructions.md`, and SHALL not duplicate normative generation rules or carry endpoint tables. The command-owned instruction remains authoritative for the ADR/DDR criteria, alternatives behavior, task fields, and interface assertions; the Target State contract remains owned by the design-target-state capability.

#### Scenario: templates directory contains all artifact templates
- **WHEN** `openspec/schemas/sai-workflow/templates/` is listed
- **THEN** files `proposal.md`, `specs.md`, `design.md`, `tasks.md`, `interfaces.md`, `change-overview.md`, `implementation.md`, `review.md`, `security.md`, `performance.md`, and `accessibility.md` are present

#### Scenario: design template is a heading-preserving live skeleton
- **WHEN** `openspec/schemas/sai-workflow/templates/design.md` is read
- **THEN** it retains the live design headings, including Target State, Architecture Snapshot, File Manifest, Context, Goals / Non-Goals, Decisions, Risks / Trade-offs, Migration Plan, Open Questions, Deferred, and Manual Verification, in their existing order
- **AND** the template does not carry duplicated authoring prose for the ADR/DDR criteria or alternatives behavior
- **AND** the template does not contain an Endpoint Map heading
- **AND** it carries one write-time-authority pointer naming `sai/commands/design/instructions.md` and `### Generate design.md`
- **AND** outside the retained structural headings, markers, concise non-normative comments, and pointer, it contains no normative prose or table

#### Scenario: implementation template includes RED/GREEN blocks
- **WHEN** `openspec/schemas/sai-workflow/templates/implementation.md` is read
- **THEN** it contains a RED block (failing test) section before the GREEN block (minimal implementation) section

#### Scenario: tasks template is a structural projection
- **WHEN** `openspec/schemas/sai-workflow/templates/tasks.md` is read
- **THEN** it retains the Step N scaffold, its five ordered step fields, Required Documentation, and Implementation Context headings
- **AND** it carries a write-time-authority pointer naming `sai/commands/design/instructions.md` and `### Generate tasks.md`
- **AND** outside the retained structural headings, markers, concise non-normative comments, and pointer, it contains no normative prose, table, or task-generation rule

#### Scenario: interfaces template is a structural projection
- **WHEN** `openspec/schemas/sai-workflow/templates/interfaces.md` is read
- **THEN** it retains the Step N, Interfaces, and Test assertions headings as structural markers
- **AND** it carries a write-time-authority pointer naming `sai/commands/design/instructions.md` and `### Generate interfaces.md`
- **AND** outside the retained structural headings, markers, concise non-normative comments, and pointer, it contains no normative prose, table, or interface-generation rule
- **AND** it does not retain the semantic `None — no step contracts` literal; the named test files assert that sentinel against the command instruction instead

#### Scenario: design template retains the decision shape without becoming an authority
- **WHEN** the decision portion of `openspec/schemas/sai-workflow/templates/design.md` is read
- **THEN** the decision marker and alternatives block shape remain available for the generated artifact's structure
- **AND** the three ADR/DDR evaluation criteria, record-family routing, and alternatives-selection rules are sourced from `sai/commands/design/instructions.md` rather than from duplicated template prose

### Requirement: audit report templates always include a Not-Applicable section
Both template families for the security, performance, and accessibility report artifacts — the schema templates under `openspec/schemas/sai-workflow/templates/` and the write-time contracts under `sai/commands/{security,performance,accessibility}/*-report.template.md` — SHALL each include a mandatory "Not Applicable" section with a justification field.

#### Scenario: security schema template has Not Applicable section
- **WHEN** `openspec/schemas/sai-workflow/templates/security.md` is read
- **THEN** it contains a "Not Applicable" section with a required justification placeholder

#### Scenario: performance schema template has Not Applicable section
- **WHEN** `openspec/schemas/sai-workflow/templates/performance.md` is read
- **THEN** it contains a "Not Applicable" section with a required justification placeholder

#### Scenario: accessibility schema template has Not Applicable section
- **WHEN** `openspec/schemas/sai-workflow/templates/accessibility.md` is read
- **THEN** it contains a "Not Applicable" section with a required justification placeholder

#### Scenario: security write-time contract has Not Applicable section
- **WHEN** `sai/commands/security/security-report.template.md` is read
- **THEN** it contains a "Not Applicable" section with a required justification field

#### Scenario: performance write-time contract has Not Applicable section
- **WHEN** `sai/commands/performance/performance-report.template.md` is read
- **THEN** it contains a "Not Applicable" section with a required justification field

#### Scenario: accessibility write-time contract has Not Applicable section
- **WHEN** `sai/commands/accessibility/accessibility-report.template.md` is read
- **THEN** it contains a "Not Applicable" section with a required justification field

### Requirement: openspec/config.yaml uses sai-workflow as active schema
The project's `openspec/config.yaml` SHALL declare `schema: sai-workflow` so that all new changes use the custom schema.

#### Scenario: config.yaml references sai-workflow
- **WHEN** `openspec/config.yaml` is read
- **THEN** the `schema` field is `sai-workflow`

#### Scenario: new change picks up sai-workflow schema
- **WHEN** `openspec new change <name>` is run after the config update
- **THEN** the created change reports `schemaName: sai-workflow` in its status JSON

### Requirement: sai-workflow proposal template includes Additional Notes section
The proposal template SHALL include an `## Additional Notes` section for non-normative information useful to designers and implementers.

#### Scenario: Proposal template contains Additional Notes section
- **WHEN** a spec author opens `openspec/schemas/sai-workflow/templates/proposal.md`
- **THEN** an `## Additional Notes` section is present at the end of the file with a comment placeholder describing its intended use

### Requirement: sai-workflow schema artifact description lists Additional Notes
The schema artifact description for the proposal SHALL document `Additional Notes` as a valid proposal section.

#### Scenario: Schema documents the Additional Notes section
- **WHEN** the `artifacts.proposal` description in `openspec/schemas/sai-workflow/schema.yaml` is read
- **THEN** a `**Additional Notes**` bullet is present in the list of expected proposal sections

### Requirement: sai-workflow schema names the record-family routing in the design artifact

The design artifact's description and instruction in `openspec/schemas/sai-workflow/schema.yaml` SHALL name the record-family routing instead of leaving the ADR-vs-DDR choice open. The design artifact description SHALL state that ADR/DDR evaluation resolves the family via the ordered routing test (replacing the bare "ADR/DDR evaluation" wording), and the design artifact instruction SHALL direct that a decision meeting all three ADR/DDR criteria resolves its record family via the ordered routing test and records it in `design.md` as the `**Record family**` marker, consistent with `sai/commands/design/instructions.md`.

#### Scenario: Schema description names the family routing

- **WHEN** the design artifact description in `openspec/schemas/sai-workflow/schema.yaml` is read
- **THEN** it names the family resolution (e.g. "ADR/DDR evaluation with the family resolved by the ordered routing test") rather than a bare "ADR/DDR evaluation"

#### Scenario: Schema design instruction directs family resolution

- **WHEN** the design artifact instruction in `openspec/schemas/sai-workflow/schema.yaml` is read
- **THEN** it directs qualifying decisions to resolve and record the family via the ordered routing test
- **THEN** the instruction stays consistent with `sai/commands/design/instructions.md`'s Decisions evaluation

### Requirement: sai-workflow design artifact instructions point to the live authoring contract
The `design`, `tasks`, and `interfaces` artifact entries in `openspec/schemas/sai-workflow/schema.yaml` SHALL retain non-empty `instruction:` blocks that point to the corresponding authoring sections of `sai/commands/design/instructions.md` — `### Generate design.md`, `### Generate tasks.md`, and `### Generate interfaces.md`, respectively. These blocks SHALL identify the live authority rather than restating its generation contract.

#### Scenario: design instruction block is an authority pointer
- **WHEN** the `design` artifact entry in `openspec/schemas/sai-workflow/schema.yaml` is read
- **THEN** its non-empty `instruction:` block names `sai/commands/design/instructions.md` and `### Generate design.md`
- **AND** it does not duplicate the command-owned design-generation rules

#### Scenario: tasks instruction block is an authority pointer
- **WHEN** the `tasks` artifact entry in `openspec/schemas/sai-workflow/schema.yaml` is read
- **THEN** its non-empty `instruction:` block names `sai/commands/design/instructions.md` and `### Generate tasks.md`
- **AND** it does not duplicate the command-owned task-generation rules

#### Scenario: interfaces instruction block is an authority pointer
- **WHEN** the `interfaces` artifact entry in `openspec/schemas/sai-workflow/schema.yaml` is read
- **THEN** its non-empty `instruction:` block names `sai/commands/design/instructions.md` and `### Generate interfaces.md`
- **AND** it does not duplicate the command-owned interface-generation rules

### Requirement: design contract checks follow the live authoring authority
`test/change-overview-contract.test.js` and `test/design-coordinator-worker.test.js` SHALL assert the no-step-contracts sentinel, the Target State section, and the Architecture Snapshot and File Manifest headings against the existing live authoring source in `sai/commands/design/instructions.md`. This test-placement requirement does not redefine the normative ownership of the Target State contract. Schema and template checks SHALL be limited to the retained pointer and structural-skeleton contract rather than copying those semantic assertions.

#### Scenario: semantic assertions target the command instruction
- **WHEN** the design contract tests for the no-step sentinel, Target State, snapshot, and file manifest are run
- **THEN** each assertion reads the corresponding live rule from `sai/commands/design/instructions.md`
- **AND** no assertion requires the reduced schema or template bodies to carry the detailed rule text

### Requirement: the design description does not advertise an Endpoint Map artifact section
The `design` artifact description in `openspec/schemas/sai-workflow/schema.yaml` SHALL describe the live design contract without promising an Endpoint Map.

#### Scenario: stale Endpoint Map promise is absent
- **WHEN** the `design` artifact description in `openspec/schemas/sai-workflow/schema.yaml` is read
- **THEN** it does not claim that `design.md` contains an endpoint map
- **AND** `generates`, `requires`, `apply.requires`, and `apply.tracks` remain unchanged
- **AND** the design description is deliberately corrected

