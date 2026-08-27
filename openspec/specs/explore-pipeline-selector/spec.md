# explore-pipeline-selector Specification

## Purpose

Define the crystallization-close selector that explicitly authorizes supervised pipeline execution.
## Requirements

### Requirement: Crystallization-close selector presents stable route titles

The crystallization-close selector SHALL present exactly three options, in the existing order, with the fixed English titles `Plan - Unattended`, `Direct Build - Unattended`, and `Manual`. Their machine-readable route identities MUST remain `plan-unattended`, `direct-build-unattended`, and `manual`.

#### Scenario: Selector presents the three continuation routes

- **WHEN** a crystallization turn reaches its close
- **THEN** the selector presents the three fixed titles in order and preserves their renamed route identities without adding aliases or changing dispatch behavior.

### Requirement: Preserve Plan (unattended) behavior

Selecting Plan - Unattended SHALL dispatch only the existing supervised sai-1 and sai-2 workers, preserve their worker-owned scopes and review lifecycle, and stop before sai-3 or code implementation.

#### Scenario: Plan stops before implementation

- **WHEN** Plan - Unattended completes its supervised sai-1 and sai-2 lifecycle
- **THEN** it emits the existing `/sai-build` handoff without dispatching an implementation phase.

### Requirement: Preserve Build (unattended) behavior

Selecting Direct Build - Unattended SHALL preserve the direct implementation, functional-fix, backfill, archive, and exactly-one-local-commit order. Its route identity SHALL be `direct-build-unattended`, and its panel projection SHALL contain only Build/Implement, Backfill, and Archive.

#### Scenario: Build uses the existing closed flow

- **WHEN** Direct Build - Unattended is selected for an eligible slice
- **THEN** the existing eight-step Direct Build flow remains authoritative without re-entering `/sai-build` or `meta-build`.

### Requirement: Preserve Manual and fast-track gates

Selecting Manual or an unmapped response SHALL use route identity `manual`, dispatch no worker, change no supervision state, and emit the existing path-specific `/sai-1-spec` handoff once. `--fast-track` MUST NOT select or suppress the selector.

#### Scenario: Manual remains non-dispatching

- **WHEN** Manual or an unmapped response is received
- **THEN** only the existing handoff is emitted and later execution remains an explicit user action.

### Requirement: Preserve slice selection and retry behavior

Plan and Direct Build SHALL select only uncompleted names from `last_crystallization_set` in crystallization order, SHALL preserve the existing empty-set, completed-set, single-change, multi-change, and Cancel behavior, and SHALL never discover or reorder repository changes. After a clean Direct Build slice completion with pending slices, the full three-option selector MUST be re-presented as a new per-slice authorization gate. Failed, cancelled, STOP-bearing, coordinator-disproved, or unrecovered results SHALL leave the active route pending and retryable without starting a later route step.

#### Scenario: Build re-enters for a pending slice

- **WHEN** a Direct Build slice completes cleanly while another crystallized slice remains pending
- **THEN** the selector is presented again in fixed order for the pending slice before any new dispatch begins.

### Requirement: Emit the crystallization-close selector

`sai-explore` SHALL emit exactly one harness-native selector after the shared keep-window-open recommendation, with options in fixed order: `Plan - Unattended`, `Direct Build - Unattended`, and `Manual`, each retaining its existing one-line description and localized presentation rules. The first displayed label SHALL map to internal route `plan-unattended` and SHALL state that only supervised `sai-1` and `sai-2` run. The selector SHALL remain the final emission of the crystallization turn. The selector contract SHALL be delivered from `sai/commands/explore/steps/pipeline-selector.md`, fetched only after the complete shared recommendation sentence.

#### Scenario: the split selector closes crystallization

- **WHEN** a single-change, sliced, or inline-refusal crystallization turn reaches its close
- **THEN** the shared recommendation is emitted once, `pipeline-selector.md` is fetched, and exactly one fixed-order three-option selector is emitted as the final turn output.

### Requirement: Route selected pipeline options through deferred contracts

`sai-explore` SHALL preserve the existing selection semantics: `pipeline-selector.md` SHALL fetch both `steps/pipeline-plan-unattended.md` and `steps/pipeline-direct-build.md` after the complete selector contract is reached and before option selection is processed; dispatch SHALL remain exclusive to an explicit `Plan - Unattended` or `Direct Build - Unattended` selection; and `Manual` and unmapped responses SHALL dispatch nothing. The displayed Plan route SHALL map to `plan-unattended` and retain the supervised `sai-1`/`sai-2` lifecycle, while the Direct Build - Unattended route SHALL retain the fixed eight-step flow and existing worker boundaries.

#### Scenario: deferred route fetches preserve dispatch boundaries

- **WHEN** the crystallization-close selector is reached and the user selects Plan - Unattended, Direct Build - Unattended, or Manual
- **THEN** both route contracts have been fetched from the selector trigger, only the explicitly selected Plan or Direct Build route dispatches, and Manual performs no dispatch.

### Requirement: Preserve deterministic auto-fast continuation

After a clean Direct Build slice completion, `sai-explore` SHALL retain the existing selector re-entry behavior for pending slices, preserve crystallization order, exclude completed changes, and defer terminal navigation until no pending slice remains. Moving the Direct Build text into `pipeline-direct-build.md` SHALL NOT change these state or authorization rules.

#### Scenario: pending slices retain explicit authorization

- **WHEN** a Direct Build slice completes cleanly while another crystallized slice remains pending
- **THEN** the complete three-option selector is presented again for the pending slice without dispatching a worker from the transition.

### Requirement: Authorize Auto dispatch

Selecting displayed `Plan - Unattended` SHALL authorize the existing supervised `sai-1` and `sai-2` lifecycle using `last_crystallization_set` while preserving worker-owned writes, review rounds, chaining, retries, and the existing worker boundaries. Successful Plan - Unattended completion SHALL emit exactly one composition-aware next-step line, `Next step: run /sai-build {name}.`, and SHALL NOT dispatch a later implementation phase. Successful Plan - Unattended completion SHALL NOT emit the obsolete `sai-3 was not run.` text. When a selected Plan - Unattended run returns `failed` or `cancelled`, explore SHALL emit exactly one localized user-facing guidance line naming the phase at which the run stopped: `/sai-1-spec` when the selected name was routed to the spec phase because it was absent from `specs_converged_changes`, or `/sai-2-design` when it was routed to a design-phase retry because it was present in `specs_converged_changes` and absent from `completed_changes`. The phase-specific line SHALL not dispatch a later implementation phase, change the retry state, or introduce another state key.

#### Scenario: Auto is selected

- **WHEN** the user selects Plan - Unattended from the crystallization-close selector
- **THEN** the supervisor selects at most one eligible latest-turn change and dispatches the existing phase machinery without expanding write scope.

#### Scenario: Auto reaches a successful terminal state

- **WHEN** the selected Plan run completes its applicable supervised `sai-1` and `sai-2` lifecycle successfully
- **THEN** explore reports the completed supervised run, emits exactly one `Next step: run /sai-build {name}.` line, emits no `sai-3 was not run.` text, and does not dispatch a later implementation phase.

#### Scenario: Auto fails or is cancelled

- **WHEN** the selected Plan run returns `failed` or `cancelled`
- **THEN** explore does not facilitate a later implementation phase, emits exactly one localized guidance line naming the applicable stopped phase, and the change remains retryable under the existing Plan state rules.

### Requirement: Define Manual behavior

Selecting `Manual` SHALL dispatch nothing and SHALL NOT change supervision state. An unmapped free-text answer MUST be treated as `Manual`. The `Manual` branch SHALL refer to the one existing keep-window recommendation already emitted before the selector, naming `review-loop` exactly once; it SHALL not emit a second recommendation or selector for the same answer. After the selector response, the branch SHALL emit the path-specific existing next-step handoff exactly once. The literals `/sai-1-spec`, `/sai-2-design`, and `review-loop` SHALL remain verbatim English; surrounding handoff prose SHALL follow the selected crystallization language. `Manual` SHALL remain re-invocable without a cap when the user later asks to see or run the supervised pipeline selector; each such later Manual/unmapped response SHALL receive its own one-time path-specific handoff.

#### Scenario: Manual is selected

- **WHEN** the user selects `Manual`
- **THEN** no pipeline worker is dispatched
- **AND** no supervision state is changed
- **AND** the already-emitted keep-window recommendation remains the sole recommendation naming `review-loop` exactly once
- **AND** no second recommendation or selector is emitted for the same answer
- **AND** the applicable path-specific `/sai-1-spec` next-step handoff is emitted exactly once after the selector response.

#### Scenario: free text maps to Manual

- **WHEN** the user's answer maps to neither selector option
- **THEN** it is treated as `Manual`
- **AND** no worker is dispatched
- **AND** the already-emitted keep-window recommendation remains the sole recommendation naming `review-loop` exactly once
- **AND** no second recommendation or selector is emitted for the same answer
- **AND** the applicable path-specific `/sai-1-spec` next-step handoff is emitted exactly once after the selector response.

#### Scenario: Manual is requested again later

- **WHEN** the user later asks to see or run the supervised pipeline selector
- **THEN** `sai-explore` re-emits the selector through the existing rule
- **AND** there is no cap on such re-emissions.

### Requirement: Preserve explicit gating

`--fast-track` SHALL NOT auto-select Plan - Unattended or suppress the selector. Selector text SHALL follow language localization while `review-loop`, `/sai-1-spec`, and `/sai-2-design` MUST remain English literals.

#### Scenario: fast-track does not bypass route selection

- **WHEN** `--fast-track` is active at crystallization close
- **THEN** the renamed selector is still presented and its command literals remain unchanged.

### Requirement: Auto-fast continuation requests authorization for each pending slice

After a clean Direct Build slice completion, the system SHALL re-present the complete `Plan - Unattended` / `Direct Build - Unattended` / `Manual` selector when at least one pending slice remains. Continuation choices SHALL exclude completed slices and preserve crystallization order. Selecting Manual SHALL dispatch nothing and preserve pending and completed state for a later explicit request.

#### Scenario: pending slices remain after clean completion

- **WHEN** a clean Direct Build slice completes and `pending_slices` is non-empty
- **THEN** the full selector is presented exactly once before another slice starts.

#### Scenario: fast-track reaches selector presentation

- **WHEN** `--fast-track` is active or the crystallization turn is non-English
- **THEN** the selector is still explicitly asked with localized prose and unchanged command literals.

### Requirement: Obsolete token forms dispatch nothing

No token or dominant-intent form SHALL dispatch supervision. When a user sends or discusses the retired `start-pipeline` token, explore SHALL perform no token-based dispatch; supervised execution remains reachable only through selector re-emission or manual continuation.

#### Scenario: obsolete token is sent

- **WHEN** a user sends or discusses `start-pipeline` after crystallization
- **THEN** explore performs no token-based dispatch and requires selector re-emission or manual continuation.

### Requirement: Auto dispatch source is the last crystallization set

A `Plan - Unattended` selection SHALL operate only on uncompleted change names in `last_crystallization_set` — the ordered, duplicate-free `**Change name**` values emitted by the most recent crystallization turn, in emission order. It SHALL use the existing `completed_changes` and `specs_converged_changes` values to determine whether the selected name starts at the spec phase or retries the design phase. It SHALL NOT discover active changes from the repository, infer a change from unrelated files, add a change that was not crystallized in the current chat, or introduce another state key. Each Plan selection SHALL select and dispatch at most one change.

#### Scenario: multiple uncompleted changes remain

- **WHEN** `last_crystallization_set` contains multiple uncompleted changes and the user selects Plan - Unattended
- **THEN** explore presents a harness-native single-select picker containing those changes in emission order plus `Cancel`
- **AND** only the selected change is dispatched
- **AND** no untracked repository change is included.

#### Scenario: one uncompleted change remains

- **WHEN** exactly one entry of `last_crystallization_set` is uncompleted and the user selects Plan - Unattended
- **THEN** explore identifies that change and dispatches it without a redundant selection picker.

#### Scenario: user cancels selection

- **WHEN** the user selects `Cancel` from the multi-change picker
- **THEN** explore dispatches no worker and leaves every state value unchanged.

#### Scenario: failed Auto remains retryable from existing state

- **WHEN** a Plan attempt fails or is cancelled before its applicable terminal worker completes
- **THEN** the name remains absent from `completed_changes`
- **AND** a later Plan selection reuses `last_crystallization_set` and the existing `specs_converged_changes` membership to route the retry
- **AND** no new state key or repository discovery is used.

### Requirement: Empty or completed selection set receives an explicit acknowledgement

When Plan - Unattended is selected while `last_crystallization_set` is empty or contains no uncompleted change, explore SHALL perform no dispatch and SHALL explicitly report the applicable reason. Silence is not an acceptable response.

#### Scenario: Auto is selected in a chat that crystallized nothing

- **WHEN** the user selects Plan - Unattended before any change name was crystallized in the current chat
- **THEN** explore acknowledges that there is no crystallized change and dispatches no worker.

#### Scenario: every change of the last crystallization turn completed

- **WHEN** the user selects Plan - Unattended after every change of the last crystallization turn completed supervised execution
- **THEN** explore acknowledges that every change is already completed and dispatches no duplicate worker.

### Requirement: Active supervision rejects duplicate starts

An active supervised run SHALL begin when the user confirms a picker selection, or when explore identifies the sole uncompleted change immediately before dispatch. It SHALL remain active through spec-worker execution and continuation, the in-session review rounds, machine-feedback processing, the supervised gate application point (shared gate with `mode = supervised`, which auto-executes next-action without a user-facing picker), the phase transition, and — when the spec phase converges or ends by cap exhaustion — the chained design phase including its worker execution and continuation, its in-session review rounds, machine-feedback processing, the supervised design gate application point (same shared gate with `mode = supervised`), and post-gate overview generation. The interval SHALL end only when the chained design phase terminates, or, when a failed or cancelled spec worker stops the run before design, when that spec attempt completes, fails, or is cancelled. While that interval is active, another Plan selection SHALL receive an explicit already-running acknowledgement and SHALL NOT create a concurrent or queued duplicate run.

#### Scenario: Auto is selected during an active run

- **WHEN** the user selects Plan - Unattended while supervision is already active
- **THEN** explore reports that the pipeline is already running
- **AND** it creates no additional dispatch or queue entry.

#### Scenario: Auto is selected during the chained design phase

- **WHEN** the user selects Plan - Unattended while the chained design phase of an active run is executing
- **THEN** explore reports that the pipeline is already running
- **AND** it creates no additional dispatch or queue entry.

#### Scenario: interval ends after the design phase terminates

- **WHEN** the spec phase converged or ended by cap exhaustion and the chained design phase reaches its terminal outcome
- **THEN** the active-supervision interval ends
- **AND** a later Plan selection is eligible to begin a new run.

#### Scenario: active interval includes supervised gate application, not a user-facing picker

- **WHEN** a supervised spec or design review round resolves the deferred-gate condition while a run is active
- **THEN** the active-supervision interval remains active across the supervised gate application point
- **AND** no user-facing artifact feedback picker is presented.

### Requirement: Copilot acknowledges unavailable supervision

On GitHub Copilot, a Plan - Unattended selection SHALL dispatch no spec worker or reviewer and SHALL reply that pipeline supervision is unavailable on this harness, so the shared instruction contains no harness-conditional selector emission. All other Copilot explore behavior SHALL remain unchanged.

#### Scenario: Copilot user selects Auto

- **WHEN** the user selects Plan - Unattended in a GitHub Copilot explore session
- **THEN** explore replies that supervision is unavailable on this harness
- **AND** it performs no worker dispatch and no artifact write.

### Requirement: Re-crystallization supersedes prior lifecycle state

A crystallization turn that re-emits an already-supervised change name SHALL, when replacing `last_crystallization_set`, remove every name in the new set from `completed_changes` and `specs_converged_changes`, so a later Plan - Unattended selection dispatches the spec phase over the new block instead of acknowledging the change as completed or entering a design-phase retry over superseded specs.

#### Scenario: a completed change is re-crystallized

- **WHEN** a change name in `completed_changes` is re-emitted by a later crystallization turn and the user selects Plan - Unattended
- **THEN** explore dispatches the spec worker over the newly emitted block
- **AND** it does not acknowledge the change as already completed.

#### Scenario: a specs-converged change is re-crystallized

- **WHEN** a change name in `specs_converged_changes` but not `completed_changes` is re-emitted by a later crystallization turn and the user selects Plan - Unattended
- **THEN** explore dispatches the spec phase over the new block rather than the design-phase retry branch.

### Requirement: Authorize Build - Unattended dispatch

Selecting **Direct Build - Unattended** SHALL be the explicit user act that authorizes the delegated-write exception for the Direct Build workers AND pre-authorizes exactly one local commit executed by the archive worker inside its closed order; it SHALL remain consent to selection and dispatch only, never consent to answer a later worker question. Neither this option nor any other selection loads or dispatches anything unless selected; Manual and every other command surface are unaffected by the third option.

#### Scenario: Consent scope of the fast-lane selection

- **WHEN** the user selects Direct Build - Unattended on the crystallization-close selector
- **THEN** delegated writes are consented for the Direct Build workers and exactly one local commit is pre-authorized, with no other command surface affected.
