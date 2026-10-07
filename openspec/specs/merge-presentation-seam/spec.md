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

The merge coordinator SHALL select the stage's report from the validated original source before routing it through two channels: selected worker-authored information as ordinary conversation text, and closed `needs_input` results with non-empty `options` through the active native picker. An empty-options `needs_input` SHALL be printed once as ordinary text and answered with free-form input. Conflict notices and complete strategies SHALL retain the worker's wording; internal mechanical appendices and resolution payloads SHALL remain available for validation without being repeated as public explanations. Report selection SHALL NOT alter questions, ordered options, answer values, or continuation semantics.

#### Scenario: Worker information is rendered as text

- **WHEN** the worker returns a conflict notice or global strategy
- **THEN** the coordinator prints the exact worker-authored conflict notice or complete strategy report as ordinary text before any closed decision, excluding only internal mechanical evidence hand-off data

#### Scenario: Open correction is not a picker

- **WHEN** the worker returns a strategy revision request with an empty `options` list
- **THEN** the coordinator prints the request once and forwards the user's free-form answer to the same worker without synthesizing choices

### Requirement: Strategy confirmation controls mutation

The seam SHALL validate that the strategy source covers the whole selected conflict set with Facts, Inferences, objectives, trade-offs, risks, contracts, and alternatives, SHALL print it before the confirmation question, and SHALL keep resolution writes, marker removal, staging, and commits unavailable until `apply-strategy` and a validated matching payload.

#### Scenario: Revision remains mutation-free

- **WHEN** the user requests a strategy revision
- **THEN** no write, marker removal, staging, or commit occurs until a rebuilt strategy is confirmed

### Requirement: Resolution-payload validation precedes staging

The coordinator MUST NOT stage until the original received result and its payload pass atomic validation: one record per in-scope file, exact paths and categories, valid source and complete captured regions, decisions matching the confirmed strategy, no markers in authored text, valid snapshot identity, and preserved outside-region and unrelated content. The post-resolution independent review MUST also confirm the tree matches the confirmed strategy. Mechanical checks SHALL supplement rather than replace that review. Any selected public report SHALL remain separate from the original validation source.

#### Scenario: Invalid payload is rejected before review

- **WHEN** any payload record is missing, duplicated, out of scope, miscategorized, has an invalid source, lacks required regions, holds a marker, or states a decision the strategy did not
- **THEN** the coordinator MUST reject the entire payload and leave every conflict untouched by coordinator checkout and unstaged

#### Scenario: Divergence returns to the worker

- **WHEN** the post-resolution review finds the tree diverging from the confirmed strategy
- **THEN** the coordinator returns the named divergence to the same worker for at most three rounds before staging

#### Scenario: Compact display cannot weaken validation

- **WHEN** presentation omits repeated explanations or internal resolution evidence
- **THEN** the coordinator still validates the complete original source and independently reviews materialized content before staging

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

The terminal renderer MUST forward the worker-authored summary and the CLI response's `received_at` verbatim, and MUST print `Merge done.` only when `commit_executed` is true.

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

The coordinator SHALL ask the working-language question only at the first conflict stop it detects from the conflict snapshot, SHALL store `working_language` only in invocation-scoped state, and SHALL forward it unchanged in the worker's task disclosure and through same-worker continuation.

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

### Requirement: Single-source merge strategy explanation

The presentation seam SHALL select the active stage's user-facing report without modifying the original validated worker source. Each strategy or revision SHALL receive its complete strategy and Conflict Analysis presentation once before application in either mode. A normal-mode gate SHALL reuse that already-rendered strategy as context rather than print it again. Successful application SHALL retain the complete resolution payload internally without repeating Conflict Analysis, alternatives, or selected-decision explanations. Later reports SHALL explain new decisions, failures, escalations, repairs, unavailable verification, and state changes while reusing settled outcomes. Compactness SHALL NOT impose an arbitrary length cap or hide necessary evidence.

#### Scenario: Normal strategy gate does not duplicate its context

- **WHEN** the complete strategy has been presented and its normal-mode decision is requested
- **THEN** the gate uses that existing presentation without printing the strategy a second time

#### Scenario: Successful application retains evidence without repetition

- **WHEN** the worker returns a successful resolution payload for the presented strategy
- **THEN** the seam retains the full payload for validation and shows only new errors, escalations, or changed state instead of repeating semantic analysis

#### Scenario: Revised strategy receives a complete presentation

- **WHEN** a later conflict or new context produces a revised strategy
- **THEN** the seam presents that strategy and its analysis completely before its application rather than treating earlier presentation as sufficient

#### Scenario: Non-applicability does not invent a search report

- **WHEN** mechanical evidence establishes that collision analysis is not applicable
- **THEN** presentation carries its disposition without narrating grouping or reference searches that did not occur

### Requirement: Merge evidence remains internal and original

The coordinator SHALL retain and validate the original received worker source bytes, not a reconstructed envelope with a shortened summary or substituted fields. The coordinator SHALL collect mechanical receipts itself through the merge tool, SHALL retain each exact record reference and checksum as internal evidence rather than part of the selected user-facing report, and SHALL hand a receipt to the worker as its exact reference and hash rather than a shortened reconstruction. Replacement state SHALL carry the complete retained reference inventory. Presentation selection SHALL NOT change validation input or authorize a mutation.

#### Scenario: Presentation is not validator input

- **WHEN** the seam selects a compact application or verification report
- **THEN** validation continues to use the untouched original worker result and exact evidence references rather than the selected display text

#### Scenario: Receipt appendix is retained without public repetition

- **WHEN** the coordinator collects a new external receipt
- **THEN** it retains the record's exact reference and checksum for reconstruction and excludes that technical evidence from the selected public stage report

### Requirement: Self-sufficient merge closure

The closing summary, written by the coordinator from the final texts' template, SHALL identify method and branch direction, the actual operation and resulting HEAD or exact pending state, verification status, conflict and collision disposition, and unresolved matters. It SHALL explain new decisions, failures, and state changes without repeating settled strategy explanations. On a partial failure it SHALL identify completed operations, the failed operation and error, staged and pending paths, current HEAD, merge or rebase state, and unresolved verification or collision findings. The closing summary SHALL be written before terminal navigation so the terminal renderer can print it unchanged.

#### Scenario: Successful closure retains necessary outcomes

- **WHEN** integration finalization succeeds
- **THEN** the closing summary states its operation and resulting HEAD, branches, verification outcome, conflict and collision results, and remaining matters without repeating the strategy explanation

#### Scenario: Partial failure reports exact repository state

- **WHEN** a Git operation fails after earlier operations succeeded
- **THEN** closure distinguishes completed and failed operations and reports current HEAD, staged and pending paths, operation state, and unresolved findings without claiming successful finalization

### Requirement: Seam holds the coordinator's fixed texts per stage

The presentation seam SHALL hold the coordinator's fixed texts in stage-ordered sections: preflight texts (in-progress guard closings, the dirty, method, and branch items, the branch-entry prompt, the integration proposal, and the early closes), conflict texts, verification texts, collision texts, and final texts (the compact finalization summary and the final summary template). Pinned texts SHALL stay verbatim, and the merge tool SHALL serve each section with the coordinator stage that uses it.

#### Scenario: Stage entry delivers only its own texts

- **WHEN** the coordinator enters the `verify` stage
- **THEN** the returned text holds the verification texts and holds neither the collision texts nor the final texts

#### Scenario: Pre-language texts use the ambient language

- **WHEN** the coordinator writes context around a pinned preflight text before a working language is selected
- **THEN** the pinned text stays verbatim and the surrounding context is written in the ambient conversation language
