## Purpose

Define the shared-AI OpenSpec schema, artifact graph, and authoring-template contracts.

## Requirements

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
The proposal template SHALL include an `## Additional Notes` section for non-normative information useful to designers and implementers. Its comment SHALL forbid restating Why, What Changes, Capabilities, Impact, or the research documentation, and SHALL say to omit the section when nothing remains.

#### Scenario: Proposal template contains Additional Notes section
- **WHEN** a spec author opens `openspec/schemas/sai-workflow/templates/proposal.md`
- **THEN** an `## Additional Notes` section is present at the end of the file with a comment placeholder describing its intended use, the no-restating rule, and the omit-when-empty rule

### Requirement: sai-workflow schema artifact description lists Additional Notes
The schema artifact description for the proposal SHALL document `Additional Notes` as a valid proposal section, and SHALL state that it never restates Why, What Changes, Capabilities, Impact, or the research documentation and is omitted when nothing remains.

#### Scenario: Schema documents the Additional Notes section
- **WHEN** the `artifacts.proposal` description in `openspec/schemas/sai-workflow/schema.yaml` is read
- **THEN** a `**Additional Notes**` bullet is present in the list of expected proposal sections, followed by the no-restating and omit-when-empty rule

### Requirement: sai-workflow schema names the record-family routing in the design artifact

The design artifact's description and instruction in `openspec/schemas/sai-workflow/schema.yaml` SHALL name the record-family routing instead of leaving the ADR-vs-DDR choice open. The design artifact description SHALL state that ADR/DDR evaluation resolves the family via the ordered routing test (replacing the bare "ADR/DDR evaluation" wording), and the design artifact instruction SHALL direct that a decision meeting all three ADR/DDR criteria resolves its record family via the ordered routing test and records it in `design.md` as the `**Record family**` marker, consistent with the active routed design step.

#### Scenario: Schema description names the family routing

- **WHEN** the design artifact description in `openspec/schemas/sai-workflow/schema.yaml` is read
- **THEN** it names the family resolution (e.g. "ADR/DDR evaluation with the family resolved by the ordered routing test") rather than a bare "ADR/DDR evaluation"

#### Scenario: Schema design instruction directs family resolution

- **WHEN** the design artifact instruction in `openspec/schemas/sai-workflow/schema.yaml` is read
- **THEN** it directs qualifying decisions to resolve and record the family via the ordered routing test
- **THEN** the instruction stays consistent with the active routed design step's Decisions evaluation

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
`test/change-overview-contract.test.js` and `test/design-coordinator-worker.test.js` SHALL assert the no-step-contracts sentinel, the Target State section, the File Manifest heading, and the absence of the Architecture Snapshot heading and the Provenance marker against the existing live routed worker and step-owned authoring sources, including `sai/commands/design/worker.md` and the relevant files under `sai/commands/design/steps/`. This test-placement requirement does not redefine the normative ownership of the Target State contract. Schema and template checks SHALL be limited to the retained pointer and structural-skeleton contract rather than copying those semantic assertions.

#### Scenario: semantic assertions target the command instruction
- **WHEN** the design contract tests for the no-step sentinel, Target State, the retired snapshot, and file manifest are run
- **THEN** each assertion reads the corresponding live rule from the routed worker or relevant design step-owned source, and no assertion requires the reduced schema or template bodies to carry the detailed rule text

#### Scenario: contract-tests-read-active-sources
- **WHEN** design contract tests check semantic authoring rules
- **THEN** they read the active routed sources rather than the deleted monolithic instruction.

### Requirement: the design description does not advertise an Endpoint Map artifact section
The `design` artifact description in `openspec/schemas/sai-workflow/schema.yaml` SHALL describe the live design contract without promising an Endpoint Map.

#### Scenario: stale Endpoint Map promise is absent
- **WHEN** the `design` artifact description in `openspec/schemas/sai-workflow/schema.yaml` is read
- **THEN** it does not claim that `design.md` contains an endpoint map
- **AND** `generates`, `requires`, `apply.requires`, and `apply.tracks` remain unchanged
- **AND** the design description is deliberately corrected

### Requirement: sai-workflow proposal template includes an optional Request Additional Notes section

The proposal template at `openspec/schemas/sai-workflow/templates/proposal.md` SHALL include a `## Request Additional Notes` section immediately before `## Additional Notes`. Its comment SHALL state that the section is a verbatim, non-normative copy of the block's `**Request Additional Notes**` field, that no requirement or scenario is derived from it, and that the section is omitted when the block carries no such field. `## Additional Notes` SHALL remain the last section. The `artifacts.proposal` description in `openspec/schemas/sai-workflow/schema.yaml` SHALL list **Request Additional Notes** as an optional, verbatim, non-normative section right before **Additional Notes**.

#### Scenario: Template places the section before Additional Notes

- **WHEN** a spec author opens `openspec/schemas/sai-workflow/templates/proposal.md`
- **THEN** a `## Request Additional Notes` section with its verbatim, non-normative comment appears immediately before the final `## Additional Notes` section

#### Scenario: Schema documents the optional section

- **WHEN** the `artifacts.proposal` description in `openspec/schemas/sai-workflow/schema.yaml` is read
- **THEN** a `**Request Additional Notes**` bullet marked optional and non-normative appears immediately before the `**Additional Notes**` bullet

### Requirement: sai-workflow specs template and instruction carry the Purpose rule for new capabilities
The `specs` template SHALL start with a `## Purpose` section whose comment limits it to new capabilities (one or two sentences of at least 50 characters on what the capability is for), and the `specs` artifact instruction in `openspec/schemas/sai-workflow/schema.yaml` SHALL require `## Purpose` at the start of a new capability's `spec.md` and forbid it in a delta spec of an existing capability.

#### Scenario: Specs template opens with a Purpose section
- **WHEN** a spec author opens `openspec/schemas/sai-workflow/templates/specs.md`
- **THEN** the first section is `## Purpose` with a comment that restricts it to new capabilities and asks for one or two sentences of 50 or more characters

#### Scenario: Schema instruction restricts Purpose to new capabilities
- **WHEN** the `artifacts.specs` instruction in `openspec/schemas/sai-workflow/schema.yaml` is read
- **THEN** it tells authors to start a new capability's `spec.md` with `## Purpose` and never to add `## Purpose` to a delta spec of an existing capability

### Requirement: Proposal and specs instructions copy the upstream spec-driven text
The `proposal` and `specs` artifact instructions in `openspec/schemas/sai-workflow/schema.yaml` SHALL copy the `spec-driven` 1.15.0 instruction text verbatim, followed by exactly one SAI additions block delimited by `<!-- sai-additions:begin -->` and `<!-- sai-additions:end -->`. SAI-only rules, including the Proposal Research Documentation, Request Additional Notes, and Additional Notes sections, the no-fenced-code rule, and the `skip_specs` rule, SHALL live inside that block.

#### Scenario: Each instruction carries one trailing additions block
- **WHEN** the `proposal` or `specs` instruction in `schema.yaml` is read
- **THEN** it holds the upstream text followed by one delimited SAI additions block that states the `skip_specs` rule

#### Scenario: The additions restrict skip_specs to the block declaration
- **WHEN** an author reads the SAI additions of the `proposal` or `specs` instruction
- **THEN** they say to set `skip_specs: true` only when the Ready to Propose block declares `**Specs**: none — <reason>`, never on the author's own judgment

### Requirement: A drift test guards the copied upstream text
The test suite SHALL compare the part of each copied instruction outside the SAI additions block with a stored snapshot of the `spec-driven` 1.15.0 schema under `test/fixtures/`, which is not installed into projects. A difference SHALL fail the test and name the diverging section, and an edit inside the SAI additions block SHALL keep it passing.

#### Scenario: Diverging copied text fails and names the section
- **WHEN** the copied proposal or specs text differs from the stored 1.15.0 snapshot
- **THEN** the drift test fails with a message naming the instruction and the first diverging section

#### Scenario: Edits inside the additions block pass
- **WHEN** only the text inside the SAI additions block changes
- **THEN** the drift test passes

### Requirement: The copied text uses only commands of the reference CLI
The copied upstream text SHALL cite only `openspec` subcommands and options that exist in the reference CLI 1.13.0, and no CLI version check SHALL be added to the prerequisite check.

#### Scenario: A cited command absent from CLI 1.13.0 fails the suite
- **WHEN** the copied text cites an `openspec` subcommand or option outside the CLI 1.13.0 set
- **THEN** the drift test suite fails naming that subcommand or option

### Requirement: Specs additions override the upstream lines that conflict with the spec worker
The SAI additions block of the `specs` artifact instruction in `openspec/schemas/sai-workflow/schema.yaml` SHALL carry the lines that override the copied upstream text where it conflicts with unattended runs, refinement runs, and the spec worker write surface, while the copied upstream text stays unchanged. In an unattended run (`/sai-1-spec`, `/sai-plan`, or a `/sai-explore` route) the spec worker SHALL write each spec file without first announcing which capability it writes. In a refinement run the spec worker SHALL rewrite the existing spec files that the feedback touches. The spec worker SHALL never edit a file under `openspec/specs/**`; a needed capability Purpose change SHALL be recorded in the proposal's Additional Notes instead.

#### Scenario: Unattended run writes spec files without an announcement
- **WHEN** the spec worker writes spec files in an unattended run
- **THEN** the SAI additions direct it to write each file without first saying which capability it writes, overriding the upstream announcement line

#### Scenario: Refinement run rewrites the touched spec files
- **WHEN** the spec worker runs with existing spec files and a feedback file
- **THEN** the SAI additions direct it to rewrite the existing spec files that the feedback touches, and the upstream "Do not rewrite an existing file unless the user asks you to" line does not block it

#### Scenario: Purpose change is recorded in the proposal
- **WHEN** a change needs a capability Purpose change
- **THEN** the SAI additions direct the spec worker to write no file under `openspec/specs/**` and to record the Purpose change in the proposal's Additional Notes

### Requirement: sai-workflow schema declares the reduced artifact graph

`openspec/schemas/sai-workflow/schema.yaml` SHALL declare the artifacts `proposal`, `specs`, `design`, `tasks`, `review`, `security`, `performance`, `accessibility`, and `telemetry`, each with an output path and an optional `requires` list, and SHALL declare neither `interfaces`, `change-overview`, nor `implementation`. Its description SHALL read the pipeline as proposal → specs → design → tasks → review → audits, and `applyRequires` SHALL be `["tasks"]`.

#### Scenario: Retired artifacts are absent

- **WHEN** `openspec/schemas/sai-workflow/schema.yaml` is read
- **THEN** it declares no `interfaces` and no `change-overview` artifact

#### Scenario: Apply requires tasks

- **WHEN** `openspec status` runs on a change using the sai-workflow schema
- **THEN** `applyRequires` is `["tasks"]`

### Requirement: sai-workflow templates scaffold the reduced design and tasks

`openspec/schemas/sai-workflow/templates/` SHALL hold one template per declared artifact and SHALL hold no `interfaces.md` and no `change-overview.md` template. The `design.md` template SHALL retain the headings Target State, File Manifest, Decisions, and Risks / Trade-offs with a write-time-authority pointer to `sai/commands/design/steps/design.md`; its Target State comment SHALL ask for one `- <path> :: <signature>` bullet per new or changed public symbol with no function body, and its File Manifest comment SHALL name the fold of the Files Affected of the steps without tests and both sentinels, `None — no files affected` and `None — every file passes through the plan RED`. The `tasks.md` template SHALL scaffold a step with tests (the progress checkbox, Routing, and Scenarios, with a comment saying that the write-back adds Tests and Test Command) and a step without tests (the progress checkbox, Routing, Files Affected, What Changes, and Closure criterion), followed by `## Implementation Context`, with a write-time-authority pointer to `sai/commands/design/steps/tasks.md`. The `tasks.md` template SHALL carry no What Will Be Done, Existing Tests Broken, or Required Documentation scaffold. Neither template SHALL carry normative generation rules.

#### Scenario: Templates directory

- **WHEN** the templates directory is listed
- **THEN** it holds no `interfaces.md` and no `change-overview.md`

#### Scenario: tasks template step skeleton

- **WHEN** the `tasks.md` template is read
- **THEN** it shows a step with `**Scenarios**` and a step with `**Files Affected**`, `**What Changes**`, and `**Closure criterion**`, and no `**Testing Strategy**`, `**What Will Be Done**`, `**Existing Tests Broken**`, or `## Required Documentation`

#### Scenario: design template Target State comment

- **WHEN** the `design.md` template is read
- **THEN** its Target State comment asks for `- <path> :: <signature>` bullets with no function body, and its File Manifest comment names both sentinels

### Requirement: sai-workflow schema describes the tasks artifact by scenarios

The `tasks` artifact of `openspec/schemas/sai-workflow/schema.yaml` SHALL describe `tasks.md` as an implementation task list with one step per testable behavior, each listing the spec scenarios whose plan tests it turns green, or carrying its closure criterion, for human review and `sai-3-implement` to work through.

#### Scenario: tasks artifact description

- **WHEN** the `tasks` artifact of `openspec/schemas/sai-workflow/schema.yaml` is read
- **THEN** its description says each step lists the spec scenarios whose plan tests it turns green or carries its closure criterion
