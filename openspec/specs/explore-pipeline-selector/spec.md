# explore-pipeline-selector Specification

## Purpose

Define the crystallization-close selector that explicitly authorizes supervised pipeline execution.

## Requirements

### Requirement: Crystallization-close selector presents stable route titles

The deferred route choice SHALL present exactly three options in the existing order through one native single-select picker with the fixed English titles `Plan - Unattended`, `Direct Build - Unattended`, and `Manual`. Their machine-readable route identities MUST remain `plan-unattended`, `direct-build-unattended`, and `manual`. Claude Code SHALL use `AskUserQuestion` and opencode SHALL use the `question` tool. Only an exact returned picker label SHALL select a route; typed text outside the picker, cancellation, an absent response, `Other` or free-text, and answers that map to zero or multiple options SHALL select no route.

#### Scenario: Selector presents the three continuation routes

- **WHEN** the native picker returns exactly one of the three fixed route titles
- **THEN** the matching route identity is selected without adding aliases or changing downstream dispatch behavior

### Requirement: Preserve Plan (unattended) behavior

Selecting Plan - Unattended SHALL dispatch only the existing supervised sai-1 and sai-2 workers, preserve their worker-owned scopes and review lifecycle, and stop before sai-3 or code implementation.

#### Scenario: Plan stops before implementation

- **WHEN** Plan - Unattended completes its supervised sai-1 and sai-2 lifecycle
- **THEN** it emits the existing `/sai-build` handoff without dispatching an implementation phase.

### Requirement: Preserve Direct Build (unattended) behavior

Selecting Direct Build - Unattended SHALL preserve the direct implementation, functional-fix, suite-gate, backfill, archive, and exactly-one-local-commit order. Its route identity SHALL be `direct-build-unattended`, and its panel projection SHALL contain only Build/Implement, Backfill, and Archive.

#### Scenario: Build uses the existing closed flow

- **WHEN** Direct Build - Unattended is selected for an eligible slice
- **THEN** the existing eight-step Direct Build flow remains authoritative without re-entering `/sai-build` or `meta-build`.

### Requirement: Preserve Manual and fast-track gates

Selecting Manual SHALL use route identity `manual`, SHALL dispatch no worker, SHALL change no supervision state, and SHALL emit the closing path handoff plus keep-window-open recommendation exactly once only after the native picker returns the exact `Manual` label. A cancelled, absent, free-text, or unmapped response SHALL not be treated as Manual and SHALL preserve the pending route choice. Fast-track SHALL not auto-select or suppress the native route choice.

#### Scenario: Manual remains non-dispatching

- **WHEN** the native picker explicitly returns `Manual`
- **THEN** no worker dispatches and the handoff plus recommendation emits once with no second route choice

### Requirement: Preserve slice selection and retry behavior

Plan and Direct Build SHALL select only the first pending slice from `last_crystallization_set` in crystallization order and SHALL NOT present a slice-name picker. Empty-set, completed-set, and single-change handling is preserved with no repository discovery or re-sorting. After a clean Direct Build slice completion with pending slices, the flow SHALL resolve the authoritative continuation state to `auto_continue` or `route_choice`; `route_choice` SHALL present a fresh native picker and SHALL wait for its valid answer. Failed, cancelled, STOP-bearing, coordinator-disproved, or unrecovered results SHALL leave the active route pending and retryable without starting a later route step.

#### Scenario: Build re-enters for a pending slice
- **WHEN** a Direct Build slice completes cleanly while another crystallized slice remains pending
- **THEN** the authoritative continuation state resolves before any new dispatch begins and route-choice waits for a valid picker answer

#### Scenario: First pending runs without a name picker

- **WHEN** multiple uncompleted slices remain pending in crystallization order
- **THEN** the first pending slice runs and no slice-name picker is presented

### Requirement: Emit the crystallization-close selector

`sai-explore` SHALL display the complete `Ready to Propose` block or blocks, successfully record `recordedList`, and then follow the returned selector pointer so the native picker can be presented at the end of that assistant turn. It SHALL not emit `route-choice`, select a route, or dispatch in that turn. On a later turn, after a valid picker answer, Explore SHALL emit `{intent: route-choice}` to `explore-slice@1`, follow the returned pointer, and interpret only the recorded picker identity.

#### Scenario: the split selector closes crystallization

- **WHEN** a single-change or sliced crystallization turn reaches its close with same-turn blocks
- **THEN** the turn records inventory before picker presentation, and a later valid picker answer activates the route-selector step without dispatching before validation

### Requirement: Route selected pipeline options through deferred contracts

`sai-explore` SHALL preserve exclusive dispatch for initial route choices: only a valid native picker answer for Plan or Direct Build dispatches from the route selector, and Manual, cancelled, absent, free-text, and ambiguous answers dispatch nothing. The selector presentation SHALL not fetch `pipeline-plan-unattended.md` or `pipeline-direct-build.md`. After a valid picker answer, Explore SHALL emit `plan` or `direct-build` intent to `explore-slice` with no slice name and no pick, then consume `next.follow` and load the named file only when not already loaded. `ALREADY_RUNNING` SHALL acknowledge an active route with no dispatch. `PARKED_IN_OTHER_MODE` SHALL acknowledge that the first pending slice must resume in its parked mode, with no later slice bypass or dispatch. `NO_PENDING_SLICE` SHALL distinguish empty from exhausted inventory with no dispatch; an empty inventory SHALL prompt block-first before any route dispatch. Plan loads `pipeline-plan-unattended.md` at `sai-1`; Direct Build loads `pipeline-direct-build.md` at `build-implement`.

#### Scenario: deferred route fetches preserve dispatch boundaries

- **WHEN** the native picker returns Plan, Direct Build, or Manual
- **THEN** route contracts are not fetched before route interpretation, only Plan or Direct Build dispatches, and Manual performs no dispatch

#### Scenario: selector presentation does not fetch route contracts

- **WHEN** the route-selector step is exposed after successful inventory recording and presents the native picker
- **THEN** pipeline-plan-unattended.md and pipeline-direct-build.md are not fetched at that presentation

#### Scenario: Plan selection emits plan and loads at sai-1

- **WHEN** the native picker returns `Plan - Unattended` and explore-slice@1 has no active slice
- **THEN** Explore invokes the machine with Plan intent and no slice name, and loads pipeline-plan-unattended.md only through `next.follow` at `sai-1`

#### Scenario: Missing inventory prompts block-first

- **WHEN** a valid Direct Build picker answer is received but there is no pending crystallized slice and the machine returns rejected `NO_PENDING_SLICE`
- **THEN** Explore acknowledges missing inventory, dispatches nothing, and prompts block-first

#### Scenario: Route emits carry intent only

- **WHEN** the native picker returns Plan or Direct Build with no active slice
- **THEN** the emit carries only the route intent with no slice name and no pick

### Requirement: Preserve deterministic Direct Build continuation

After a clean Direct Build slice completion, Explore SHALL preserve crystallization order, exclude completed changes, and resolve the authoritative continuation state to `auto_continue` or `route_choice`. `auto_continue` SHALL start the first pending slice as Direct Build by emitting `intent: auto-continue` with no pick. `route_choice` SHALL present a fresh native picker and SHALL start no later slice until a valid picker answer arrives. Failed, cancelled, incomplete-recovery, coordinator-disproved, or STOP-bearing results SHALL not start a later slice.

#### Scenario: pending slices retain explicit authorization
- **WHEN** a Direct Build slice completes cleanly while another crystallized slice remains pending
- **THEN** the continuation state resolves before another dispatch, and `route_choice` presents a fresh picker whose answer is required before dispatch

#### Scenario: Authorized continuation starts next slice in order

- **WHEN** the continuation state resolves to `auto_continue` with pending slices remaining
- **THEN** the first pending slice starts as Direct Build with one local commit authorized and no push

### Requirement: Authorize Auto dispatch

A valid native picker answer for `Plan - Unattended` SHALL authorize the existing supervised `sai-1` and `sai-2` lifecycle using `last_crystallization_set` while preserving worker-owned writes, review rounds, chaining, retries, and existing worker boundaries. Successful Plan completion SHALL emit the existing `/sai-build {name}` handoff and SHALL not dispatch an implementation phase.

#### Scenario: Auto is selected

- **WHEN** the native picker returns `Plan - Unattended` for an eligible first-pending change
- **THEN** the supervisor selects at most one eligible latest-set change and dispatches the existing phase machinery without expanding write scope

#### Scenario: Auto reaches a successful terminal state

- **WHEN** the selected Plan run completes its applicable supervised sai-1 and sai-2 lifecycle successfully
- **THEN** Explore reports the completed supervised run, emits exactly one `Next step: run /sai-build {name}.` line, emits no `sai-3 was not run.` text, and does not dispatch a later implementation phase

#### Scenario: Auto fails or is cancelled

- **WHEN** the selected Plan run returns `failed` or `cancelled`
- **THEN** Explore does not facilitate a later implementation phase, emits exactly one localized guidance line naming the applicable stopped phase, and leaves the change retryable under the existing Plan state rules

### Requirement: Define Manual behavior

Selecting Manual through the native picker SHALL dispatch nothing and SHALL not change supervision state. A cancelled, absent, free-text, or unmapped picker response SHALL not be treated as Manual. Manual SHALL emit exactly once the closing path handoff plus the keep-window-open recommendation naming `review-loop` exactly once, with no second route choice in that turn.

#### Scenario: Manual is selected

- **WHEN** the native picker returns exactly `Manual`
- **THEN** no worker is dispatched and the closing path handoff plus recommendation emits once with no second route choice

#### Scenario: Ambiguous picker response selects no route

- **WHEN** the picker is cancelled or the returned value maps to neither route option
- **THEN** it is treated as no route selection, the picker is re-presented, and no handoff or worker dispatch occurs

#### Scenario: Manual is requested again later

- **WHEN** the user later asks to see or run the supervised pipeline route choice
- **THEN** Explore presents the native route picker again without a prior handoff, and a subsequent exact Manual answer emits the handoff plus recommendation once

### Requirement: Preserve explicit gating

Fast-track SHALL not auto-select Plan or Direct Build and SHALL not suppress route-choice neutrality after block emission or picker presentation. Route context and descriptions SHALL follow language localization while `Plan - Unattended`, `Direct Build - Unattended`, `Manual`, `review-loop`, `/sai-1-spec`, and `/sai-2-design` remain English literals.

#### Scenario: fast-track does not bypass route selection

- **WHEN** fast-track is active at crystallization close
- **THEN** the native picker remains required with no auto-selection, no emission-turn handoff, and unchanged command literals

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

A valid Plan or Direct Build picker answer SHALL operate only on uncompleted change names in `last_crystallization_set` in emission order and SHALL route only the first pending entry. It SHALL use `completed_changes` and `specs_converged_changes` to route the spec or design retry. It SHALL NOT discover repository changes, add an uncrystallized change, present a multi-change picker with Cancel, or re-sort names. Each valid selection SHALL select and dispatch at most one change.

#### Scenario: multiple uncompleted changes remain

- **WHEN** `last_crystallization_set` contains multiple uncompleted changes and the native picker returns `Plan - Unattended`
- **THEN** Explore routes only the first pending change in emission order with no name picker

#### Scenario: one uncompleted change remains

- **WHEN** exactly one entry of `last_crystallization_set` is uncompleted and the native picker returns `Plan - Unattended`
- **THEN** Explore identifies that change and dispatches it without a redundant selection picker

#### Scenario: user cancels selection

- **WHEN** multiple uncompleted changes remain and the native picker is cancelled, absent, or returns an unmapped value
- **THEN** no slice-name picker is presented, no slice is routed, no worker dispatches, and no Manual route or Manual handoff is recorded

#### Scenario: failed Auto remains retryable from existing state
- **WHEN** a Plan attempt fails or is cancelled before its applicable terminal worker completes
- **THEN** the name remains absent from `completed_changes`, a later valid Plan picker answer reuses `last_crystallization_set` and the existing `specs_converged_changes` membership, and no new state key or repository discovery is used

### Requirement: Empty or completed selection set receives an explicit acknowledgement

When Plan - Unattended is selected while `last_crystallization_set` is empty or contains no uncompleted change, explore SHALL perform no dispatch and SHALL explicitly report the applicable reason. Silence is not an acceptable response.

#### Scenario: Auto is selected in a chat that crystallized nothing

- **WHEN** the user selects Plan - Unattended before any change name was crystallized in the current chat
- **THEN** explore acknowledges that there is no crystallized change and dispatches no worker.

#### Scenario: every change of the last crystallization turn completed

- **WHEN** the user selects Plan - Unattended after every change of the last crystallization turn completed supervised execution
- **THEN** explore acknowledges that every change is already completed and dispatches no duplicate worker.

### Requirement: Active supervision rejects duplicate starts

An active supervised run SHALL begin only after a valid native Plan picker answer, or after the existing authorized continuation path. It SHALL remain active through the existing phase lifecycle. While active, another valid Plan picker answer SHALL receive an explicit already-running acknowledgement and SHALL create no concurrent or queued duplicate run.

#### Scenario: Auto is selected during an active run

- **WHEN** the native picker returns `Plan - Unattended` while supervision is already active
- **THEN** Explore reports that the pipeline is already running and creates no additional dispatch or queue entry

#### Scenario: Auto is selected during the chained design phase

- **WHEN** the native picker returns `Plan - Unattended` while the chained design phase of an active run is executing
- **THEN** Explore reports that the pipeline is already running and creates no additional dispatch or queue entry

#### Scenario: interval ends after the design phase terminates

- **WHEN** the spec phase converged or ended by cap exhaustion and the chained design phase reaches its terminal outcome
- **THEN** the active-supervision interval ends and a later valid Plan picker answer is eligible to begin a new run

#### Scenario: active interval includes supervised gate application, not a user-facing picker

- **WHEN** a supervised spec or design review round resolves the deferred-gate condition while a run is active
- **THEN** the active-supervision interval remains active across the supervised gate application point and no user-facing artifact feedback picker is presented

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

A valid native picker answer for `Direct Build - Unattended` SHALL authorize the delegated-write exception for the Direct Build workers and pre-authorize exactly one local commit executed by the archive worker inside its closed order. It SHALL remain consent to selection and dispatch only.

#### Scenario: Consent scope of the fast-lane selection

- **WHEN** the native picker returns `Direct Build - Unattended`
- **THEN** delegated writes are consented for the Direct Build workers and exactly one local commit is pre-authorized, with no other command surface affected

### Requirement: Selector fires once at end only with same-turn block

The pipeline selector SHALL be presented only after same-turn block emission and successful ordered inventory recording. It SHALL present the native picker at the end of that assistant turn, but SHALL not emit `route-choice`, interpret a route, or dispatch before a later valid picker answer. It SHALL not fire when no complete same-turn block exists.

#### Scenario: Selector gated on same-turn block

- **WHEN** a crystallization turn ends with same-turn blocks and no emission-turn handoff
- **THEN** the native route picker is presented only after inventory recording, and a later valid picker answer is required before route interpretation

### Requirement: Direct Build enters only via stage-machine emit and follow

Direct Build selection SHALL enter only after a later valid `Direct Build - Unattended` picker answer, an emit of intent `direct-build` to `explore-slice@1`, and `next.follow` to `pipeline-direct-build.md`. It SHALL never enter via an ad-hoc Temp script or any other helper path.

#### Scenario: Direct Build uses stage-machine route

- **WHEN** the native picker returns `Direct Build - Unattended`
- **THEN** the flow emits `direct-build` intent and follows to the Direct Build contract without loading an ad-hoc helper path
