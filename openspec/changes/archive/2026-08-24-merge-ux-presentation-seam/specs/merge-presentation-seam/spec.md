## ADDED Requirements

### Requirement: Coordinator-owned merge presentation seam

The merge coordinator MUST route every validated worker lifecycle result through a merge-local presentation seam that keeps worker source, merge presentation state, and mutation outcomes separate.

#### Scenario: Gate source remains exact

- **WHEN** the worker returns a `needs_input` result for a merge gate
- **THEN** the seam MUST present the worker's exact question and ordered options without changing answer values or continuation semantics

#### Scenario: Coordinator state records lifecycle boundaries

- **WHEN** the coordinator reaches a named merge lifecycle boundary or records a coordinator-owned operation outcome
- **THEN** the seam MUST update presentation state without adding that state to the invocation envelope or opaque answer history

### Requirement: Legacy rendering preserves merge behavior

The active merge presentation renderer MUST preserve existing worker-authored summaries, timestamps, gate context, verification-round behavior, and terminal completion semantics.

#### Scenario: Authorized commit completes

- **WHEN** the coordinator records that the authorized merge commit executed
- **THEN** the terminal renderer MUST forward the worker-authored summary and print exactly `Merge done.`

#### Scenario: Commit does not execute

- **WHEN** the merge closes without an executed authorized commit
- **THEN** the terminal renderer MUST forward the worker-authored summary and MUST NOT print `Merge done.`

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

### Requirement: Absent progress plans remain absent

The merge presentation seam MUST NOT synthesize a progress plan, task panel, or TODO when the merge adapter declares no progress plan.

#### Scenario: Clean merge has no conflict work

- **WHEN** the merge completes cleanly without conflict-resolution work
- **THEN** the seam MUST render no pending conflict-resolution task surface
