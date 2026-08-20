# explore-pipeline-supervision Specification

## Purpose

Define routed supervision of the isolated sai-1 spec-proposal worker from `sai-explore`.
## Requirements
### Requirement: Reuse supervised lifecycle

On Claude Code and opencode, `sai-explore` SHALL act only as the lifecycle coordinator when `Auto` selects one uncompleted change from the latest crystallized set. For a selected change whose spec phase has not yet converged or ended by cap exhaustion in this chat, it SHALL dispatch the existing `sai-1` spec-proposal worker with that change's emitted `Ready to Propose` block as the isolated request envelope; the worker SHALL retain ownership of prerequisites, research, change resolution, `proposal.md`, `specs/**`, decision summaries, consistency checks, feedback edits, and spec-phase completion. For a selected change whose spec phase already reached convergence or cap exhaustion in this chat — its `proposal.md` and `specs/**` were reviewed in-session and the supervised spec gate auto-proceeded — but whose chained design phase did not complete, a later `Auto` selection SHALL resume at the design phase by re-dispatching the design worker over the existing reviewed spec artifacts, and SHALL NOT re-dispatch the sai-1 spec-proposal worker or regenerate `proposal.md` and `specs/**`, so a design-phase retry never discards reviewed spec work. A design-phase retry SHALL also run under supervised gate mode (no user-facing design gate; auto-Continue to overview generation).

An uncompleted change is a tracked name whose supervised run has not reached supervised completion in this explore chat. Two independent state machines govern the run's ending: the phase's review loop ends by convergence or cap exhaustion, and the phase worker returns its own terminal result (`completed`, `failed`, or `cancelled`) independently of how the review rounds ended. The review-loop ending governs chaining — a spec phase that converged or exhausted its cap chains design, so the spec worker never terminates a run without design being chained — while supervised completion is decided by the design worker's terminal result alone: a design phase that ended by cap exhaustion still auto-proceeds the supervised design gate to overview generation, and the design worker's own `completed` result is what marks the change completed. A `failed` or `cancelled` spec or design worker does not reach supervised completion: the change remains uncompleted and retryable by a later `Auto` selection, which resumes at the phase whose worker did not complete, regardless of the review-loop ending. Reviewer failure, reviewer cancellation, and severity-contract violation do not exist as supervised outcomes in the in-session model.

#### Scenario: routed harness starts a tracked change whose spec phase has not converged
- **WHEN** the user selects `Auto` for an uncompleted latest-turn change in a Claude Code or opencode explore chat
- **THEN** explore dispatches the existing `sai-1` spec-proposal worker for that change
- **AND** the worker receives the emitted crystallized block rather than the surrounding explore conversation

#### Scenario: design-phase retry resumes at design without re-running sai-1
- **WHEN** a change whose spec phase already converged or ended by cap exhaustion and whose supervised spec gate auto-proceeded had its chained design worker return `failed` or `cancelled`, and the user later selects `Auto` for it
- **THEN** explore re-dispatches the design worker over the existing reviewed spec artifacts
- **AND** it does not re-dispatch the sai-1 spec-proposal worker or regenerate `proposal.md` and `specs/**`
- **AND** the design-phase retry runs without presenting the design user gate and auto-Continues to overview generation on convergence or cap exhaustion

#### Scenario: cap-exhausted spec phase continues into design
- **WHEN** the spec phase ends by cap exhaustion with the worker returning `completed`
- **THEN** the run continues to the chained design phase rather than stopping at the spec phase
- **AND** the change's supervised completion follows the design worker's terminal result

### Requirement: Supervision preserves worker terminal behavior

Explore SHALL handle `completed`, `failed`, and `cancelled` worker results using the shared coordinator and worker lifecycle contracts. A failed or cancelled spec-proposal worker SHALL stop the active attempt with a concise status while leaving that selected change uncompleted and eligible for a later user-initiated `Auto` selection; explore SHALL NOT repair artifacts directly or silently replace a terminal result with success. If failure or cancellation occurs during machine-feedback processing, the review cycle SHALL end with that worker result per the `supervised-review-rounds` capability: the current artifacts and the already-applied fixes SHALL be preserved, and no review round SHALL be launched over the half-finished state. A later retry SHALL begin a new one-round bound over the preserved artifact state rather than overwrite accepted corrections from the interrupted attempt.

#### Scenario: worker fails before review
- **WHEN** the supervised spec-proposal worker returns `failed`
- **THEN** explore reports the failure concisely and stops the supervised run for that change
- **AND** explore performs no artifact write or repair

#### Scenario: worker fails while applying review feedback

- **WHEN** the spec-proposal worker returns `failed` or `cancelled` while processing a finding after one or more review rounds completed
- **THEN** explore stops the active attempt without direct artifact repair
- **AND** it preserves the current artifacts and the already-applied fixes
- **AND** it does not launch a review round over the half-finished state

#### Scenario: failed change remains retryable
- **WHEN** a selected change's worker fails or is cancelled
- **THEN** that change remains uncompleted and appears in the next `Auto` selection
- **AND** no other tracked change is dispatched by the failed attempt

#### Scenario: interrupted change is retried

- **WHEN** the user later selects `Auto` for the uncompleted change in a new attempt
- **THEN** the new attempt starts a new one-round bound over the preserved artifact state
- **AND** it does not regenerate from the original crystallized block in a way that overwrites accepted corrections from the interrupted attempt

### Requirement: Independent commands remain independently invocable

The supervised entry path SHALL NOT change the contracts or availability of independently invoked `/sai-1-spec` and `/sai-2-design`. A user who selects `Manual` SHALL observe no supervised dispatch and the independent command behavior unchanged.

#### Scenario: user invokes sai-1 directly
- **WHEN** the user invokes `/sai-1-spec` outside pipeline supervision
- **THEN** the command follows its existing invocation and completion contract without requiring explore

### Requirement: Supervised completion replaces standalone navigation

When the supervised spec-proposal worker completes after the in-session review rounds and user-facing feedback gate, explore SHALL NOT relay sai-1's standalone mandatory-stop message or instruct the user to review the artifacts, carry a handoff, or open a new chat. When the spec phase reaches convergence or cap exhaustion on a harness where selector-dispatched supervision is available (Claude Code or opencode, which is the same set of harnesses on which the design phase is chained), explore SHALL report the spec-phase outcome as the phase-transition report per the `pipeline-phase-transition` and `pipeline-design-phase-chaining` capabilities rather than terminating the supervised run. On convergence, the report states the number of spec review rounds used and that the last completed round found no `High` findings, and if that round accepted `Medium` or `Low` edits, the report SHALL also state that the resulting artifact state was not re-reviewed and SHALL NOT claim that no `High` findings remain in that edited state. On cap exhaustion, the report is the one-line cap-exhaustion report carrying the last round's finding counts, and the run continues to the chained design phase. This supervised adapter SHALL NOT change the terminal message of an independently invoked `/sai-1-spec`.

#### Scenario: supervised spec phase converges into design
- **WHEN** the selected change's spec phase converges under selector-dispatched Auto supervision on a harness where that supervision is available (Claude Code or opencode)
- **THEN** explore emits the spec-phase outcome as the phase-transition report and proceeds to the chained design phase
- **AND** it does not relay the standalone sai-1 mandatory-stop line or propose a manual handoff
- **AND** it does not terminate the supervised run at spec convergence

#### Scenario: cap-exhausted spec phase proceeds into design
- **WHEN** the selected change's spec phase ends by cap exhaustion under selector-dispatched Auto supervision
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
