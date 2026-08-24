# design-phase-consolidation Specification

## Purpose
TBD - created by archiving change collapse-design-command-monolith. Update Purpose after archive.
## Requirements
### Requirement: phase-contract-is-canonical
The routed design coordinator and the design planning worker SHALL reference `sai/commands/design/phase-contract.md` as the authoritative and exclusive source for the `DesignProgressPlan`, `DesignStepPointerMap`, `DesignWriteSurface`, and `DesignResultUnion` declarations. Neither the coordinator card nor the worker card SHALL carry an inline redeclaration or restatement of those declarations.

#### Scenario: Coordinator references the phase contract
- **WHEN** the design coordinator initializes at invocation start
- **THEN** it fetches `sai/commands/design/phase-contract.md` and takes both progress-plan variants and the step pointer map from it
- **AND** `sai/commands/design/coordinator.md` carries no inline enumeration of those declarations

#### Scenario: Worker references the phase contract
- **WHEN** the design planning worker initializes at invocation start
- **THEN** it fetches `sai/commands/design/phase-contract.md` and selects its progress-plan variant from the declarations there
- **AND** `sai/commands/design/worker.md` carries no inline enumeration of the plans, the pointer map, the write surface, or the result union

### Requirement: coordinator-and-worker-plan-parity
The coordinator and the worker SHALL resolve to the same progress-plan variant for a given invocation, selected from raw `--overview-lang` token presence: a present token selects the opted-in seven-step plan, an absent token selects the unopted six-step plan. Because both read the same canonical declaration, parity holds by construction rather than by duplicated enumeration.

#### Scenario: Present token selects the seven-step plan
- **WHEN** an invocation envelope contains an `--overview-lang` token in any form
- **THEN** both surfaces resolve the plan whose ordered step ids are `prereqs-resolution`, `research`, `design`, `tasks`, `interfaces`, `review`, `overview`

#### Scenario: Absent token selects the six-step plan
- **WHEN** an invocation envelope contains no `--overview-lang` token
- **THEN** both surfaces resolve the plan whose ordered step ids are `prereqs-resolution`, `research`, `design`, `tasks`, `interfaces`, `review`
- **AND** the `overview` step is omitted with no replacement step in its position

### Requirement: static-step-pointer-map-is-fully-known
The phase contract SHALL declare a static `DesignStepPointerMap` covering the union of both plan variants' step ids, fully known at dispatch and immutable for the invocation. Pointer derivation SHALL consult only the step ids of the active plan, so an unopted activation never derives the `overview` entry.

#### Scenario: Unopted activation never derives the overview pointer
- **WHEN** the unopted plan is active and every one of its six steps has been marked
- **THEN** the continuation carries exactly `Active step: none — complete remaining work and return your terminal result.`
- **AND** no pointer line naming `overview` is emitted at any point in that invocation

#### Scenario: Pointer map is absent from transport
- **WHEN** the coordinator dispatches the worker or reconstructs a replacement
- **THEN** the pointer map travels in neither the dispatch envelope nor any reconstruction field

### Requirement: worker-derives-pointers-without-a-coordinator
When no coordinator is present to send pointer lines, the design planning worker SHALL derive its own active step from the canonical `DesignStepPointerMap`, taking the first unmarked step in the active plan. This keeps the step-sealing rule intact on a coordinator-less dispatch instead of requiring the worker to open every step file.

#### Scenario: Supervised dispatch resolves its own step pointers
- **WHEN** the design worker runs on a route where no coordinator issues progress continuations
- **THEN** it resolves the active step itself from the canonical map
- **AND** it opens only the step file that resolution names

### Requirement: file-manifest-algorithm-lives-with-its-input
The deterministic net-fold algorithm that produces the `### File Manifest` subsection SHALL be specified in `sai/commands/design/steps/tasks.md`, where its input — the per-step `**Files Affected**` entries — is authored. `sai/commands/design/steps/design.md` SHALL state that the section exists and where it is authored, and SHALL NOT restate the algorithm.

#### Scenario: The fold is specified where its input exists
- **WHEN** a design run reaches the tasks step
- **THEN** the fold algorithm is available in that step's instruction file
- **AND** `sai/commands/design/steps/design.md` carries a reference to it rather than a second copy

### Requirement: placeholder-resolution-uses-resolved-change-name
Step instruction files under `sai/commands/design/steps/` SHALL denote the resolved change identifier with the placeholder `{resolved_change_name}` and SHALL NOT use `$ARGUMENTS`, which on a flag-bearing envelope interpolates the raw argument string into artifact paths.

#### Scenario: Step files carry the placeholder
- **WHEN** any of `research.md`, `design.md`, `interfaces.md`, or `tasks.md` names an artifact path
- **THEN** the path reads `openspec/changes/{resolved_change_name}/...`
- **AND** no occurrence of `$ARGUMENTS` remains in any step file

#### Scenario: A flag-bearing envelope does not corrupt the path
- **WHEN** the worker resolves a change from an envelope such as `{name} --fast-track --supervised`
- **THEN** the artifact path derives from the resolved change name alone
- **AND** no flag token appears in any path segment

