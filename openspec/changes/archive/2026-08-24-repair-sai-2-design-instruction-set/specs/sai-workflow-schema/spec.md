## MODIFIED Requirements

### Requirement: sai-workflow schema provides custom templates for all artifact types
The schema directory SHALL include a `templates/` subdirectory with a `.md` template file for each of the eleven artifact types. The `design.md`, `tasks.md`, and `interfaces.md` templates SHALL be structural projections of the routed worker and step-owned instructions: they SHALL retain the live headings and ordering needed to scaffold each artifact, carry concise non-normative comments that identify retained fields where useful, carry a non-normative pointer to the corresponding active step-owned authoring section, and SHALL not duplicate normative generation rules or carry endpoint tables. The routed worker and step-local instructions remain authoritative for the ADR/DDR criteria, alternatives behavior, task fields, and interface assertions; the Target State contract remains owned by the design-target-state capability.

#### Scenario: templates directory contains all artifact templates
- **WHEN** `openspec/schemas/sai-workflow/templates/` is listed
- **THEN** files `proposal.md`, `specs.md`, `design.md`, `tasks.md`, `interfaces.md`, `change-overview.md`, `implementation.md`, `review.md`, `security.md`, `performance.md`, and `accessibility.md` are present

#### Scenario: design template is a heading-preserving live skeleton
- **WHEN** `openspec/schemas/sai-workflow/templates/design.md` is read
- **THEN** it retains the live design headings, including Target State, Architecture Snapshot, File Manifest, Context, Goals / Non-Goals, Decisions, Risks / Trade-offs, Migration Plan, Open Questions, Deferred, and Manual Verification, in their existing order
- **AND** the template does not carry duplicated authoring prose for the ADR/DDR criteria or alternatives behavior
- **AND** the template does not contain an Endpoint Map heading
- **AND** it carries one write-time-authority pointer naming `sai/commands/design/steps/design.md` and `## Generate design.md`
- **AND** outside the retained structural headings, markers, concise non-normative comments, and pointer, it contains no normative prose or table

#### Scenario: implementation template includes RED/GREEN blocks
- **WHEN** `openspec/schemas/sai-workflow/templates/implementation.md` is read
- **THEN** it contains a RED block (failing test) section before the GREEN block (minimal implementation) section

#### Scenario: tasks template is a structural projection
- **WHEN** `openspec/schemas/sai-workflow/templates/tasks.md` is read
- **THEN** it retains the Step N scaffold, its five ordered step fields, Required Documentation, and Implementation Context headings
- **AND** it carries a write-time-authority pointer naming `sai/commands/design/steps/tasks.md` and `## Generate tasks.md`
- **AND** outside the retained structural headings, markers, concise non-normative comments, and pointer, it contains no normative prose, table, or task-generation rule

#### Scenario: interfaces template is a structural projection
- **WHEN** `openspec/schemas/sai-workflow/templates/interfaces.md` is read
- **THEN** it retains the Step N, Interfaces, and Test assertions headings as structural markers
- **AND** it carries a write-time-authority pointer naming `sai/commands/design/steps/interfaces.md` and `## Generate interfaces.md`
- **AND** outside the retained structural headings, markers, concise non-normative comments, and pointer, it contains no normative prose, table, or interface-generation rule
- **AND** it does not retain the semantic `None — no step contracts` literal; the named test files assert that sentinel against the command instruction instead

#### Scenario: design template retains the decision shape without becoming an authority
- **WHEN** the decision portion of `openspec/schemas/sai-workflow/templates/design.md` is read
- **THEN** the decision marker and alternatives block shape remain available for the generated artifact's structure
- **AND** the three ADR/DDR evaluation criteria, record-family routing, and alternatives-selection rules are sourced from the active routed design step rather than from duplicated template prose

#### Scenario: templates-use-active-step-authority
- **WHEN** a schema or template authoring pointer is inspected
- **THEN** it names the active routed worker or step-local authoring surface rather than the deleted monolithic instruction.

### Requirement: sai-workflow design artifact instructions point to the live authoring contract
The `design`, `tasks`, and `interfaces` artifact entries in `openspec/schemas/sai-workflow/schema.yaml` SHALL retain non-empty `instruction:` blocks that point to the corresponding active step-owned authoring sections — `sai/commands/design/steps/design.md` `## Generate design.md`, `sai/commands/design/steps/tasks.md` `## Generate tasks.md`, and `sai/commands/design/steps/interfaces.md` `## Generate interfaces.md`, respectively. These blocks SHALL identify the live authority rather than restating its generation contract.

#### Scenario: design instruction block is an authority pointer
- **WHEN** the `design` artifact entry in `openspec/schemas/sai-workflow/schema.yaml` is read
- **THEN** its non-empty `instruction:` block names `sai/commands/design/steps/design.md` and `## Generate design.md`
- **AND** it does not duplicate the command-owned design-generation rules

#### Scenario: tasks instruction block is an authority pointer
- **WHEN** the `tasks` artifact entry in `openspec/schemas/sai-workflow/schema.yaml` is read
- **THEN** its non-empty `instruction:` block names `sai/commands/design/steps/tasks.md` and `## Generate tasks.md`
- **AND** it does not duplicate the command-owned task-generation rules

#### Scenario: interfaces instruction block is an authority pointer
- **WHEN** the `interfaces` artifact entry in `openspec/schemas/sai-workflow/schema.yaml` is read
- **THEN** its non-empty `instruction:` block names `sai/commands/design/steps/interfaces.md` and `## Generate interfaces.md`
- **AND** it does not duplicate the command-owned interface-generation rules

#### Scenario: schema-pointers-follow-step-authority
- **WHEN** the design-related artifact entries are read
- **THEN** each non-empty instruction pointer names the corresponding active step-owned authority.

### Requirement: design contract checks follow the live authoring authority
`test/change-overview-contract.test.js` and `test/design-coordinator-worker.test.js` SHALL assert the no-step-contracts sentinel, the Target State section, and the Architecture Snapshot and File Manifest headings against the existing live routed worker and step-owned authoring sources, including `sai/commands/design/worker.md` and the relevant files under `sai/commands/design/steps/`. This test-placement requirement does not redefine the normative ownership of the Target State contract. Schema and template checks SHALL be limited to the retained pointer and structural-skeleton contract rather than copying those semantic assertions.

#### Scenario: semantic assertions target the command instruction
- **WHEN** the design contract tests for the no-step sentinel, Target State, snapshot, and file manifest are run
- **THEN** each assertion reads the corresponding live rule from the routed worker or relevant design step-owned source
- **AND** no assertion requires the reduced schema or template bodies to carry the detailed rule text

#### Scenario: contract-tests-read-active-sources
- **WHEN** design contract tests check semantic authoring rules
- **THEN** they read the active routed sources rather than the deleted monolithic instruction.

