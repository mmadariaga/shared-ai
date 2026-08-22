# explore-pipeline-supervision Specification

## Purpose

Define routed supervision of the isolated sai-1 spec-proposal worker from `sai-explore`.
## Requirements
### Requirement: Reuse supervised lifecycle

On Claude Code and opencode, `sai-explore` SHALL act only as the lifecycle coordinator when `Auto` selects one uncompleted change from the latest crystallized set. For a selected change whose spec phase has not yet converged or ended by cap exhaustion in this chat, it SHALL dispatch the existing `sai-1` spec-proposal worker with that change's emitted `Ready to Propose` block as the isolated request envelope and SHALL include the `--supervised` marker on that envelope per `supervised-pipeline-forwarding`; the worker SHALL retain ownership of prerequisites, research, change resolution, `proposal.md`, `specs/**`, decision summaries, consistency checks, feedback edits, and spec-phase completion, and SHALL suppress its automatic worker-owned review loop because of the marker. For a selected change whose spec phase already reached convergence or cap exhaustion in this chat — its `proposal.md` and `specs/**` were reviewed in-session and the supervised spec gate auto-proceeded — but whose chained design phase did not complete, a later `Auto` selection SHALL resume at the design phase by re-dispatching the design worker over the existing reviewed spec artifacts with the same `--supervised` marker (and existing `--fast-track` / optional `--overview-lang` composition), and SHALL NOT re-dispatch the sai-1 spec-proposal worker or regenerate `proposal.md` and `specs/**`, so a design-phase retry never discards reviewed spec work and never reintroduces the isolated worker-owned reviewer by omitting the marker. A design-phase retry SHALL also run under supervised gate mode (no user-facing design gate; auto-Continue to overview generation).

An uncompleted change is a tracked name whose supervised run has not reached supervised completion in this explore chat. Two independent state machines govern the run's ending: the phase's review loop has a budget of at most three rounds per phase per Auto attempt and ends by convergence or cap exhaustion under `supervised-review-rounds`, while the phase worker returns its own terminal result (`completed`, `failed`, or `cancelled`) independently of how the review rounds ended. The review-loop ending governs chaining — a spec phase that converged or exhausted its cap chains design, so the spec worker never terminates a run without design being chained — while supervised completion is decided by the design worker's terminal result alone: a design phase that ended by cap exhaustion still auto-proceeds the supervised design gate to overview generation, and the design worker's own `completed` result is what marks the change completed. A `failed` or `cancelled` spec or design worker does not reach supervised completion: the change remains uncompleted and retryable by a later `Auto` selection, which resumes at the phase whose worker did not complete, regardless of the review-loop ending. Reviewer failure, reviewer cancellation, and severity-contract violation do not exist as supervised outcomes in the in-session model; with the worker-owned automatic loop suppressed, those outcomes also do not arise from an automatic worker-owned reviewer on the supervised path.

#### Scenario: routed harness starts a tracked change whose spec phase has not converged
- **WHEN** the user selects `Auto` for an uncompleted latest-turn change in a Claude Code or opencode explore chat
- **THEN** explore dispatches the existing `sai-1` spec-proposal worker for that change
- **AND** the worker receives the emitted crystallized block rather than the surrounding explore conversation
- **AND** the dispatch envelope carries `--supervised` so the worker suppresses its automatic isolated reviewer

#### Scenario: design-phase retry resumes at design without re-running sai-1
- **WHEN** a change whose spec phase already converged or ended by cap exhaustion and whose supervised spec gate auto-proceeded had its chained design worker return `failed` or `cancelled`, and the user later selects `Auto` for it
- **THEN** explore re-dispatches the design worker over the existing reviewed spec artifacts
- **AND** it does not re-dispatch the sai-1 spec-proposal worker or regenerate `proposal.md` and `specs/**`
- **AND** the design-phase retry runs without presenting the design user gate and auto-Continues to overview generation on convergence or cap exhaustion

#### Scenario: cap-exhausted spec phase continues into design
- **WHEN** the spec phase ends by cap exhaustion with the worker returning `completed`
- **THEN** the run continues to the chained design phase rather than stopping at the spec phase
- **AND** the change's supervised completion follows the design worker's terminal result
- **AND** the chained design envelope also carries `--supervised`

### Requirement: Supervision preserves worker terminal behavior

Explore SHALL handle `completed`, `failed`, and `cancelled` worker results using the shared coordinator and worker lifecycle contracts. A diagnosis-entry result — structurally valid `failed`, coordinator-disproved `completed`, STOP-bearing `completed`, or Explore-route `cancelled` — from a supervised spec-proposal or design worker SHALL enter the bounded item-10 diagnosis route when its phase diagnosis counter is unused, as defined by `Item-10 diagnosis feedback is bounded and read-only`; after that one diagnosis/re-dispatch opportunity is unavailable or ends, Explore SHALL stop the active attempt with concise phase guidance while leaving the selected change uncompleted and eligible for a later user-initiated Auto selection. Explore SHALL NOT repair artifacts directly, silently replace a terminal result with success, or dispatch a replacement worker from diagnosis. If a diagnosis-entry result occurs during machine-feedback processing, the current review cycle SHALL end with that worker result, the diagnosis round SHALL reread the current state only after the worker result closes, and no ordinary review round SHALL be launched over the half-finished state. The current artifacts and already-applied fixes SHALL be preserved. Clean `completed`, `needs_input`, progress, notice, and pre-resolution results SHALL retain their existing handling and SHALL NOT start diagnosis.

#### Scenario: Worker fails before review

- **WHEN** the supervised spec-proposal or design worker returns `failed` before ordinary review rounds begin
- **THEN** Explore runs the one available item-10 diagnosis round for that phase
- **AND** it re-dispatches the same phase worker at most once when the diagnosis supplies an actionable correction
- **AND** it performs no direct artifact write or repair

#### Scenario: Disproved or STOP-bearing completed before review starts diagnosis

- **WHEN** the supervised spec-proposal or design worker returns coordinator-disproved `completed` or STOP-bearing `completed` before ordinary review rounds begin and the phase diagnosis counter is zero
- **THEN** Explore runs the one available item-10 diagnosis round for that phase
- **AND** clean `completed` without disproof and without STOP does not start diagnosis

#### Scenario: Worker fails while applying review feedback

- **WHEN** the spec-proposal or design worker returns a diagnosis-entry result while processing a finding after one or more ordinary review rounds completed
- **THEN** Explore stops the interrupted ordinary review transaction and does not launch another ordinary review round over the half-finished state
- **AND** it runs at most one separate diagnosis round over freshly reread current artifacts
- **AND** it preserves current artifacts and already-applied fixes

#### Scenario: Failed change remains retryable after the bounded route

- **WHEN** the one diagnosis/re-dispatch opportunity is unavailable, produces no actionable correction, or the re-dispatched worker returns another diagnosis-entry result
- **THEN** the selected change remains absent from `completed_changes` and eligible for a later Auto selection
- **AND** Explore emits only the existing applicable phase guidance rather than a second diagnosis or replacement-success message

#### Scenario: Clean lifecycle results remain unchanged

- **WHEN** a supervised worker returns clean `completed`, `needs_input`, a progress event, or a notice, or when a result is pre-resolution
- **THEN** Explore follows the existing lifecycle and autonomy rules
- **AND** it does not start an item-10 diagnosis round or inspect artifacts solely because the result was received

### Requirement: Independent commands remain independently invocable

The supervised entry path SHALL NOT change the contracts or availability of independently invoked `/sai-1-spec` and `/sai-2-design`. A user who selects `Manual` SHALL observe no supervised dispatch and the independent command behavior unchanged. Independently invoked `/sai-1-spec` and `/sai-2-design` SHALL continue to run their automatic worker-owned review loops because they do not receive the `--supervised` marker from explore.

#### Scenario: user invokes sai-1 directly
- **WHEN** the user invokes `/sai-1-spec` outside pipeline supervision
- **THEN** the command follows its existing invocation and completion contract without requiring explore
- **AND** its automatic worker-owned review loop remains active

#### Scenario: Manual selection injects no supervised marker

- **WHEN** the user selects `Manual` on the crystallization-close pipeline selector
- **THEN** explore dispatches nothing
- **AND** a later independent `/sai-1-spec` or `/sai-2-design` does not inherit a `--supervised` marker from that Manual selection

### Requirement: Supervised completion replaces standalone navigation

When the supervised spec-proposal worker completes after the in-session review rounds and user-facing feedback gate, explore SHALL NOT relay sai-1's standalone mandatory-stop message or instruct the user to review the artifacts, carry a handoff, or open a new chat. When the spec phase reaches convergence or cap exhaustion on a harness where selector-dispatched supervision is available (Claude Code or opencode, which is the same set of harnesses on which the design phase is chained), explore SHALL report the spec-phase outcome as the phase-transition report per the `pipeline-phase-transition` and `pipeline-design-phase-chaining` capabilities rather than terminating the supervised run. On convergence, the report states the number of spec review rounds used and that the last completed round found no `High` findings, and if that round accepted `Medium` or `Low` edits, the report SHALL also state that the resulting artifact state was not re-reviewed and SHALL NOT claim that no `High` findings remain in that edited state. On cap exhaustion, the report is the one-line cap-exhaustion report carrying the last round's finding counts, and the run continues to the chained design phase. The per-phase round bound applied by those reports is the three-round cap of `supervised-review-rounds`. This supervised adapter SHALL NOT change the terminal message of an independently invoked `/sai-1-spec`.

#### Scenario: supervised spec phase converges into design
- **WHEN** the selected change's spec phase converges under selector-dispatched Auto supervision on a harness where that supervision is available (Claude Code or opencode)
- **THEN** explore emits the spec-phase outcome as the phase-transition report and proceeds to the chained design phase
- **AND** it does not relay the standalone sai-1 mandatory-stop line or propose a manual handoff
- **AND** it does not terminate the supervised run at spec convergence

#### Scenario: cap-exhausted spec phase proceeds into design
- **WHEN** the selected change's spec phase ends by three-round cap exhaustion under selector-dispatched Auto supervision
- **THEN** explore emits the one-line cap-exhaustion report carrying the last round's finding counts
- **AND** it proceeds to the chained design phase rather than terminating the run

#### Scenario: direct sai-1 retains its terminal line
- **WHEN** `/sai-1-spec` completes outside explore supervision
- **THEN** its existing mandatory-stop message remains unchanged

### Requirement: Supervised gate fetch sites supply mode supervised

Before the first dispatch of an Auto run, explore SHALL fetch `sai/policies/artifact-feedback-gate.md` once and use it for both supervised phases. At the two item-10 gate application sites — after the supervised spec review round converges, exhausts its cap, or returns empty findings, and after the supervised design review round converges, exhausts its cap, or returns empty findings — explore SHALL supply `mode = supervised` together with the existing artifacts, proceed-label, and next-action parameters. Those two sites are the only explore-owned suppliers of `mode = supervised`. The standalone fetch sites in `sai/commands/spec/coordinator.md` and `sai/commands/design/coordinator.md` SHALL NOT supply `mode`, retaining the interactive default.

#### Scenario: spec-phase gate site supplies supervised mode
- **WHEN** a supervised spec review round converges, exhausts its cap, or returns empty findings
- **THEN** explore applies the shared gate with `mode = supervised`, artifacts `proposal.md, specs/**`, proceed-label `Finish step`, and next-action equal to the spec-to-design phase transition
- **AND** the gate auto-executes that next-action without presenting the picker

#### Scenario: design-phase gate site supplies supervised mode
- **WHEN** a supervised design review round converges, exhausts its cap, or returns empty findings
- **THEN** explore applies the shared gate with `mode = supervised`, artifacts `design.md, tasks.md, interfaces.md`, proceed-label `Continue`, and next-action equal to overview generation plus the supervised design terminal
- **AND** the gate auto-executes that next-action without presenting the picker

#### Scenario: standalone coordinators stay interactive
- **WHEN** `/sai-1-spec` or `/sai-2-design` is invoked directly
- **THEN** the corresponding coordinator fetches the shared gate without supplying `mode`
- **AND** the gate presents at iteration 0 with `Give feedback (Recommended)` first and the proceed option second

### Requirement: Gate suppression does not weaken force-majeure interruptions

Supervised gate auto-proceed SHALL NOT create any advance path over a phase worker `failed` or `cancelled` result, and SHALL NOT alter the question-autonomy policy. A `needs_input` that fails the confidence threshold or grounding floor SHALL still escalate to the user and interrupt the run. An invalid non-empty `mode` value that causes the shared gate to STOP is an authoring-fault path at the fetch site, distinct from normal supervised runtime interruptions. Explore SHALL remain read-only under Auto supervision: it SHALL NOT create, modify, or delete files, artifacts, or configuration; the only writes remain those the already-authorized phase workers perform within their owned change-directory scope.

#### Scenario: failed worker skips gate and auto-proceed
- **WHEN** the supervised spec or design worker returns `failed` or `cancelled`
- **THEN** explore reports the outcome and autonomy audit and neither presents the ordinary gate nor auto-executes next-action

#### Scenario: below-threshold needs_input still escalates
- **WHEN** a supervised worker returns `needs_input` whose answer is ungrounded or below the confidence threshold
- **THEN** explore escalates the exact question and options to the user
- **AND** gate suppression does not answer, swallow, or bypass that escalation

### Requirement: item-10 diagnosis feedback is bounded and read-only

The item-10 supervised Auto route SHALL use the shared `sai/policies/bounded-recovery.md` Bounded Recovery policy as the single source for post-resolution non-clean diagnosis. That shared trigger set SHALL be a structurally valid post-resolution `failed` result of any closed worker failure class, a `completed` result disproved by coordinator verification, or a `completed` result carrying STOP. The Explore item-10 failure route SHALL additionally activate this one-shot diagnosis path for a post-resolution supervised worker `cancelled` result; this Explore-specific cancellation activation SHALL NOT change generic clean-cancellation behavior for other adapters or the manual review loop.

For a selected spec or design phase, when the phase worker returns any of those diagnosis-entry results and the phase's conversation-only diagnosis counter is unused, Explore SHALL invoke the existing Review Engine exactly once with the authoritative change name and the phase artifact-set designator (`sai-1` for `proposal.md` plus `specs/**`, or `sai-2` for `design.md`, `tasks.md`, and `interfaces.md`). The engine SHALL reread the current available artifacts and SHALL remain read-only. Explore SHALL form diagnosis feedback in this exact order: `Reported`, `Evidence`, `Cause`, `Correction`, and `Verification`. The feedback SHALL preserve the engine's severity-rated findings and base-form summary when findings are available, and SHALL describe missing or unavailable evidence when the engine cannot form findings.

After the diagnosis round, Explore SHALL attempt at most one re-dispatch of the same phase worker with that diagnosis as feedback through the existing recovery continuation operation. Explore SHALL never apply a correction directly and SHALL never dispatch a replacement worker from this route. A diagnosis that cannot establish an actionable correction, a worker veto, or a failed or undeliverable re-dispatch SHALL close the active attempt without another diagnosis, leaving the change retryable. An actionable diagnosis whose same-worker continuation cannot be delivered SHALL use the shared `continuation/transport loss` stopping diagnosis. A successful re-dispatch returns to the ordinary lifecycle for that phase and does not count the diagnosis as a supervised review round.

Clean `completed` without disproof and without STOP does not start diagnosis.

#### Scenario: A failed worker starts one diagnosis round

- **WHEN** a resolved supervised spec or design worker returns a structurally valid `failed` result with any closed worker failure class and its phase diagnosis counter is zero
- **THEN** Explore invokes `Review Engine(changeName, sai-1)` or `Review Engine(changeName, sai-2)` according to the active phase
- **AND** the engine rereads the current phase artifacts without writing them
- **AND** Explore produces the ordered `Reported`, `Evidence`, `Cause`, `Correction`, and `Verification` diagnosis feedback

#### Scenario: A coordinator-disproved completed result starts one diagnosis round

- **WHEN** a resolved supervised spec or design worker returns `completed` that coordinator verification disproves and its phase diagnosis counter is zero
- **THEN** Explore invokes the same phase-selected Review Engine Diagnosis Round as for `failed`
- **AND** the entry uses the shared Bounded Recovery non-clean set rather than a failed-only Explore special case

#### Scenario: A STOP-bearing completed result starts one diagnosis round

- **WHEN** a resolved supervised spec or design worker returns `completed` carrying STOP and its phase diagnosis counter is zero
- **THEN** Explore invokes the same phase-selected Review Engine Diagnosis Round as for `failed`
- **AND** clean `completed` without STOP and without coordinator disproof does not start diagnosis

#### Scenario: A cancelled worker starts the Explore-specific diagnosis round

- **WHEN** a resolved supervised spec or design worker returns `cancelled` and its phase diagnosis counter is zero
- **THEN** Explore invokes the same phase-selected Review Engine transaction and forms the same five ordered diagnosis sections
- **AND** the cancellation route remains item-10-specific and does not make cancellation recoverable for unrelated adapters or the manual review loop

#### Scenario: Findings are forwarded without direct repair

- **WHEN** the diagnosis round produces one or more `High`, `Medium`, or `Low` Review Engine findings
- **THEN** Explore preserves the shared finding shape, severity, identifiers, and base-form summary as diagnosis evidence
- **AND** it forwards the diagnosis as feedback to the same phase worker through the existing recovery continuation operation
- **AND** Explore creates, modifies, or deletes no artifact, configuration, metadata, or test file

#### Scenario: Diagnosis re-dispatch is single and same-worker

- **WHEN** the diagnosis round establishes an actionable correction and the active worker can be resumed
- **THEN** Explore re-dispatches that same phase worker exactly once with the diagnosis feedback
- **AND** it does not dispatch a replacement worker
- **AND** a later failed, cancelled, disproved-completed, or STOP-bearing completed result from that re-dispatch does not start a second diagnosis round in the same phase attempt

#### Scenario: Actionable diagnosis cannot resume the worker

- **WHEN** the Diagnosis Round establishes an actionable correction but the same-worker continuation cannot be delivered or the worker cannot be resumed
- **THEN** Explore consumes the phase's one diagnosis-round counter and selects `continuation/transport loss` as the stopping diagnosis
- **AND** it does not dispatch the ordinary replacement-worker fallback
- **AND** it closes the active attempt with the selected change still uncompleted and retryable for a later Auto selection

#### Scenario: Diagnosis has no actionable correction

- **WHEN** the Review Engine reports only missing or unavailable evidence, or the diagnosis cannot establish a safe actionable correction boundary
- **THEN** Explore consumes the one diagnosis round without inventing a cause or correction
- **AND** it does not perform a direct artifact repair or an ungrounded re-dispatch
- **AND** the selected change remains uncompleted and retryable

#### Scenario: diagnosis remains read-only and retryable

- **WHEN** diagnosis has no actionable correction, continuation fails, or the worker fails or cancels again
- **THEN** Explore performs no direct repair or replacement dispatch and leaves the selected change eligible for a later `Auto` attempt

#### Scenario: diagnosis counter is separate from review rounds

- **WHEN** the item-10 diagnosis route runs
- **THEN** only `diagnosis_rounds.spec` or `diagnosis_rounds.design` increments, independently of `review_rounds`, and both counters reset on a new Auto attempt without persistence
