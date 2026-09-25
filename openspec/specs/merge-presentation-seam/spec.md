# merge-presentation-seam Specification

## Purpose
Defines the coordinator-owned presentation boundary for merge lifecycle output: the two presentation channels, gate rendering, strategy presentation, resolution-payload validation before staging, the adaptive progress surface, and terminal rendering.

## Requirements

### Requirement: Coordinator-owned merge presentation seam

The merge presentation seam SHALL keep three coordinator-local values apart — the verbatim worker source, the presentation state, and the coordinator's mutation outcomes — and SHALL retain the invocation-scoped merge provenance (`target_sha`, `source_sha`, `merge_base`, and the source-introduced ADR/DDR record inventory) unchanged through the final collision analysis.

#### Scenario: Gate source remains exact

- **WHEN** the worker returns a `needs_input` result for a merge gate
- **THEN** the seam MUST present the worker's exact question and ordered options without changing answer values or continuation semantics.

#### Scenario: Presentation state stays out of the envelope

- **WHEN** the coordinator updates presentation state at a lifecycle boundary
- **THEN** the seam MUST NOT add that state to the invocation envelope or the opaque answer history.

#### Scenario: Concise branch context is rendered

- **WHEN** the worker returns the branch-selection item
- **THEN** the coordinator presents the question in the ambient conversation language with exact branch values and places the direction and full timestamps in the adjacent summary.

### Requirement: Coordinator-owned conflict presentation channels

The merge coordinator SHALL route validated results through two channels: worker-authored information (summaries, conflict notices, the global strategy, verification findings, collision results) as ordinary conversation text, and closed `needs_input` results with non-empty `options` through the active native picker. An empty-options `needs_input` SHALL be printed once as ordinary text and answered with free-form input.

#### Scenario: Worker information is rendered as text

- **WHEN** the worker returns a conflict notice or global strategy
- **THEN** the coordinator prints the exact worker-authored summary as ordinary text before any closed decision

#### Scenario: Open correction is not a picker

- **WHEN** the worker returns a strategy revision request with an empty `options` list
- **THEN** the coordinator prints the request once and forwards the user's free-form answer to the same worker without synthesizing choices

### Requirement: Strategy confirmation controls mutation

The seam SHALL validate that the strategy source covers the whole selected conflict set with Facts, Inferences, objectives, trade-offs, risks, contracts, and alternatives, SHALL print it before the confirmation question, and SHALL keep resolution writes, marker removal, staging, and commits unavailable until `apply-strategy` and a validated matching payload.

#### Scenario: Revision remains mutation-free

- **WHEN** the user requests a strategy revision
- **THEN** no write, marker removal, staging, or commit occurs until a rebuilt strategy is confirmed

### Requirement: Resolution-payload validation precedes staging

The coordinator MUST NOT stage until the payload passes atomic validation (one record per in-scope file, exact paths and categories, valid source and regions, decisions matching the confirmed strategy, no markers in authored text) and the post-resolution review confirms the tree matches the confirmed strategy.

#### Scenario: Invalid payload is rejected before review

- **WHEN** any payload record is missing, duplicated, out of scope, miscategorized, has an invalid source, lacks required regions, holds a marker, or states a decision the strategy did not
- **THEN** the coordinator MUST reject the entire payload and leave every conflict untouched and unstaged

#### Scenario: Divergence returns to the worker

- **WHEN** the post-resolution review finds the tree diverging from the confirmed strategy
- **THEN** the coordinator returns the named divergence to the same worker for at most three rounds before staging

### Requirement: Presentation state cannot authorize mutations

The merge presentation seam MUST NOT dispatch or continue the worker, select an answer, authorize a mutation, run git, write a resolution, rename a record, update a reference, or stage a path.

#### Scenario: Presentation state is rendered

- **WHEN** the coordinator renders gate, progress, or terminal output
- **THEN** rendering MUST report or display state only and MUST leave mutation ownership with the coordinator's execution procedure

### Requirement: Compact authorization summary

Immediately before the authorization picker, the seam SHALL render the method, target branch, source branch, verification status, conflict result, collision result, and staged-file count, keeping the staged paths in coordinator state for the refusal record.

#### Scenario: Authorization uses compact context

- **WHEN** the authorization question is pending
- **THEN** the user sees the compact summary and the `yes (Recommended)` / `no` options, not the staged-file list

### Requirement: Adaptive merge TODO follows the TODO policy

The coordinator MAY render the adaptive merge TODO after method and branch selection, following the canonical item ids, labels, order, route transitions, and panel ownership of `sai/policies/todo-structure.md` § Merge adaptive TODO. The TODO MUST NOT synthesize a worker progress plan or alter worker continuation or mutation ownership.

#### Scenario: Empty frontier removes collision work

- **WHEN** no source-introduced record survives in the final integration state
- **THEN** the coordinator records `not-applicable` and renders no collision item

### Requirement: Terminal rendering follows finalization

The terminal renderer MUST forward the worker-authored summary and the validator's `validated_at` sidecar verbatim, and MUST print `Merge done.` only when `commit_executed` is true.

#### Scenario: Finalized run completes

- **WHEN** the merge commit executed, or the rebase finished and any repair was committed
- **THEN** the renderer prints the worker summary followed by exactly `Merge done.`

#### Scenario: Unfinalized run closes quietly

- **WHEN** the run closes without finalization
- **THEN** the renderer prints the worker summary without `Merge done.`

### Requirement: Fetched contracts stay outside merge input paths

The coordinator MUST keep fetched contracts and installed harness bindings out of the target repository's changed-files union and staging set.

#### Scenario: Installed contract is fetched

- **WHEN** the coordinator fetches the installed merge presentation contract
- **THEN** the contract MUST NOT be added to the changed-files union or staging set

### Requirement: Language handoff is coordinator-owned

The coordinator SHALL ask the working-language question only after the first `conflict_detected` event, SHALL store `working_language` only in invocation-scoped state, and SHALL forward it unchanged through same-worker continuation.

#### Scenario: Clean integration skips language handoff

- **WHEN** the integration outcome is clean
- **THEN** `working_language` stays unresolved and no language question is presented

#### Scenario: Re-entry does not ask language again

- **WHEN** application, verification, or a rebase continuation reports a new conflict
- **THEN** the coordinator renders the refreshed state as ordinary text and continues with the selected language

### Requirement: Presentation state follows validated lifecycle boundaries

The merge presentation seam SHALL update presentation state only after a validated lifecycle transition.

#### Scenario: Invalid transition leaves presentation unchanged

- **WHEN** lifecycle validation returns `invalid`
- **THEN** the presentation seam produces no presentation state update

### Requirement: Harness-parity presentation contract

The Claude Code and opencode projections MUST preserve the same worker-source fidelity, option values and order, strategy and revision behavior, payload validation boundary, TODO transitions, authorization summary, refusal handling, and terminal semantics; only the native question and task-list mechanisms differ.

#### Scenario: Seam behavior is equivalent across harnesses

- **WHEN** an identical worker result is routed through either projection
- **THEN** both render the same decision content and gate semantics and preserve the same commit and terminal behavior
