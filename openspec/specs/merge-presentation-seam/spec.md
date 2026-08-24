# merge-presentation-seam Specification

## Purpose
TBD: Defines the coordinator-owned presentation boundary for merge lifecycle output.

## Requirements

### Requirement: Coordinator-owned merge presentation seam

The merge coordinator MUST route every validated worker lifecycle result through a merge-local presentation seam that keeps worker source, merge presentation state, and mutation outcomes separate. The concise renderer MUST preserve worker-authored question text and option values, present the branch question as `¿Qué rama quieres mergear?` with date-bearing labels, and render detailed branch and authorization context in coordinator-owned summaries.

#### Scenario: Gate source remains exact

- **WHEN** the worker returns a `needs_input` result for a merge gate
- **THEN** the seam MUST present the worker's exact question and ordered options without changing answer values or continuation semantics

#### Scenario: Coordinator state records lifecycle boundaries

- **WHEN** the coordinator reaches a named merge lifecycle boundary or records a coordinator-owned operation outcome
- **THEN** the seam MUST update presentation state without adding that state to the invocation envelope or opaque answer history

#### Scenario: Concise branch context is rendered

- **WHEN** the worker returns the branch-selection result
- **THEN** the coordinator presents the exact question and option values with the ordered candidate details in the adjacent decision summary

### Requirement: Legacy rendering preserves merge behavior

The active merge presentation renderer MUST preserve worker-authored summaries, timestamps, verification-round behavior, continuation semantics, and terminal completion semantics while using concise decision-oriented summaries instead of full lifecycle payloads.

#### Scenario: Authorized commit completes

- **WHEN** the coordinator records that the authorized merge commit executed
- **THEN** the terminal renderer MUST forward the worker-authored summary and print exactly `Merge done.`

#### Scenario: Commit does not execute

- **WHEN** the merge closes without an executed authorized commit
- **THEN** the terminal renderer MUST forward the worker-authored summary and MUST NOT print `Merge done.`

#### Scenario: Verification behavior remains unchanged

- **WHEN** a verification round fails or reaches the three-round cap
- **THEN** the presentation seam records the same staged and uncommitted state without implying that a commit occurred

### Requirement: Presentation state cannot authorize mutations

The merge presentation seam MUST NOT dispatch or continue the worker, select an answer, authorize a mutation, run git, write a resolution, rename a record, update a reference, or stage a path.

#### Scenario: Presentation state is rendered

- **WHEN** the coordinator renders gate, progress, or terminal output
- **THEN** rendering MUST report or display state only and MUST leave mutation ownership with the coordinator's existing execution procedure

### Requirement: Installed seam assets stay outside merge input paths

The coordinator MUST exclude the installed presentation contract from the target repository's changed-files union and final staging set unless a repository-local copy is independently verified to exist and belong to the target repository.

#### Scenario: Installed-only contract is fetched

- **WHEN** the coordinator fetches the installed merge presentation contract
- **THEN** the contract MUST NOT be added to the merge changed-files union or staging set merely because it was fetched

### Requirement: Absent progress plans remain absent except for the merge adaptive surface

The merge presentation seam MUST NOT synthesize a worker progress plan or worker progress event. The coordinator MAY render the separate adaptive merge TODO after source-branch selection, and that TODO MUST NOT alter worker continuation or mutation ownership.

#### Scenario: Merge TODO is rendered after branch selection

- **WHEN** the user selects a source branch
- **THEN** the coordinator renders the canonical merge TODO without adding a worker progress plan


### Requirement: Adaptive merge TODO uses canonical route transitions

The coordinator MUST render only the canonical merge TODO items for the resolved route, in fixed order, and MUST remove impossible conflict items after a clean outcome. The TODO MUST remain rendering-only and MUST never authorize a merge, resolution, rename, staging operation, or commit.

#### Scenario: Clean merge removes impossible work

- **WHEN** the merge completes without conflicts
- **THEN** the TODO marks the merge item complete and omits scope, resolution, and verification items before presenting collision and authorization state
