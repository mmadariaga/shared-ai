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

### Requirement: Preserve Direct Build (unattended) behavior

Selecting Direct Build - Unattended SHALL preserve the direct implementation, functional-fix, backfill, archive, and exactly-one-local-commit order. Its route identity SHALL be `direct-build-unattended`, and its panel projection SHALL contain only Build/Implement, Backfill, and Archive.

#### Scenario: Build uses the existing closed flow

- **WHEN** Direct Build - Unattended is selected for an eligible slice
- **THEN** the existing eight-step Direct Build flow remains authoritative without re-entering `/sai-build` or `meta-build`.

### Requirement: Preserve Manual and fast-track gates
Selecting Manual or an unmapped response SHALL use route identity manual, SHALL dispatch no worker, SHALL change no supervision state, and SHALL emit the closing path handoff plus the keep-window-open recommendation exactly once only after Manual selection, never before the selector and never in the emission turn. Selecting Plan - Unattended or Direct Build - Unattended SHALL never emit handoff or recommendation. Fast-track SHALL NOT auto-select or suppress the handoff or the selector.

#### Scenario: Manual remains non-dispatching
- **WHEN** Manual or an unmapped response is received from the same-turn selector
- **THEN** no worker dispatches and the handoff plus recommendation emits once after selection with no second selector

### Requirement: Preserve slice selection and retry behavior
Plan and Direct Build SHALL select only the first pending slice from last_crystallization_set in crystallization order and SHALL NOT present a slice-name picker. Empty-set, completed-set, and single-change handling is preserved with no repository discovery or re-sorting. After a clean Direct Build slice completion with pending slices, the flow SHALL resolve the authoritative continuation state to auto_continue or route_choice. Failed, cancelled, STOP-bearing, coordinator-disproved, or unrecovered results SHALL leave the active route pending and retryable without starting a later route step.

#### Scenario: Build re-enters for a pending slice
- **WHEN** a Direct Build slice completes cleanly while another crystallized slice remains pending
- **THEN** the authoritative continuation state resolves before any new dispatch begins.

#### Scenario: First pending runs without a name picker
- **WHEN** multiple uncompleted slices remain pending in crystallization order
- **THEN** the first pending slice runs and no slice-name picker is presented.

### Requirement: Emit the crystallization-close selector
`sai-explore` SHALL emit exactly one harness-native selector same-turn after the Ready to Propose block or blocks ending at the separator plus the recordedList emit, with options in fixed order Plan - Unattended, Direct Build - Unattended, and Manual, each retaining its existing one-line description, with no prior handoff and no prior recommendation, as the final emission of the crystallization turn. The selector contract SHALL be delivered from the route-selector step for same-turn presentation.

#### Scenario: the split selector closes crystallization
- **WHEN** a single-change or sliced crystallization turn reaches its close with same-turn blocks
- **THEN** exactly one fixed-order three-option selector emits as the final turn output with no prior handoff

### Requirement: Route selected pipeline options through deferred contracts
Sai-explore SHALL preserve exclusive dispatch for initial route choices: only an explicit Plan - Unattended or Direct Build - Unattended selection dispatches from the route selector, and Manual and unmapped responses SHALL dispatch nothing from the selector. The sole exception is auto_continue, the previously authorized automatic continuation, which starts the first pending slice as Direct Build without another explicit selection. Pipeline-selector presentation SHALL NOT fetch pipeline-plan-unattended or pipeline-direct-build at presentation. On selection, explore SHALL emit plan or direct-build intent to explore-slice with no slice name and no pick, then consume next.follow and load the named file only when not already loaded. ALREADY_RUNNING SHALL acknowledge the running or parked first slice with no dispatch. NO_PENDING_SLICE SHALL distinguish empty from exhausted inventory with no dispatch. Plan loads pipeline-plan-unattended at sai-1; Direct Build loads pipeline-direct-build at build-implement.

#### Scenario: deferred route fetches preserve dispatch boundaries
- **WHEN** the crystallization-close selector is reached and the user selects Plan - Unattended, Direct Build - Unattended, or Manual
- **THEN** route contracts are not fetched at selector presentation, only the explicitly selected Plan or Direct Build route dispatches, and Manual performs no dispatch

#### Scenario: selector presentation does not fetch route contracts
- **WHEN** the crystallization-close selector is presented
- **THEN** pipeline-plan-unattended.md and pipeline-direct-build.md are not fetched at that presentation

#### Scenario: Plan selection emits plan and loads at sai-1
- **WHEN** the user selects Plan - Unattended and explore-slice@1 has no active slice
- **THEN** explore invokes sai-state emit with the session id and plan intent with no slice name, and loads pipeline-plan-unattended.md only via next.follow when this chat has not already loaded that path

#### Scenario: Missing inventory prompts block-first
- **WHEN** the user selects Direct Build Unattended with no pending crystallized slice and the machine returns rejected NO_PENDING_SLICE
- **THEN** explore acknowledges missing inventory, dispatches nothing, and prompts block-first before any route dispatch

#### Scenario: Route emits carry intent only
- **WHEN** the user selects Plan or Direct Build with no active slice
- **THEN** the emit carries only route intent with no slice name and no pick.

### Requirement: Preserve deterministic Direct Build continuation
After a clean Direct Build slice completion, sai-explore SHALL preserve crystallization order, exclude completed changes, resolve the authoritative continuation state in route-selector, and defer terminal navigation until no pending slice remains. Auto_continue SHALL start the first pending slice as Direct Build with no pick; route_choice SHALL re-present the three-option selector once. Moving the Direct Build text into pipeline-direct-build SHALL NOT change these state or authorization rules.

#### Scenario: pending slices retain explicit authorization
- **WHEN** a Direct Build slice completes cleanly while another crystallized slice remains pending
- **THEN** the authoritative continuation state resolves to auto_continue or route_choice; route_choice dispatches no worker from the transition while auto_continue starts the first pending slice as Direct Build.

#### Scenario: Authorized continuation starts next slice in order
- **WHEN** the continuation state resolves to auto_continue with pending slices remaining
- **THEN** the first pending slice starts as Direct Build with one local commit authorized and no push.

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
Selecting `Manual` SHALL dispatch nothing and SHALL NOT change supervision state. An unmapped free-text answer MUST be treated as `Manual`. The `Manual` branch SHALL emit exactly once the closing path handoff plus the keep-window-open recommendation naming `review-loop` exactly once, with no second selector in that turn. Selecting `Plan - Unattended` or `Direct Build - Unattended` SHALL never emit handoff or recommendation. Selector re-emissions SHALL carry no prior handoff and every new `Manual` selection SHALL re-emit handoff plus recommendation once. The literals `/sai-1-spec`, `/sai-2-design`, and `review-loop` SHALL remain verbatim English.

#### Scenario: Manual is selected
- **WHEN** the user selects `Manual`
- **THEN** no worker is dispatched and the closing path handoff plus recommendation emits once with no second selector

#### Scenario: free text maps to Manual
- **WHEN** the user's answer maps to neither selector option
- **THEN** it is treated as `Manual` with once-only handoff plus recommendation and no second selector

#### Scenario: Manual is requested again later
- **WHEN** the user later asks to see or run the supervised pipeline selector
- **THEN** `sai-explore` re-emits the selector with no prior handoff and each new `Manual` re-emits handoff plus recommendation once

### Requirement: Preserve explicit gating
Fast-track SHALL NOT auto-select Plan - Unattended or Direct Build - Unattended and SHALL NOT suppress the selector or the emission-turn neutrality with no handoff in the emission turn. Selector text SHALL follow language localization while review-loop, /sai-1-spec, and /sai-2-design MUST remain English literals.

#### Scenario: fast-track does not bypass route selection
- **WHEN** fast-track is active at crystallization close
- **THEN** the selector is still presented with no auto-selection, no emission-turn handoff, and unchanged command literals

### Requirement: Direct Build continuation requests authorization for each pending slice
The system SHALL ask the one-time Direct Build continuation question once per crystallization set when Direct Build is chosen with more than one pending slice, even if earlier slices used Manual or Plan, and SHALL keep the yes or no answer for the whole set. Despite the title wording for each pending slice, consent is once per set: later slices reuse the stored answer and are never re-asked for the same set. Continuation choices SHALL exclude completed slices and preserve crystallization order. Answer yes SHALL resolve to auto_continue; answer no or a queued route request SHALL resolve to route_choice. Selecting Manual on a continuation selector SHALL dispatch nothing and preserve pending and completed state.

#### Scenario: pending slices remain after clean completion
- **WHEN** a clean Direct Build slice completes and pending_slices is non-empty
- **THEN** the stored continuation answer resolves to auto_continue or route_choice before another slice starts.

#### Scenario: fast-track reaches selector presentation
- **WHEN** --fast-track is active or the crystallization turn is non-English
- **THEN** the selector is still explicitly asked with localized prose and unchanged command literals.

#### Scenario: One-time consent with queued change applies after current slice
- **WHEN** an explicit chat-stated yes, no, or route request arrives during an active slice
- **THEN** it queues without interrupting the slice and applies after the clean terminal result.

### Requirement: Obsolete token forms dispatch nothing

No token or dominant-intent form SHALL dispatch supervision. When a user sends or discusses the retired `start-pipeline` token, explore SHALL perform no token-based dispatch; supervised execution remains reachable only through selector re-emission or manual continuation.

#### Scenario: obsolete token is sent

- **WHEN** a user sends or discusses `start-pipeline` after crystallization
- **THEN** explore performs no token-based dispatch and requires selector re-emission or manual continuation.

### Requirement: Auto dispatch source is the last crystallization set
A Plan or Direct Build selection SHALL operate only on uncompleted change names in last_crystallization_set in emission order and SHALL route only the first pending entry. It SHALL use completed_changes and specs_converged_changes to route the spec or design retry. It SHALL NOT discover repository changes, add an uncrystallized change, present a multi-change picker with Cancel, or re-sort names. Each selection SHALL select and dispatch at most one change.

#### Scenario: multiple uncompleted changes remain
- **WHEN** last_crystallization_set contains multiple uncompleted changes and the user selects Plan - Unattended
- **THEN** explore routes only the first pending change in emission order with no name picker
- **AND** only that first pending change is dispatched
- **AND** no untracked repository change is included.

#### Scenario: one uncompleted change remains
- **WHEN** exactly one entry of last_crystallization_set is uncompleted and the user selects Plan - Unattended
- **THEN** explore identifies that change and dispatches it without a redundant selection picker.

#### Scenario: user cancels selection
- **WHEN** multiple uncompleted changes remain and the user declines the route choice or sends unmapped free text without consenting to a route
- **THEN** no slice-name picker is presented for slice selection, no slice is routed, no worker dispatches, and the Manual branch emits its closing handoff with route_mode recorded as manual.

#### Scenario: failed Auto remains retryable from existing state
- **WHEN** a Plan attempt fails or is cancelled before its applicable terminal worker completes
- **THEN** the name remains absent from completed_changes
- **AND** a later Plan selection reuses last_crystallization_set and the existing specs_converged_changes membership to route the retry
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

### Requirement: Authorize Direct Build - Unattended dispatch

Selecting **Direct Build - Unattended** SHALL be the explicit user act that authorizes the delegated-write exception for the Direct Build workers AND pre-authorizes exactly one local commit executed by the archive worker inside its closed order; it SHALL remain consent to selection and dispatch only, never consent to answer a later worker question. Neither this option nor any other selection loads or dispatches anything unless selected; Manual and every other command surface are unaffected by the third option.

#### Scenario: Consent scope of the fast-lane selection

- **WHEN** the user selects Direct Build - Unattended on the crystallization-close selector
- **THEN** delegated writes are consented for the Direct Build workers and exactly one local commit is pre-authorized, with no other command surface affected.

### Requirement: Selector fires once at end only with same-turn block
The pipeline selector SHALL fire only when blocks with separators were emitted in the same turn, exactly once at the end through the native picker. It SHALL carry the fixed titles Plan - Unattended, Direct Build - Unattended, and Manual in identical block-first order on Claude Code and opencode, with no handoff and no recommendation in the emission turn.

#### Scenario: Selector gated on same-turn block
- **WHEN** a crystallization turn ends with same-turn blocks and no emission-turn handoff
- **THEN** exactly one native-picker selector with the three fixed titles emits as the final emission

### Requirement: Direct Build enters only via stage-machine emit and follow
Direct Build selection SHALL enter only through emit of intent direct-build to `explore-slice@1` plus `next.follow` to `pipeline-direct-build.md`. It SHALL never enter via an ad-hoc Temp script or any other helper path.

#### Scenario: Direct Build uses stage-machine route
- **WHEN** the user selects Direct Build - Unattended from a valid same-turn selector
- **THEN** the flow emits direct-build intent and follows to the Direct Build contract without loading a Temp helper script
