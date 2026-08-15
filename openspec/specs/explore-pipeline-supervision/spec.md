# explore-pipeline-supervision Specification

## Purpose

Define routed supervision of the isolated sai-1 spec-proposal worker from `sai-explore`.
## Requirements
### Requirement: Explore supervises the routed sai-1 phase

On Claude Code and opencode, `sai-explore` SHALL act only as the lifecycle coordinator when `start-pipeline` selects one uncompleted change from the chat-scoped tracked crystallized set. For a selected change whose spec phase has not yet converged or ended by cap exhaustion in this chat, it SHALL dispatch the existing `sai-1` spec-proposal worker with that change's emitted `Ready to Propose` block as the isolated request envelope; the worker SHALL retain ownership of prerequisites, research, change resolution, `proposal.md`, `specs/**`, decision summaries, consistency checks, feedback edits, and spec-phase completion. For a selected change whose spec phase already reached convergence or cap exhaustion in this chat — its `proposal.md` and `specs/**` were reviewed in-session and the user-facing feedback gate was passed — but whose chained design phase did not complete, `start-pipeline` SHALL resume at the design phase by re-dispatching the design worker over the existing reviewed spec artifacts, and SHALL NOT re-dispatch the sai-1 spec-proposal worker or regenerate `proposal.md` and `specs/**`, so a design-phase retry never discards reviewed, user-approved spec work.

An uncompleted change is a tracked name whose supervised run has not reached supervised completion in this explore chat. Two independent state machines govern the run's ending: the phase's review loop ends by convergence or cap exhaustion, and the phase worker returns its own terminal result (`completed`, `failed`, or `cancelled`) independently of how the review rounds ended. The review-loop ending governs chaining — a spec phase that converged or exhausted its cap chains design, so the spec worker never terminates a run without design being chained — while supervised completion is decided by the design worker's terminal result alone: a design phase that ended by cap exhaustion still proceeds to the user-facing gate, and the design worker's own `completed` result is what marks the change completed. A `failed` or `cancelled` spec or design worker does not reach supervised completion: the change remains uncompleted and retryable by a later `start-pipeline`, which resumes at the phase whose worker did not complete, regardless of the review-loop ending. Reviewer failure, reviewer cancellation, and severity-contract violation do not exist as supervised outcomes in the in-session model.

#### Scenario: routed harness starts a tracked change whose spec phase has not converged
- **WHEN** the user selects an uncompleted tracked change after sending `start-pipeline` in a Claude Code or opencode explore chat
- **THEN** explore dispatches the existing `sai-1` spec-proposal worker for that change
- **AND** the worker receives the emitted crystallized block rather than the surrounding explore conversation

#### Scenario: design-phase retry resumes at design without re-running sai-1
- **WHEN** a change whose spec phase already converged or ended by cap exhaustion and passed the user-facing gate had its chained design worker return `failed` or `cancelled`, and the user later sends `start-pipeline` and selects it
- **THEN** explore re-dispatches the design worker over the existing reviewed spec artifacts
- **AND** it does not re-dispatch the sai-1 spec-proposal worker or regenerate `proposal.md` and `specs/**`

#### Scenario: cap-exhausted spec phase continues into design
- **WHEN** the spec phase ends by cap exhaustion with the worker returning `completed`
- **THEN** the run continues to the chained design phase rather than stopping at the spec phase
- **AND** the change's supervised completion follows the design worker's terminal result

### Requirement: Supervision preserves worker terminal behavior

Explore SHALL handle `completed`, `failed`, and `cancelled` worker results using the shared coordinator and worker lifecycle contracts. A failed or cancelled spec-proposal worker SHALL stop the active attempt with a concise status while leaving that selected change uncompleted and eligible for a later user-initiated `start-pipeline` attempt; explore SHALL NOT repair artifacts directly or silently replace a terminal result with success. If failure or cancellation occurs during machine-feedback processing, the review cycle SHALL end with that worker result per the `supervised-review-rounds` capability: the current artifacts and the already-applied fixes SHALL be preserved, and no review round SHALL be launched over the half-finished state. A later retry SHALL begin a new three-round bound over the preserved artifact state rather than overwrite accepted corrections from the interrupted attempt.

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
- **THEN** that change remains uncompleted and appears in the next `start-pipeline` selection
- **AND** no other tracked change is dispatched by the failed attempt

#### Scenario: interrupted change is retried

- **WHEN** the user later selects the uncompleted change in a new `start-pipeline` attempt
- **THEN** the new attempt starts a new three-round bound over the preserved artifact state
- **AND** it does not regenerate from the original crystallized block in a way that overwrites accepted corrections from the interrupted attempt

### Requirement: Independent commands remain independently invocable

The supervised entry path SHALL NOT change the contracts or availability of independently invoked `/sai-1-spec` and `/sai-2-design`. A user who does not send `start-pipeline` SHALL observe their existing behavior unchanged.

#### Scenario: user invokes sai-1 directly
- **WHEN** the user invokes `/sai-1-spec` outside pipeline supervision
- **THEN** the command follows its existing invocation and completion contract without requiring explore

### Requirement: Supervised completion replaces standalone navigation

When the supervised spec-proposal worker completes after the in-session review rounds and user-facing feedback gate, explore SHALL NOT relay sai-1's standalone mandatory-stop message or instruct the user to review the artifacts, carry a handoff, or open a new chat. When the spec phase reaches convergence or cap exhaustion on a harness where `start-pipeline` supervision is available (Claude Code or opencode, which is the same set of harnesses on which the design phase is chained), explore SHALL report the spec-phase outcome as the phase-transition report per the `pipeline-phase-transition` and `pipeline-design-phase-chaining` capabilities rather than terminating the supervised run. On convergence, the report states the number of spec review rounds used and that the last completed round found no `High` findings, and if that round accepted `Medium` or `Low` edits, the report SHALL also state that the resulting artifact state was not re-reviewed and SHALL NOT claim that no `High` findings remain in that edited state. On cap exhaustion, the report is the one-line cap-exhaustion report carrying the last round's finding counts, and the run continues to the chained design phase. This supervised adapter SHALL NOT change the terminal message of an independently invoked `/sai-1-spec`.

#### Scenario: supervised spec phase converges into design
- **WHEN** the selected change's spec phase converges under `start-pipeline` supervision on a harness where that supervision is available (Claude Code or opencode)
- **THEN** explore emits the spec-phase outcome as the phase-transition report and proceeds to the chained design phase
- **AND** it does not relay the standalone sai-1 mandatory-stop line or propose a manual handoff
- **AND** it does not terminate the supervised run at spec convergence

#### Scenario: cap-exhausted spec phase proceeds into design
- **WHEN** the selected change's spec phase ends by cap exhaustion under `start-pipeline` supervision
- **THEN** explore emits the one-line cap-exhaustion report carrying the last round's finding counts
- **AND** it proceeds to the chained design phase rather than terminating the run

#### Scenario: direct sai-1 retains its terminal line
- **WHEN** `/sai-1-spec` completes outside explore supervision
- **THEN** its existing mandatory-stop message remains unchanged
