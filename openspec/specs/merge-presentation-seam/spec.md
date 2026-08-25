# merge-presentation-seam Specification

## Purpose
Defines the coordinator-owned presentation boundary for merge lifecycle output, contextual conflict decisions, complete-file resolution validation, adaptive progress, verification, and final authorization.

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

### Requirement: contextual-analysis/decision presentation boundary

The seam MUST present semantically ambiguous conflicts as informed decisions over complete behavioral outcomes. Its gate source MUST identify the affected file and conflict region, distinguish **Facts** from **Inferences**, explain both branch objectives, preserve the preserve/gain/give-up/risk comparison and affected contracts, and include the synthesis safety assessment. Human-facing labels MUST describe behavior and trade-offs rather than expose `ours` or `theirs` as jargon or offer text fragments. Obvious conflicts MUST remain lightweight and MUST complete without a contextual picker.

#### Scenario: Semantic alternatives are rendered without reinterpretation

- **WHEN** the worker returns a contextual semantic-decision result
- **THEN** the seam renders the worker's exact ordered options — `ours`, `theirs`, optional `synthesis`, and `more-context` — while keeping the internal values stable and presenting the complete behavioral meaning in the adjacent summary

#### Scenario: More-context preserves the decision boundary

- **WHEN** the user selects `more-context`
- **THEN** the seam forwards that exact value to the same worker, preserves the pending alternatives and contextual state, performs no resolution write, conflict-marker removal, staging, or commit, and renders the next worker-authored gate without adding a new decision

#### Scenario: Simple conflict remains lightweight

- **WHEN** the worker reports an obvious deterministic conflict
- **THEN** the seam marks contextual analysis complete without inventing a human gate and proceeds only to the coordinator's validated resolution boundary

### Requirement: Complete-file resolution validation precedes mutation

The coordinator MUST NOT enter the resolution mutation boundary until the worker has returned a complete resolution payload for every conflicted file in the selected scope. The seam and coordinator MUST validate the payload atomically: exact paths and categories, one record per file, accepted contextual decisions without `more-context`, complete final UTF-8 content strings, and no conflict markers. The coordinator MUST NOT write or stage a resolution before that validation. Diffs, hunks, region replacements, prose instructions, missing records, duplicate records, unexpected paths, and reconstructed content MUST be rejected as a whole.

#### Scenario: Pending context blocks writes and staging

- **WHEN** contextual analysis is pending or the worker has not returned the matching complete alternative after a decision
- **THEN** the coordinator MUST NOT write a resolution, remove conflict markers, or stage any affected path

#### Scenario: Invalid complete-file payload is rejected

- **WHEN** any payload record is missing, duplicated, out of scope, incorrectly categorized, fragmentary, marker-containing, or inconsistent with the offered decision
- **THEN** the coordinator MUST reject the entire payload and leave every conflict untouched and unstaged

#### Scenario: Valid payload is written exactly once

- **WHEN** every payload record passes validation and every required semantic decision is explicit
- **THEN** the coordinator writes the supplied complete file contents exactly as provided, stages only the validated paths, and never derives content from prose or concatenates unselected alternatives

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

### Requirement: Coordinator owns merge mutations and commit authorization

The presentation seam MUST preserve the coordinator-only ownership boundary: only the coordinator may launch the merge, write validated resolution files, rename ADR/DDR records, update references, stage paths, or execute the commit. The worker and seam remain read-only. After coordinator-owned writes and staging, the seam MUST preserve the verification loop and final authorization gate; no progress transition or presentation state may imply authorization.

#### Scenario: Verification and commit remain gated

- **WHEN** validated resolutions are staged and the test suite is run
- **THEN** the coordinator records verification rounds without resetting or committing the staged state, and the final merge commit executes only after the unchanged explicit authorization question receives `yes (Recommended)`

#### Scenario: Fast-track does not bypass semantic safety

- **WHEN** fast-track is active for a conflicted merge
- **THEN** the seam may omit only the runtime scope question, while contextual semantic decisions, complete-file validation, verification, and final commit authorization remain visible and required

### Requirement: Installed seam assets stay outside merge input paths

The coordinator MUST exclude the installed presentation contract from the target repository's changed-files union and final staging set unless a repository-local copy is independently verified to exist and belong to the target repository.

#### Scenario: Installed-only contract is fetched

- **WHEN** the coordinator fetches the installed merge presentation contract
- **THEN** the contract MUST NOT be added to the merge changed-files union or staging set merely because it was fetched

### Requirement: Harness-parity presentation contract

The Claude Code and opencode seam projections MUST preserve the same worker-source fidelity, contextual option values and order, complete-file validation boundary, `more-context` continuation behavior, adaptive TODO transitions, verification state, authorization summary, refusal handling, and terminal completion semantics. Harness-specific differences are limited to the native task-list binding and MUST NOT change merge decisions or mutation ownership.

#### Scenario: Seam behavior is equivalent across harnesses

- **WHEN** an identical worker result is routed through the Claude Code projection or the opencode projection
- **THEN** both render the same decision content and gate semantics, keep pending context mutation-free, and preserve the same commit and terminal behavior

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
