# explore-pipeline-supervision Specification

## Purpose

Define routed supervision of the isolated sai-1 spec-proposal worker from `sai-explore`.

## Requirements

### Requirement: Name supervised route identity

The supervised pipeline SHALL use `Plan - Unattended` and route identity `plan-unattended` for the existing sai-1/sai-2 supervision, review, chaining, and retry lifecycle. The direct build route SHALL use `Direct Build - Unattended` and route identity `direct-build-unattended` for its separate worker flow.

#### Scenario: supervised selection is classified

- **WHEN** a delegated route is selected
- **THEN** the existing supervision lifecycle uses the applicable renamed route identity without changing worker order or state behavior.

### Requirement: Reuse supervised lifecycle

The supervised pipeline SHALL use the overview language that round 3 of the route round resolved immediately after the native picker returns exactly `Plan - Unattended` and route-choice activation succeeds for a dispatchable route, and before `active_change` is set or the first spec worker is dispatched. Only when round 3 left the overview language unresolved, because the overview answer was missing or cancelled, SHALL the supervised pipeline ask gate 9 on its own exactly once at that point, with the same options and rules as the round-3 question. The displayed label SHALL map to route identity `plan-unattended`, which SHALL remain limited to `sai-1` and `sai-2`.

A resolved overview language SHALL remain available for a retry over the same crystallized idea or slice set, and SHALL reset for a materially new idea without being persisted.

On Claude Code and opencode, `sai-explore` SHALL act only as the lifecycle coordinator after the native picker returns exactly `Plan - Unattended` and route-choice activation succeeds; the route SHALL select only the first pending change from the latest crystallized set in crystallization order. The existing worker scopes, isolated block envelope, supervised marker, review lifecycle, design retry, and terminal behavior SHALL remain unchanged.

#### Scenario: routed harness starts a tracked change whose spec phase has not converged

- **WHEN** the native picker returns exactly `Plan - Unattended`, route-choice activation succeeds, and the first pending latest-turn change has not converged at spec in a Claude Code or opencode explore chat
- **THEN** Explore dispatches the existing sai-1 spec-proposal worker for that change with the emitted crystallized block and supervised envelope

#### Scenario: design-phase retry resumes at design without re-running sai-1

- **WHEN** the first pending change whose spec phase already converged or ended by cap exhaustion and whose supervised spec gate auto-proceeded had its chained design worker return `failed` or `cancelled`, and the native picker returns exactly `Plan - Unattended` with successful route-choice activation
- **THEN** Explore re-dispatches the design worker over the existing reviewed spec artifacts, does not re-dispatch sai-1 or regenerate proposal/specs, and preserves the supervised design retry behavior

#### Scenario: cap-exhausted spec phase continues into design

- **WHEN** the spec phase ends by cap exhaustion with the worker returning `completed`
- **THEN** the run continues to the chained design phase rather than stopping at the spec phase, and the chained design envelope carries `--supervised`

#### Scenario: missing round-3 overview answer asks before the spec worker

- **WHEN** the native picker returns exactly `Plan - Unattended` for a dispatchable change and the round-3 overview answer was missing or cancelled
- **THEN** gate 9 asks on its own exactly once before `active_change` is set and before the first spec worker is dispatched

### Requirement: Supervision preserves worker terminal behavior

Explore SHALL handle `completed`, `failed`, and `cancelled` worker results using the shared coordinator and worker lifecycle contracts. A diagnosis-entry result — structurally valid `failed`, coordinator-disproved `completed`, STOP-bearing `completed`, or Explore-route `cancelled` — from a supervised spec-proposal or design worker SHALL enter the bounded item-10 diagnosis route when its phase diagnosis counter is unused, as defined by `Item-10 diagnosis feedback is bounded and read-only`; after that one diagnosis/re-dispatch opportunity is unavailable or ends, Explore SHALL stop the active attempt with concise phase guidance while leaving the selected change uncompleted and eligible for a later user-initiated Plan - Unattended selection. Explore SHALL NOT repair artifacts directly, silently replace a terminal result with success, or dispatch a replacement worker from diagnosis. If a diagnosis-entry result occurs during machine-feedback processing, the current review cycle SHALL end with that worker result, the diagnosis round SHALL reread the current state only after the worker result closes, and no ordinary review round SHALL be launched over the half-finished state. The current artifacts and already-applied fixes SHALL be preserved. Clean `completed`, `needs_input`, progress, notice, and pre-resolution results SHALL retain their existing handling and SHALL NOT start diagnosis.

#### Scenario: Worker fails before review

- **WHEN** the supervised spec-proposal or design worker returns `failed` before ordinary review rounds begin
- **THEN** Explore runs the one available item-10 diagnosis round for that phase
- **AND** it re-dispatches the same phase worker at most once when the diagnosis supplies an actionable correction
- **AND** it performs no direct artifact write or repair.

#### Scenario: Disproved or STOP-bearing completed before review starts diagnosis

- **WHEN** the supervised spec-proposal or design worker returns coordinator-disproved `completed` or STOP-bearing `completed` before ordinary review rounds begin and the phase diagnosis counter is zero
- **THEN** Explore runs the one available item-10 diagnosis round for that phase
- **AND** clean `completed` without disproof and without STOP does not start diagnosis.

#### Scenario: Worker fails while applying review feedback

- **WHEN** the spec-proposal or design worker returns a diagnosis-entry result while processing a finding after one or more ordinary review rounds completed
- **THEN** Explore stops the interrupted ordinary review transaction and does not launch another ordinary review round over the half-finished state
- **AND** it runs at most one separate diagnosis round over freshly reread current artifacts
- **AND** it preserves current artifacts and already-applied fixes.

#### Scenario: Failed change remains retryable after the bounded route

- **WHEN** the one diagnosis/re-dispatch opportunity is unavailable, produces no actionable correction, or the re-dispatched worker returns another diagnosis-entry result
- **THEN** the selected change remains absent from `completed_changes` and eligible for a later Plan - Unattended selection
- **AND** Explore emits only the existing applicable phase guidance rather than a second diagnosis or replacement-success message.

#### Scenario: Clean lifecycle results remain unchanged

- **WHEN** a supervised worker returns clean `completed`, `needs_input`, a progress event, or a notice, or when a result is pre-resolution
- **THEN** Explore follows the existing lifecycle and autonomy rules
- **AND** it does not start an item-10 diagnosis round or inspect artifacts solely because the result was received.

### Requirement: Independent commands remain independently invocable

The supervised entry path SHALL NOT change the contracts or availability of independently invoked `/sai-1-spec` and `/sai-2-design`. A user who selects `Manual` SHALL observe no supervised dispatch and the independent command behavior unchanged. Independently invoked `/sai-1-spec` and `/sai-2-design` SHALL continue to run their automatic worker-owned review loops because they do not receive the `--supervised` marker from explore.

#### Scenario: user invokes sai-1 directly

- **WHEN** the user invokes `/sai-1-spec` outside pipeline supervision
- **THEN** the command follows its existing invocation and completion contract without requiring explore
- **AND** its automatic worker-owned review loop remains active.

#### Scenario: Manual selection injects no supervised marker

- **WHEN** the user selects `Manual` on the crystallization-close pipeline selector
- **THEN** explore dispatches nothing
- **AND** a later independent `/sai-1-spec` or `/sai-2-design` does not inherit a `--supervised` marker from that Manual selection.

### Requirement: Supervised completion replaces standalone navigation

When the supervised spec-proposal worker completes after the in-session review rounds and user-facing feedback gate, explore SHALL NOT relay sai-1's standalone mandatory-stop message or instruct the user to review the artifacts, carry a handoff, or open a new chat. When the spec phase reaches convergence or cap exhaustion on a harness where selector-dispatched supervision is available (Claude Code or opencode, which is the same set of harnesses on which the design phase is chained), explore SHALL report the spec-phase outcome as the phase-transition report per the `pipeline-phase-transition` and `pipeline-design-phase-chaining` capabilities rather than terminating the supervised run. On convergence, the report states the number of spec review rounds used and that the last completed round found no `High` findings, and if that round accepted `Medium` or `Low` edits, the report SHALL also state that the resulting artifact state was not re-reviewed and SHALL NOT claim that no `High` findings remain in that edited state. On cap exhaustion, the report is the one-line cap-exhaustion report carrying the last round's finding counts, and the run continues to the chained design phase. The per-phase round bound applied by those reports is the three-round cap of `supervised-review-rounds`. This supervised adapter SHALL NOT change the terminal message of an independently invoked `/sai-1-spec`.

#### Scenario: supervised spec phase converges into design

- **WHEN** the selected change's spec phase converges under selector-dispatched Plan - Unattended supervision on a harness where that supervision is available (Claude Code or opencode)
- **THEN** explore emits the spec-phase outcome as the phase-transition report and proceeds to the chained design phase
- **AND** it does not relay the standalone sai-1 mandatory-stop line or propose a manual handoff
- **AND** it does not terminate the supervised run at spec convergence.

#### Scenario: cap-exhausted spec phase proceeds into design

- **WHEN** the selected change's spec phase ends by three-round cap exhaustion under selector-dispatched Plan - Unattended supervision
- **THEN** explore emits the one-line cap-exhaustion report carrying the last round's finding counts
- **AND** it proceeds to the chained design phase rather than terminating the run.

#### Scenario: direct sai-1 retains its terminal line

- **WHEN** `/sai-1-spec` completes outside explore supervision
- **THEN** its existing mandatory-stop message remains unchanged.

### Requirement: Gate suppression does not weaken force-majeure interruptions

Supervised gate auto-proceed SHALL NOT create any advance path over a phase worker `failed` or `cancelled` result, and SHALL NOT alter the question-autonomy policy. A `needs_input` that fails the confidence threshold or grounding floor SHALL still escalate to the user and interrupt the run. An invalid non-empty `mode` value that causes the shared gate to STOP is an authoring-fault path at the fetch site, distinct from normal supervised runtime interruptions. Explore SHALL remain read-only under Plan - Unattended supervision: it SHALL NOT create, modify, or delete files, artifacts, or configuration; the only writes remain those the already-authorized phase workers perform within their owned change-directory scope. This scope is extended solely by the explicitly consented Direct Build - Unattended selection. The dispatched implementer SHALL write any repository artifact the block requires, within the repository-artifact scope and its protected update protocols, and SHALL NOT directly modify published `openspec/specs/**`. The dispatched backfill and archive workers SHALL execute only the consented validated artifact writes, spec sync, archive move, owned-path staging, and pre-authorized local commit in their closed order. Explore itself SHALL remain read-only including read-only schema validation of draft content.

#### Scenario: failed worker skips gate and auto-proceed

- **WHEN** the supervised spec or design worker returns `failed` or `cancelled`
- **THEN** explore reports the outcome and autonomy audit and neither presents the ordinary gate nor auto-executes next-action.

#### Scenario: below-threshold needs_input still escalates

- **WHEN** a supervised worker returns `needs_input` whose answer is ungrounded or below the confidence threshold
- **THEN** explore escalates the exact question and options to the user
- **AND** gate suppression does not answer, swallow, or bypass that escalation.

#### Scenario: Direct Build exception includes schemas

- **WHEN** Direct Build Unattended is selected
- **THEN** the implementer may write code, tests, configuration, and schemas under closed exclusions while explore stays read-only

### Requirement: Direct Build - Unattended eight-step unattended flow

On a Direct Build - Unattended selection, explore SHALL follow the Direct Build coordinator card and run one unattended code-first flow in fixed order without dispatching `/sai-3-implement` or re-entering a routed phase command. After implementation review and the Step 2b suite gate, it SHALL prepare backfill drafts, validate them read-only, run the ADR/DDR routing test, execute the validated backfill draft write, prepare archive preflight, and resolve the unchecked-items gate under fast-track semantics. Archive execution SHALL run exactly `openspec archive <name> --yes --json` as the sole synchronization-and-move primitive, then stage only approved owned paths and perform the one pre-authorized local commit. The flow SHALL never use manual synchronization or archive movement, retry a failed CLI operation, push, or amend.

At the existing completed or stopped terminal close, the full route SHALL use `sai/policies/implementation-closing-report.md` as its single format authority. What you need to know SHALL summarize material repository changes and, on success, name the archive destination and local commit short SHA and subject and state `Nothing was pushed.` If archiving or the commit did not complete, the report SHALL use the stopped status and identify completed and remaining work. Relevant verification limitations, pre-existing or new failures, and incidents with their known effects SHALL appear in the concise summary before Execution details. Next step SHALL retain existing outcome-appropriate navigation and retry guidance. After an escalation, the options of `sai/policies/obstacle-escalation.md` SHALL follow Execution details as a separate question; cancellation and a stop the user chose SHALL get no options.

Execution details SHALL preserve the work and commit record, original tool-generated commit reports, and the Verification and Incidents diagnostic records. Verification SHALL always state the Step 2b suite-gate command and its observed result (green, red with the failing tests, cannot run with the error, or `no test suite found`), SHALL list pre-existing failures classified at `base_sha` separately from failures introduced or worsened by the run, and SHALL list every test file the implementer touched in a gate round. It SHALL state `No known verification issues.` only when the suite gate ran green, no pre-existing failure was found, and no test file was touched in a gate round. A pre-existing test failure SHALL remain a verification limitation, not an incident. Incidents SHALL report run-caused execution problems and contract violations with their violated rule and known effect and identify expected generated files excluded from the commit with their reasons.

The report SHALL omit routine execution telemetry and verbatim worker summaries while preserving existing worker order, execution boundaries, archive and commit ownership, terminal timing, failure handling, and active-change cleanup. The `--no-specs` POC SHALL retain its own closing behavior.

#### Scenario: Unattended run reaches an archived, committed change

- **WHEN** the eight Direct Build steps complete without an escalation
- **THEN** the flow presents the shared outcome-first report, names the archive destination and local commit short SHA and subject, states `Nothing was pushed.`, and reaches the terminal archived-and-committed state

#### Scenario: Direct Build reports a completed archive and commit

- **WHEN** the final archive execution returns a clean terminal `completed` result and no uncompleted slice remains
- **THEN** explore presents the shared report with the archive destination, local commit short SHA and subject, and `Nothing was pushed.` in What you need to know and preserves diagnostic records in Execution details last

#### Scenario: Direct Build reports incomplete terminal work

- **WHEN** archiving or the local commit does not complete
- **THEN** explore uses the stopped report, states what completed and what remains, does not describe the run as completed, and preserves existing non-clean failure handling and commit ownership

#### Scenario: Verification reports the observed suite gate

- **WHEN** the terminal report is presented after a suite gate that found pre-existing failures
- **THEN** What you need to know identifies the verification limitation and Verification within Execution details names the suite command and observed result, lists the pre-existing failures classified at `base_sha`, and does not state `No known verification issues.`

### Requirement: Direct Build slice completion transition
On a Direct Build - Unattended selection, explore SHALL execute the existing eight-step worker flow in fixed order for the first pending slice. After, and only after, the final direct-build-execute archive worker returns a clean terminal completed result, explore SHALL record that result in the first-seen changed-file union, add the selected change to completed_changes, preserve the completed slice progress states, and enter the completion transition exactly once. Failed, cancelled, incomplete-recovery, coordinator-disproved, or STOP-bearing results SHALL NOT mark the slice completed or start a later slice. The transition SHALL preserve existing worker order, worker payloads, commit ownership, and failure semantics.

#### Scenario: A cleanly completed slice hands off to the next slice
- **WHEN** the final archive execution worker returns a clean terminal completed result and another crystallized slice is not in completed_changes
- **THEN** explore records the completed slice before recomputing remaining slices; when continuation resolves to auto_continue it starts the first pending slice as Direct Build, and when it resolves to route_choice it dispatches no worker from the transition.

### Requirement: Direct Build re-entry uses deterministic selection
When the completion transition finds uncompleted entries in last_crystallization_set, explore SHALL recompute them only by subtracting completed_changes, preserve crystallization order, route only the first pending slice, and apply the existing deterministic selection rules with no slice-name picker. The re-entered selector SHALL never select a completed name, run openspec list, or re-sort names; it SHALL retain the existing empty-set, exhausted-set, single-entry, and active-run behavior.

#### Scenario: Re-entry excludes completed slices
- **WHEN** a completed slice and one or more uncompleted slices remain in the crystallization set
- **THEN** continuation operates only on the first pending slice in the original crystallization order.

### Requirement: Direct Build slice attempts reset only per-attempt state

Only a new Direct Build slice execution SHALL initialize its execution state, capture initial `base_sha` and slice snapshots, reset `fix_rounds`, `gate_rounds`, and the Direct Build diagnosis counters, start at Step 1, and receive that slice's original one-local-commit authorization. The initialization SHALL retain completed changes and completed idea-progress states.

Resumption of a pending execution in the same conversation SHALL preserve its accepted work, initial references, counters, replacement usage, pending step, and authorization consumption instead of initializing a fresh attempt. A failed, cancelled, incomplete-recovery, coordinator-disproved, STOP-bearing, or suite-gate-stopped result SHALL not mark the slice completed or trigger completion re-entry.

#### Scenario: A new slice gets fresh attempt state

- **WHEN** the completion transition re-enters selection for a new uncompleted slice execution
- **THEN** that slice starts with initialized per-attempt counters while previously completed slice state remains intact

#### Scenario: Pending execution retains its attempt state

- **WHEN** a stopped Direct Build execution resumes in the same conversation
- **THEN** it retains its existing counters and accepted work without restarting implementation or renewing commit authorization

### Requirement: Direct Build terminal navigation waits for slice exhaustion

Explore SHALL defer the existing Direct Build terminal report and navigation while any slice in `last_crystallization_set` remains uncompleted. When no uncompleted slice remains, including the single-slice case, explore SHALL emit the existing terminal report and navigation exactly once and clear `active_change`; the completion transition SHALL emit no premature terminal navigation.

#### Scenario: Exhausted slices close once

- **WHEN** the completion transition finds no uncompleted crystallized slice
- **THEN** explore emits the existing terminal report and navigation once and clears `active_change` without showing another selector.

### Requirement: Direct Build - Unattended deterministic selection inheritance
On a Direct Build - Unattended selection, explore SHALL apply the first-pending ordered selection verbatim against last_crystallization_set and completed_changes including every degenerate state: an empty set acknowledges nothing crystallized and dispatches nothing; no uncompleted entry acknowledges completion and dispatches nothing; one or more uncompleted entries route only the first pending slice with no picker and no Cancel; and an active run rejects another selection for the full interval. It SHALL NOT run openspec list or re-sort names, and earlier clauses describing an ordered picker with Cancel are superseded for selection only.

#### Scenario: Build inherits deterministic slice selection
- **WHEN** Direct Build - Unattended is selected with multiple pending crystallized slices
- **THEN** only the first pending slice is used without repository enumeration, re-sorting, picker, or Cancel.

### Requirement: Direct Build continuation preserves pending and completed slice state
After a successful slice completion, explore SHALL preserve completed progress states, filter remaining slices from last_crystallization_set minus completed_changes in crystallization order, and defer terminal navigation while pending slices remain. Answer yes with no queued route request SHALL resolve to auto_continue; answer no or a queued route request SHALL resolve to route_choice.

#### Scenario: continuation has pending work
- **WHEN** a clean completion leaves one or more uncompleted slices
- **THEN** the completed slice remains completed and continuation operates only on the pending set.

#### Scenario: Degenerate selection states behave deterministically
- **WHEN** the selection state is empty, fully completed, single-entry, multi-entry, or already active at selection time
- **THEN** the matching degenerate rule fires unchanged with first-pending routing, no repository enumeration, and no re-sorting.

### Requirement: Direct Build - Unattended run state and failure handling

Direct Build slice inventory (`set` / `active` / `done`) and TODO (`mode` plus `stage` cursor) SHALL be owned by `explore-slice@1` in sidecar-owned state. Remaining Direct Build run state SHALL remain conversation-only in the card's Run state, SHALL include `order_snapshot` (the no-effect reference for the execute order in flight) and the attempts of one budget of 3 per step (`step-1`, `step-2`, `step-2b`, and `step-3` through `step-8`), initialized to zero only by a new slice and persisting across a same-slice resume, and SHALL preserve the fixed worker order, execution boundaries, owned-path staging, and pre-authorized local commit. Every non-clean outcome after dispatch SHALL be an obstacle of the step it blocks under `sai/policies/obstacle-escalation.md`; `failure_class` and `unrecoverable` SHALL be evidence for the response, never an eligibility gate. A backfill or archive worker failure SHALL be answered as an obstacle first, and the run SHALL stop only when the step's budget is spent or a force-majeure case applies. A stop SHALL report the exact draft paths written or the exact CLI, staging, or commit state, and a partial plan SHALL never be committed. A failed execute order SHALL be issued again only after the no-effect check verifies that it changed nothing; no order SHALL be issued onto a completed, partial, or unknown state, which SHALL be force majeure. A late continuation after success SHALL be rejected without mutation. A stopped slice SHALL carry no finality and SHALL run new retries or changes only at explicit user request. Manual `/sai-backfill`, `/sai-archive`, and `/sai-commit` guidance SHALL be reported as applicable. Incomplete Archive SHALL NOT mark the slice done.

#### Scenario: Archive failure stops the unattended flow

- **WHEN** the archive worker reports a CLI, staging, message-authoring, or commit failure and the step's budget is spent or a force-majeure case applies
- **THEN** the flow preserves and reports the exact state, issues no order onto it, and does not mark the slice complete

#### Scenario: Hands-worker failure stops clean

- **WHEN** the backfill or archive worker returns a failure before completing its closed order and the step's budget is spent
- **THEN** the run stops before the next mutation stage and manual `/sai-archive` and `/sai-commit` guidance is reported

#### Scenario: Backfill partial-mutation failure stops before archive

- **WHEN** the backfill worker reports an execution failure with a partial mutation
- **THEN** the flow SHALL preserve and report the exact draft paths written and issue no order onto the partially mutated state

#### Scenario: A failed order without effect is corrected and issued again

- **WHEN** a backfill or archive execute order fails, the no-effect check verifies that it changed nothing, and the failed step has an attempt left
- **THEN** the route answers it as an obstacle with a different correction and issues a new order to the step's owner

### Requirement: Explore worker bindings load at their dispatch points

The Direct Build - Unattended route of `/sai-explore` SHALL load the binding for each of its three workers (`sai-direct-build-worker`, `sai-backfill-worker`, `sai-archive-worker`) lazily at that worker's dispatch point in `sai/commands/explore/direct-build-coordinator.md`, not in `sai/commands/explore/command-bootstrap.md`. The Plan - Unattended route SHALL likewise load the `spec-worker` and `design-worker` bindings at its phase-aware dispatch point in `sai/commands/explore/steps/pipeline-plan-unattended.md`, so explore sessions that never dispatch load no worker binding. Each dispatch SHALL occur only after its binding has been fetched and used, so the worker returns `event: ready` before its task and closed lifecycle results afterwards.

#### Scenario: The implementer binding is fetched before the step-1 dispatch

- **WHEN** the Direct Build route reaches its step-1 implement dispatch
- **THEN** `direct-build-coordinator.md` fetches `@sai/orchestration/workers/bindings/direct-build-worker.md` and uses it before dispatching `sai-direct-build-worker`.

#### Scenario: The backfill binding is fetched before the step-3 dispatch

- **WHEN** the Direct Build route reaches its backfill dispatch
- **THEN** `direct-build-coordinator.md` fetches `@sai/orchestration/workers/bindings/backfill-worker.md` and uses it before dispatching `sai-backfill-worker`.

#### Scenario: The archive binding is fetched before the step-7 dispatch

- **WHEN** the Direct Build route reaches its archive dispatch
- **THEN** `direct-build-coordinator.md` fetches `@sai/orchestration/workers/bindings/archive-worker.md` and uses it before dispatching `sai-archive-worker`.

#### Scenario: The Plan bindings are fetched before the first Plan dispatch

- **WHEN** the Plan - Unattended route reaches its phase-aware dispatch
- **THEN** `pipeline-plan-unattended.md` fetches `@sai/orchestration/workers/bindings/spec-worker.md` and `@sai/orchestration/workers/bindings/design-worker.md` and uses them before dispatching either worker.

#### Scenario: The bootstrap preloads no worker binding

- **WHEN** `sai/commands/explore/command-bootstrap.md` is read
- **THEN** it fetches no worker binding.

### Requirement: Build spec review checks MODIFIED-delta completeness

The Direct Build - Unattended route's step-4 spec review SHALL apply the shared scenario-preservation receiver boundary to temporary backfill drafts and their separate exception reference. It SHALL verify references, independently approve every exception against the approved block, and run the deterministic checker against current published specifications, comparing scenario names within each capability and MODIFIED requirement. Unapproved missing scenarios SHALL be High completeness findings routed to the same backfill worker within the existing findings budget. A failed or incomplete comparison SHALL NOT be accepted through review-round cap exhaustion. Verified temporary metadata and approval evidence SHALL remain available through archive, and the coordinator SHALL repeat the independent archive boundary on current deltas immediately before archive execution. Worker-authored exceptions alone SHALL grant no approval.

#### Scenario: A draft MODIFIED drops an existing scenario
- **WHEN** the step-4 spec review finds a MODIFIED requirement whose draft scenario set omits a scenario the main spec already holds without an applicable exception independently approved against the accepted scope
- **THEN** explore records a High completeness finding and continues it once to the same backfill worker within the remaining `fix_rounds` budget.

#### Scenario: Approved exception permits only its named difference
- **WHEN** an exception explicitly covered by the approved block permits one scenario removal or rename
- **THEN** the checker permits only that difference and still reports any unrelated missing scenario

#### Scenario: Exhausted review budget does not accept invalid preservation
- **WHEN** the review budget is exhausted but the scenario comparison still fails or cannot complete
- **THEN** the affected drafts are not accepted for materialization or archive

#### Scenario: Metadata survives until the archive check
- **WHEN** validated backfill drafts have been materialized but archive has not completed
- **THEN** the transfer directory and verified metadata remain available for the independent archive check and any corrections until terminal cleanup

### Requirement: The Direct Build run has three guard windows

Every dispatch of a Direct Build (unattended) run SHALL be guarded by the deterministic no-commit guard, in three windows: (1) the implementer window, opened by the Step 1 snapshot whose head is recorded as BOTH `base_sha` and the window's `guard_base`, verified after the implementer stretch closes — the fix loop converged or the cap exhausted, and the Step 2b suite gate green, skipped, or stopped — and before the Step 3 staging, or before the stop report when the suite gate stops the route; (2) the backfill window, opened by a fresh snapshot immediately before the Step 3 prepare dispatch — taken after the path-scoped staging, so the coordinator's `git add` runs outside every window — spanning the findings and execute continuations with no guard call between them, and verified after the Step 6 execute terminal before acting on it; (3) the archive window, opened by a fresh snapshot immediately before the Step 7 prepare dispatch and closed by a normal verify immediately before the Step 8 execute continuation, which carries `allow_commit` and therefore always opens its own isolated window from a fresh snapshot, verified with `--allow-commit` over that window only, because that continuation's validated closed order contains the one pre-authorized local commit. Progress events and notices inside a window SHALL take no guard call; a human turn inside any window (an escalated question) SHALL be a boundary per the no-commit-guard policy: verify before presenting it and snapshot again after the answer, before forwarding it. A new worker started as an obstacle approach SHALL be a dispatch guarded like any other, inside the window of the step it serves. On a `violation` verdict the coordinator remediates exactly as the no-commit-guard policy prescribes, then continues the route.

#### Scenario: the backfill prepare window opens after staging

- **WHEN** the run stages the implementer's owned paths and then dispatches the backfill prepare stretch
- **THEN** the backfill window's snapshot is taken after the staging, so the coordinator's `git add` runs outside every guard window

#### Scenario: the backfill window spans its continuations

- **WHEN** the backfill findings and execute continuations follow the prepare stretch with no human turn in between
- **THEN** no guard call runs between them, and the backfill window is verified once after the Step 6 execute terminal

#### Scenario: the archive execute sub-window carries the lax flag

- **WHEN** the Step 8 archive execute continuation runs in its isolated window opened from a fresh snapshot
- **THEN** only that window's verify runs with `--allow-commit`, and the implementer, backfill, and archive prepare windows are verified without it

#### Scenario: the archive execute continuation opens an isolated window

- **WHEN** the Step 8 archive execute continuation is about to be dispatched
- **THEN** the archive window is closed by a normal verify first, and the continuation runs in its own window from a fresh snapshot whose verify alone carries `--allow-commit`

#### Scenario: the implementer window spans the suite gate

- **WHEN** the Step 2b suite gate ends green, skipped, or stopped
- **THEN** the implementer window is verified once, before the Step 3 staging or before the stop report

#### Scenario: a recovery hand-off takes its own window

- **WHEN** the coordinator starts a new worker for a failed step with its written hand-over during the run
- **THEN** that dispatch runs inside the guard window of the step it serves, without `allow_commit` unless it is the Step 8 execute continuation

### Requirement: Direct Build slice-machine emits

After a valid native picker answer for `Direct Build - Unattended` activates `route-choice`, Explore SHALL emit intent `direct-build` with no slice name and no pick to `explore-slice@1`; the machine starts only the first pending slice. On an automatically authorized start after a clean Direct Build finish, Explore SHALL instead emit intent `auto-continue`, with no slice name and no pick, only when the authoritative continuation resolves to `auto_continue`. If the response carries rejected `ALREADY_RUNNING`, including when Plan is already active, Explore SHALL acknowledge already running and dispatch nothing. If it carries rejected `PARKED_IN_OTHER_MODE`, Explore SHALL acknowledge that the first pending slice resumes only in its parked mode, with no later slice bypass or dispatch. If it carries rejected `NO_PENDING_SLICE`, Explore SHALL distinguish empty from exhausted inventory, dispatch nothing, and prompt block-first when the inventory is empty. After each high-level route item converges (Build/Implement, then Backfill, then Archive), Explore SHALL emit intent `complete`. Completing Archive is the machine done signal. Direct Build SHALL never emit `next-slice`. Every retryable non-clean ending SHALL emit intent `fail` without starting a later slice.

#### Scenario: Direct Build selection emits direct-build

- **WHEN** the native picker returns `Direct Build - Unattended`, route-choice activation succeeds, and explore-slice has no active slice
- **THEN** Explore emits intent direct-build with no pick to explore-slice and starts the Build/Implement route item

#### Scenario: Already-running Direct Build dispatches nothing

- **WHEN** Direct Build is selected again while explore-slice returns rejected ALREADY_RUNNING
- **THEN** Explore acknowledges already running and dispatches no worker

#### Scenario: Empty inventory rejects Direct Build start

- **WHEN** the native picker returns `Direct Build - Unattended` while explore-slice has an explicitly recorded empty inventory
- **THEN** Explore emits direct-build intent and on rejected NO_PENDING_SLICE acknowledges missing inventory, prompts block-first, and dispatches nothing

### Requirement: Direct Build archive failure correction routing

The card SHALL answer an archive preparation or execution failure as an obstacle of the failed step (`step-7` or `step-8`) under `sai/policies/obstacle-escalation.md`, within that step's own budget of 3 attempts, continuing the same worker with a correction or starting a new worker with the card's hand-over. Before the Step 6 backfill execute continuation and before the Step 8 archive execute continuation, the coordinator SHALL take the `order_snapshot`. A failed execute order SHALL be issued again only under the card's Execute orders rule. A late continuation after success SHALL be rejected without mutation. A stop SHALL report the exact CLI, staging, or commit state and SHALL never commit a partial plan. A stopped slice SHALL carry no finality and SHALL run new retries or changes only at explicit user request. Manual backfill, archive, and commit guidance SHALL be reported as applicable.

#### Scenario: Backfill-artifact archive failure relaunches after correction

- **WHEN** an archive execution fails on a backfill-artifact error, the no-effect check verifies that the order changed nothing, and the cause is corrected as an obstacle of the step
- **THEN** the supervision SHALL issue a new archive execute order with the corrected artifacts

#### Scenario: Repeated defect without progress closes as failed-retryable

- **WHEN** the same defect repeats after a correction or the failed step's three attempts are spent
- **THEN** the supervision SHALL escalate with a stop report and options with the verbatim failure in view, and the slice stays retryable at explicit user request

### Requirement: Plan slice-machine emits

After a valid native picker answer for `Plan - Unattended` activates `route-choice`, Explore SHALL emit intent `plan` with no slice name and no pick to `explore-slice@1`; the machine starts only the first pending slice. If the response carries rejected `ALREADY_RUNNING`, including when Direct Build is already active, Explore SHALL acknowledge already running and dispatch nothing. If it carries rejected `PARKED_IN_OTHER_MODE`, Explore SHALL acknowledge that the first pending slice resumes only in its parked mode, with no later slice bypass or dispatch. If it carries rejected `NO_PENDING_SLICE`, Explore SHALL distinguish empty from exhausted inventory, dispatch nothing, and prompt block-first when the inventory is empty. After spec convergence, Explore SHALL emit intent `complete` (sai-1 to sai-2). After a clean terminal design result, Explore SHALL emit intent `complete` (sai-2 to implement). Pipeline-plan-unattended SHALL be `next.follow` for all three Plan stages. Fail, cancel, STOP, or exhausted recovery SHALL leave that step pending with no skip to implement; Explore SHALL emit intent `fail` at that ending. Implement completes only on `next-slice`.

#### Scenario: Plan selection emits plan

- **WHEN** the native picker returns `Plan - Unattended`, route-choice activation succeeds, and explore-slice has no active slice
- **THEN** Explore emits intent plan with no pick to explore-slice and starts the sai-1 route item

#### Scenario: next-slice on Implement marks the slice done
- **WHEN** Plan is at Implement and the user sends next-slice
- **THEN** Explore emits next-slice to explore-slice, the slice is marked done, active is cleared, and stage returns to waiting

#### Scenario: Empty inventory rejects Plan start

- **WHEN** the native picker returns exactly `Plan - Unattended` and route-choice activation succeeds while explore-slice has no pending slice
- **THEN** Explore emits plan intent and on rejected NO_PENDING_SLICE acknowledges missing inventory and dispatches nothing

### Requirement: Direct Build implementer accepts a bounded verification note

During Direct Build Steps 1–2, `sai-direct-build-worker` SHALL accept the policy-authorized same-worker verification note only as one reversible correction to the already-disclosed crystallized block. The note SHALL state verified current effects, one in-scope correction, and one concrete verification check; it SHALL add no requirement, task, artifact authority, mutation authority, or review/fix-loop round.

#### Scenario: Implementer applies a verification note

- **WHEN** the coordinator establishes verified effects, an in-scope reversible correction, and a concrete check within the existing block
- **THEN** the implementer applies only that correction and runs the named check before returning its ordinary closed lifecycle result

#### Scenario: Verification note cannot establish safety

- **WHEN** the note's effects, scope, reversibility, or check cannot be established or the correction is destructive, irreversible, or shared-system work
- **THEN** the implementer makes no correction and returns the ordinary result with the blocker and verified state

### Requirement: Direct Build mutation workers retain one-shot order boundaries

Direct Build backfill and archive workers SHALL retain their role-specific validated preparation and execution contracts. A successful order SHALL be consumed and never issued again. A new backfill draft order or archive order SHALL be issued only after the previous order failed and the no-effect check verified that it changed nothing; an order SHALL never be issued over completed, partial, or unknown effects. A backfill-artifact failure SHALL be corrected as an obstacle of the failed step under `sai/policies/obstacle-escalation.md`.

#### Scenario: Archive mutation is incomplete

- **WHEN** an archive preparation or execution order has partial or unknown mutation state
- **THEN** the route reports the exact state and issues no new order

#### Scenario: Backfill-artifact correction remains route-owned

- **WHEN** a valid archive failure is identified as a backfill-artifact error
- **THEN** the route corrects it as an obstacle of its step, continuing the same backfill worker or starting a new worker with the card's hand-over

### Requirement: Unattended runtime recovery preserves route gates

Runtime recovery SHALL preserve Plan's approval and review stop and Direct Build's selected-scope, validated execution-order, and one-local-commit gates. It SHALL not grant a new mutation authorization or change supervised commands.

#### Scenario: Plan gate remains authoritative

- **WHEN** a Plan runtime repair returns a valid result at an approval or review boundary
- **THEN** the existing Plan gate remains the authority before the next phase transition

#### Scenario: Direct Build gate remains authoritative

- **WHEN** a Direct Build runtime repair returns a valid result before artifact execution or the local commit
- **THEN** the route still requires its existing selected scope, validated order, and one-local-commit authorization state

### Requirement: Direct Build - Unattended reports scope observations

The Direct Build - Unattended route SHALL classify every observation of its functional fix loop and of its spec review by the `Scope observations` section of `sai/policies/artifact-review-contract.md`, and SHALL hold each scope observation for the terminal report. The terminal report's execution details SHALL carry a `Scope observations` record that lists every scope observation of the run in the contract's line form, and SHALL omit that record when there is none.

#### Scenario: the fix loop forms a scope observation
- **WHEN** the functional fix loop forms an observation whose fix requires behavior the `Ready to Propose` block does not ask for
- **THEN** the coordinator holds it for the terminal report and does not send it to the implementer as a finding

#### Scenario: the run ends with scope observations
- **WHEN** a Direct Build - Unattended run reaches its terminal report with at least one scope observation held
- **THEN** the execution details list each one under `Scope observations` in the contract's line form

#### Scenario: the run ends with no scope observation
- **WHEN** a Direct Build - Unattended run reaches its terminal report with no scope observation held
- **THEN** the terminal report omits the `Scope observations` record

### Requirement: Direct Build owns retained same-conversation execution state

The full Direct Build route SHALL define its retained execution state once in the Run state section of `sai/commands/explore/direct-build-coordinator.md` and keep it conversation-only. The state SHALL include the active change, route entries and accepted completion states, pending internal step and check, each role's captured handle while continuation may be needed with its original envelope and the messages it received, first-seen changed-path union, findings, draft validation evidence, the backfill transfer directory path and the latest draft references (never draft content), suite results, the report directory, verification references, the per-step attempt counters, execute-order state, and commit-authorization consumption evidence. The state SHALL NOT include the block text: only the `sai-state` store holds it, and every step that needs the block SHALL read it with `sai-state block <id> <change-name>`, so a compaction leaves resumption unaffected.

Parking the slice SHALL release machine active state without clearing this conversation execution state. Guard baseline state SHALL remain local to its live window; a human interruption SHALL close and verify that window, and subsequent worker work SHALL open a fresh window under the existing guard policy. Resumption SHALL introduce no new persistent storage and SHALL not support a new conversation.

#### Scenario: Pending execution is parked

- **WHEN** Direct Build fails, is cancelled, or remains stopped
- **THEN** its route step remains pending and its conversation execution references remain available even though the machine releases active

#### Scenario: Human boundary closes guard state

- **WHEN** a human interruption crosses an active Direct Build guard window
- **THEN** the coordinator closes and verifies that window and opens a fresh window before forwarding subsequent worker work without carrying the old guard baseline across the boundary

#### Scenario: Resumption reads the block from the store

- **WHEN** a parked Direct Build slice resumes after its conversation was compacted
- **THEN** the pending step reads the slice's block from `sai-state block` and no missing block keeps the route stopped while the store holds it

### Requirement: Direct Build resumes the first pending accepted-check operation

On `resume-direct-build`, the coordinator SHALL reconcile the retained pending internal step with the machine's saved stage: Steps 1–2b belong to build-implement, Steps 3–6 to backfill, and Steps 7–8 to archive. Missing information required for the pending operation SHALL keep execution stopped and be identified. A stage mismatch SHALL require reconciliation from accepted checks, never fresh initialization.

The coordinator SHALL recheck accepted-step evidence against repository state, preserve accepted work whose evidence remains valid, and review affected work whose evidence changed without resetting counters or scope. It SHALL enter at the first pending internal step. A completed worker stretch alone SHALL not accept a step: acceptance SHALL require validator-compatible output and every ordinary step check. Only accepted internal checks SHALL advance `pending_step`, and high-level `complete` SHALL be emitted only after all internal checks for that stage pass.

#### Scenario: Backfill is the first pending operation

- **WHEN** implementation and suite checks are accepted and the parked stage is backfill
- **THEN** resumption continues the pending backfill operation without re-running accepted implementation

#### Scenario: Reconstruction information is missing

- **WHEN** resumption lacks a required block, handle history, counter, authorization state, or verification reference
- **THEN** the route remains stopped and identifies the missing information

#### Scenario: Accepted evidence changed

- **WHEN** current repository state invalidates evidence for previously accepted work
- **THEN** the coordinator reviews the affected work while preserving scope and counters rather than accepting stale evidence or restarting the whole execution

### Requirement: Direct Build continues the corresponding agent before replacement

For pending agent work, the coordinator SHALL first attempt same-worker continuation with the retained handle through the existing native binding: Claude Code's captured agent handle or opencode's task session identifier. A new worker SHALL be an obstacle approach under `sai/policies/obstacle-escalation.md`: it SHALL receive a hand-over written by the coordinator (the change name, the role and step, the retained references, the validated closed order and its execution state when there is one, the findings already sent, and the symptom), never draft content or the old worker's history, SHALL start again from the ready handshake, and SHALL never replay an executed order. The step's attempt counters SHALL persist across the replacement. Each pending step SHALL continue its corresponding role rather than dispatching a new implementer for backfill or archive.

#### Scenario: Existing role agent remains available

- **WHEN** pending work can continue through its retained agent handle
- **THEN** the coordinator continues that same agent before considering a new worker

#### Scenario: Continuation delivery fails

- **WHEN** same-agent continuation cannot be delivered
- **THEN** the coordinator starts a new worker with its written hand-over as an attempt of that step, and keeps the route stopped when the pending operation needs information the run state does not hold

### Requirement: Rejected responses preserve work and remain pending

Every Direct Build response SHALL reach the active validator exactly as received. Invalid output SHALL preserve existing repository changes, keep the step pending, and request a fresh valid report from its author as an obstacle of that step. Rejected output SHALL supply no accepted status or changed-path claim. Recoverable errors SHALL be answered as obstacles under `sai/policies/obstacle-escalation.md` before a user decision. An exhausted budget SHALL leave the step pending and report the cause; choosing resumption SHALL not reopen that budget.

#### Scenario: Agent returns invalid output

- **WHEN** an agent response fails active payload validation
- **THEN** the coordinator preserves existing changes and requests corrected output from the author within the step's attempt budget without advancing the step

#### Scenario: Recovery budget is exhausted

- **WHEN** a pending step has spent its three attempts
- **THEN** the coordinator reports the cause and keeps the step pending without granting another attempt merely because resumption was requested

### Requirement: Plan - Unattended follows the /sai-plan coordinator

The explore route `Plan - Unattended` SHALL export the first pending slice's stored block with `sai-state block <id> <change-name> --export --harness <claude|opencode>` and follow `sai/commands/plan/coordinator.md` in the explore session with `--block-file`, `--block-hash`, and, when `overview_language` is not `None`, `--overview-lang <overview_language>`. The plan coordinator SHALL own the dispatches, the answers to worker questions, the checks, the review rounds, the commits, and the run state. Explore SHALL keep the slice rules: it emits `{intent: complete}` to `explore-slice@1` when the spec segment completes or counts as done and again when the design segment completes, emits `{intent: fail}` when a segment does not complete, never starts a later slice on its own, and advances only on `next-slice`. A failed slice SHALL be parked and retryable by a fresh `Plan - Unattended` picker answer.

#### Scenario: Plan route follows the plan coordinator

- **WHEN** the user selects `Plan - Unattended` for a dispatchable slice
- **THEN** explore exports the slice's block and follows `/sai-plan` with the block reference, without dispatching spec or design workers outside the plan coordinator

#### Scenario: a failed segment parks the slice

- **WHEN** the spec segment of the followed `/sai-plan` run ends stopped
- **THEN** explore emits `{intent: fail}`, no design segment starts, and a later `Plan - Unattended` answer retries the slice

### Requirement: Direct Build - Unattended follows the Direct Build coordinator card

The explore route `Direct Build - Unattended` SHALL export the first pending slice's stored block with `sai-state block <id> <change-name> --export --harness <claude|opencode>` and follow `sai/commands/explore/direct-build-coordinator.md` in the explore session with `--block-file` and `--block-hash`, as it follows `sai/commands/plan/coordinator.md` for Plan. The card SHALL be a goal-driven card with Goal, Start, run, Obstacles, and Close sections; it SHALL own the eight steps, the Step 2b suite gate, the three guard windows, the run state, the Execute orders rule, resumption, and the terminal report; it SHALL dispatch only `sai-direct-build-worker`, `sai-backfill-worker`, and `sai-archive-worker`; and it SHALL NOT load `sai/orchestration/command-runner.md`, `sai/orchestration/worker-core.md`, `bounded-recovery.md`, `stop-options.md`, or `unattended-runtime-recovery.md`. Obstacles SHALL follow `sai/policies/obstacle-escalation.md` with one budget of 3 attempts per step, named `step-1`, `step-2`, `step-2b`, and `step-3` through `step-8`. `sai/commands/explore/steps/pipeline-direct-build.md` SHALL keep only what is explore's own: the delegated write-scope exception, ordered slice selection, the dispatchable-blocks rule, the stored-block export, the fetch of the card with its arguments, the `--no-specs` POC profile, the slice-machine emits, the route projection, and the slice completion transition. On `BLOCK_NOT_FOUND` or `BLOCK_EXPORT_FAILED`, explore SHALL dispatch nothing and escalate under the obstacle policy with options that include retrying the export and re-emitting the block (`--amend` for one pending or stopped slice). The `--no-specs` POC profile SHALL run only the card's Step 1 and Step 2 and SHALL spend no recovery attempt.

#### Scenario: Direct Build route follows the card

- **WHEN** the user selects `Direct Build - Unattended` for a dispatchable slice
- **THEN** explore exports the slice's block and follows `sai/commands/explore/direct-build-coordinator.md` with the block reference, and the card dispatches the three Direct Build workers

#### Scenario: The card carries no legacy orchestration

- **WHEN** `sai/commands/explore/direct-build-coordinator.md` is read
- **THEN** it fetches `sai/policies/obstacle-escalation.md` and none of the command runner, worker core, bounded-recovery, stop-options, or unattended-runtime-recovery contracts

#### Scenario: An unexportable block stops before dispatch

- **WHEN** the stored-block export returns `BLOCK_NOT_FOUND` or `BLOCK_EXPORT_FAILED`
- **THEN** explore dispatches nothing and escalates with options that include retrying the export and re-emitting the block with `--amend`

#### Scenario: A POC failure spends no attempt

- **WHEN** the `--no-specs` POC profile ends with a failed implementer result
- **THEN** no recovery attempt is spent and the POC lane forms its verdict from the observed result
