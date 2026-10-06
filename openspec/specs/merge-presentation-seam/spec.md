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

The seam SHALL validate that the strategy source covers the whole affected conflict set with Facts, Inferences, objectives, trade-offs, risks, contracts, and alternatives, and SHALL print it before the mode-specific application hand-off. Normal mode SHALL require `apply-strategy` before resolution writes or marker removal. Fast-track SHALL present the complete validated strategy before the coordinator continues the same worker to apply it, without a picker or recorded user answer. Staging SHALL remain unavailable until a matching complete payload passes validation and post-resolution review. Strategies without a valid resolution SHALL stop or escalate in either mode.

#### Scenario: Revision remains mutation-free

- **WHEN** the user requests a strategy revision in normal mode
- **THEN** no write, marker removal, staging, or commit occurs during revision before the rebuilt strategy is approved

#### Scenario: Fast-track presentation precedes resolution

- **WHEN** the worker returns a complete strategy as a fast-track `completed` result
- **THEN** the coordinator validates and prints it before issuing the same-worker application continuation, and the strategy-only result is not terminal navigation

### Requirement: Resolution-payload validation precedes staging

The coordinator MUST NOT stage until the original received result and its payload pass atomic validation: one record per affected conflicted file, exact paths and categories, valid source and complete captured regions, decisions matching the confirmed strategy, no markers in authored text, valid snapshot identity, and preserved outside-region and unrelated content. The post-resolution independent review MUST also confirm the tree matches the confirmed strategy. Mechanical checks SHALL supplement rather than replace that review. Any selected public report SHALL remain separate from the original validation source.

#### Scenario: Invalid payload is rejected before review

- **WHEN** any payload record is missing, duplicated, outside the affected file set, miscategorized, has an invalid source, lacks required regions, holds a marker, or states a decision the strategy did not
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

Immediately before the invocation-authorized local finalization operation, the seam SHALL render the method, target branch, source branch, verification status, conflict result, collision result, and staged-file count as ordinary text, keeping staged paths in coordinator state for staging and failure reporting. No finalization picker SHALL be presented. Missing automated verification SHALL be rendered as unavailable, not passed.

#### Scenario: Authorization uses compact context

- **WHEN** a local finalization operation is ready after final staging
- **THEN** the user sees the compact finalization summary without a staged-file list or approval options before the coordinator executes the operation

### Requirement: Adaptive merge TODO follows the TODO policy

The coordinator MAY render the adaptive merge TODO after method and branch selection, following the canonical item ids, labels, order, route transitions, and panel ownership of `sai/policies/todo-structure.md` § Merge adaptive TODO. A conflicted route SHALL use `contextual-analysis` and `resolve-full`, not a scope-selection or category-specific resolution item. Applicable local operations SHALL use `finalization` with `Finalize merge commit`, `Continue rebase`, or `Commit collision repair`; completion SHALL be marked only after the corresponding operation succeeds. Verification completion SHALL distinguish passed, unavailable, and cap-exhausted outcomes. The TODO MUST NOT synthesize a worker progress plan, authorize mutations, or alter worker continuation or mutation ownership.

#### Scenario: Empty frontier removes collision work

- **WHEN** no source-introduced record survives in the final integration state
- **THEN** the coordinator records `not-applicable` and renders no collision item

#### Scenario: Full-scope conflict progress is mode-independent

- **WHEN** a conflicted route begins after the language hand-off in either mode
- **THEN** contextual analysis is in progress with full resolution pending and no scope-selection item

#### Scenario: Failed finalization is not completed work

- **WHEN** the local finalization operation fails
- **THEN** its task remains incomplete until terminal clearing and the exact repository state is retained for reporting

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

The Claude Code and opencode projections MUST preserve the same worker-source fidelity, remaining option values and order, mode-specific strategy and revision behavior, payload validation boundary, TODO transitions, compact finalization summary, unavailable-verification reporting, failure-state reporting, and terminal semantics; only the native question and task-list mechanisms differ.

#### Scenario: Seam behavior is equivalent across harnesses

- **WHEN** an identical worker result is routed through either projection in the same mode
- **THEN** both render the same information and remaining decision content and preserve the same application, local finalization, and terminal behavior

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

The coordinator SHALL retain and validate the original received worker source bytes, not a reconstructed envelope with a shortened summary or substituted fields. A newly reported `Mechanical evidence` appendix SHALL carry exact receipt action, record reference, and checksum entries for coordinator verification and retention; it SHALL remain internal evidence rather than part of the selected user-facing report. Replacement state SHALL carry the complete retained reference inventory. Presentation selection SHALL NOT change validation input or authorize a mutation.

#### Scenario: Presentation is not validator input

- **WHEN** the seam selects a compact application or verification report
- **THEN** validation continues to use the untouched original worker result and exact evidence references rather than the selected display text

#### Scenario: Receipt appendix is retained without public repetition

- **WHEN** a worker first reports a new external receipt
- **THEN** the coordinator verifies its complete record and checksum, retains its reference for reconstruction, and excludes the technical appendix from the selected public stage report

### Requirement: Self-sufficient merge closure

The closing worker summary SHALL identify method and branch direction, the actual operation and resulting HEAD or exact pending state, verification status, conflict and collision disposition, and unresolved matters. It SHALL explain new decisions, failures, and state changes without repeating settled strategy explanations. On a partial failure it SHALL identify completed operations, the failed operation and error, staged and pending paths, current HEAD, merge or rebase state, and unresolved verification or collision findings. New evidence hand-offs SHALL occur before terminal navigation so the closing summary can be forwarded verbatim.

#### Scenario: Successful closure retains necessary outcomes

- **WHEN** integration finalization succeeds
- **THEN** the closing summary states its operation and resulting HEAD, branches, verification outcome, conflict and collision results, and remaining matters without repeating the strategy explanation

#### Scenario: Partial failure reports exact repository state

- **WHEN** a Git operation fails after earlier operations succeeded
- **THEN** closure distinguishes completed and failed operations and reports current HEAD, staged and pending paths, operation state, and unresolved findings without claiming successful finalization
