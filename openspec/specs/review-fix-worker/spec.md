# review-fix-worker Specification

## Purpose
TBD - created by archiving change review-direct-build-option. Update Purpose after archive.

## Requirements

### Requirement: Findings-Driven Code Fix

The review-fix worker SHALL apply only the supplied selected findings directly on code without regenerating implementation.md or tasks.md. The labeled exclusion list SHALL remain unresolved, and if a selected fix necessarily resolves an excluded finding, the worker SHALL return a failed result before writing so the user can revise the selection.

#### Scenario: Code-only application

- **WHEN** findings cite code paths with concrete corrections
- **THEN** the worker modifies only code, tests, required configuration, or shipped schemas and leaves implementation artifacts untouched

#### Scenario: Selected finding is applied without an excluded fix

- **WHEN** a selected finding cites a code path with a concrete correction that does not require an excluded finding
- **THEN** the worker SHALL modify only the permitted repository artifacts needed for the selected correction and SHALL leave the excluded finding unresolved.

#### Scenario: Selected and excluded findings are coupled

- **WHEN** applying a selected finding necessarily resolves an excluded finding
- **THEN** the worker SHALL return a failed result before writing and SHALL explain the dependency.

### Requirement: Fix Loop Convergence Guard

The fix loop SHALL cap at three rounds and SHALL make no commit when selected findings do not converge. Continuations SHALL carry only the ordered outstanding selected findings or a verification note, while the initial exclusion list remains in force.

#### Scenario: Non-convergence

- **WHEN** a third completed round still carries findings
- **THEN** the run reports for the manual route with no staging and no commit

#### Scenario: Non-convergence respects exclusions

- **WHEN** a third completed round still carries selected findings or an unauthorized change
- **THEN** the worker SHALL return the remaining selected scope or verification issue without treating excluded findings as outstanding, and the coordinator SHALL stage nothing and commit nothing.

### Requirement: Review-Fix Worker Registration
The installation SHALL register sai-review-fix-worker as the fifteenth matrix worker with bindings and agents for both harnesses.
#### Scenario: Roster expansion
- **WHEN** the manifest is expanded for either harness
- **THEN** fifteen worker bindings and fifteen managed agents are projected including the review-fix worker

### Requirement: Fixed Marks Continuation

After the coordinator accepts convergence, the review-fix worker SHALL accept one final continuation. Its first line SHALL be the marker `--mark-fixed`, followed by a newline and then the source-qualified identifiers of the findings the fix resolved, each with its report path. For each listed finding, the worker SHALL append the fixed mark of `sai/policies/finding-state.md` to the finding's heading line in that report and SHALL change nothing else: no body line, no other heading, no identifier, and no `Summary:` tally. A finding that is already marked SHALL stay as it is. The worker SHALL add every report it touched to `changed_files`, return the closed lifecycle result, and write no further fix in that stretch.

#### Scenario: Listed findings are marked

- **WHEN** the worker receives `--mark-fixed` with `review:H1` and the path of `review.md`
- **THEN** it SHALL append ` (FIXED)` to the heading line of `H1` in `review.md`, change no other line, and list `review.md` in `changed_files`

#### Scenario: An already-marked finding is unchanged

- **WHEN** a listed finding's heading line already carries the fixed mark
- **THEN** the worker SHALL leave that heading line as it is
