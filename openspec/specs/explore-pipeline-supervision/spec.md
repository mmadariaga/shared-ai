# explore-pipeline-supervision Specification

## Purpose

Define routed supervision of the isolated sai-1 spec-proposal worker from `sai-explore`.
## Requirements
### Requirement: Explore supervises the routed sai-1 phase

On Claude Code and opencode, `sai-explore` SHALL act only as the lifecycle coordinator when `start-pipeline` selects one uncompleted change from the chat-scoped tracked crystallized set. For a selected change whose spec phase has not yet converged in this chat, it SHALL dispatch the existing `sai-1` spec-proposal worker with that change's emitted `Ready to Propose` block as the isolated request envelope; the worker SHALL retain ownership of prerequisites, research, change resolution, `proposal.md`, `specs/**`, decision summaries, consistency checks, feedback edits, and spec-phase completion. For a selected change whose spec phase already converged in this chat — its `proposal.md` and `specs/**` reached zero `High` findings and passed the user-facing feedback gate — but whose chained design phase did not complete, `start-pipeline` SHALL resume at the design phase by re-dispatching the design worker over the existing converged spec artifacts, and SHALL NOT re-dispatch the sai-1 spec-proposal worker or regenerate `proposal.md` and `specs/**`, so a design-phase retry never discards reviewed, user-approved spec work.

An uncompleted change is a tracked name whose supervised run has not reached supervised completion in this explore chat. Supervised completion is reached when the run's terminal worker returns `completed`: the spec worker when the spec phase does not chain design, or the design worker when the spec phase converges and design is chained. A worker returning `completed` includes the cap-exhaustion outcome, which is a non-failure terminal, so a cap-exhausted phase reaches supervised completion and the change is not re-offered by `start-pipeline`; its follow-up is an independently invoked next-phase command or a user-initiated revision, not an automatic re-run. A `failed` or `cancelled` spec or design worker does not reach supervised completion: the change remains uncompleted and retryable by a later `start-pipeline`, which resumes at the phase whose worker did not complete. A reviewer failure, reviewer cancellation, or severity-contract violation in either phase is non-terminal for the change; the change's completed or uncompleted state SHALL follow that phase's worker terminal result rather than the reviewer result.

#### Scenario: routed harness starts a tracked change whose spec phase has not converged
- **WHEN** the user selects an uncompleted tracked change after sending `start-pipeline` in a Claude Code or opencode explore chat
- **THEN** explore dispatches the existing `sai-1` spec-proposal worker for that change
- **AND** the worker receives the emitted crystallized block rather than the surrounding explore conversation

#### Scenario: design-phase retry resumes at design without re-running sai-1
- **WHEN** a change whose spec phase already converged and passed the user-facing gate had its chained design worker return `failed` or `cancelled`, and the user later sends `start-pipeline` and selects it
- **THEN** explore re-dispatches the design worker over the existing converged spec artifacts
- **AND** it does not re-dispatch the sai-1 spec-proposal worker or regenerate `proposal.md` and `specs/**`

#### Scenario: cap-exhausted phase completes the change
- **WHEN** the spec phase (with no design chained) or the chained design phase terminates as cap exhaustion, the worker returning `completed`
- **THEN** the change reaches supervised completion and is not re-offered by a later `start-pipeline`
- **AND** its follow-up is an independent next-phase command or user-initiated revision rather than an automatic re-run

#### Scenario: reviewer failure follows the worker terminal result
- **WHEN** a reviewer returns `review_failed`, `review_cancelled`, or a severity-contract violation while the phase's worker still returns `completed`
- **THEN** the change's completed or uncompleted state follows that worker's `completed` result
- **AND** the change is not left uncompleted solely because the reviewer did not complete

### Requirement: Supervision preserves worker terminal behavior

Explore SHALL handle `completed`, `failed`, and `cancelled` worker results using the shared coordinator and worker lifecycle contracts. A failed or cancelled spec-proposal worker SHALL stop the active attempt with a concise status while leaving that selected change uncompleted and eligible for a later user-initiated `start-pipeline` attempt; explore SHALL NOT repair artifacts directly or silently replace a terminal result with success. If failure or cancellation occurs during machine-feedback processing, supervision SHALL preserve the current artifacts, the count and finding history of completed review passes, every recorded feedback disposition, and whether accepted or partial edits remain unvalidated. A later retry SHALL begin a new three-pass bound over the preserved artifact state rather than overwrite accepted corrections from the interrupted attempt.

#### Scenario: worker fails before review
- **WHEN** the supervised spec-proposal worker returns `failed`
- **THEN** explore reports the failure concisely and stops the supervised run for that change
- **AND** explore performs no artifact write or repair

#### Scenario: worker fails while applying review feedback

- **WHEN** the spec-proposal worker returns `failed` or `cancelled` while processing a finding after one or more review passes completed
- **THEN** explore stops the active attempt without direct artifact repair
- **AND** it reports the completed-pass count, each finding and feedback disposition recorded before failure, and whether the current artifacts contain unvalidated accepted or partial edits
- **AND** it preserves the current artifact state

#### Scenario: failed change remains retryable
- **WHEN** a selected change's worker fails or is cancelled
- **THEN** that change remains uncompleted and appears in the next `start-pipeline` selection
- **AND** no other tracked change is dispatched by the failed attempt

#### Scenario: interrupted change is retried

- **WHEN** the user later selects the uncompleted change in a new `start-pipeline` attempt
- **THEN** the new attempt starts a new three-pass bound over the preserved artifact state
- **AND** it does not regenerate from the original crystallized block in a way that overwrites accepted corrections from the interrupted attempt

### Requirement: Independent commands remain independently invocable

The supervised entry path SHALL NOT change the contracts or availability of independently invoked `/sai-1-spec` and `/sai-2-design`. A user who does not send `start-pipeline` SHALL observe their existing behavior unchanged.

#### Scenario: user invokes sai-1 directly
- **WHEN** the user invokes `/sai-1-spec` outside pipeline supervision
- **THEN** the command follows its existing invocation and completion contract without requiring explore

### Requirement: Supervised completion replaces standalone navigation

When the supervised spec-proposal worker completes after the bounded independent-review convergence loop and user-facing feedback gate, explore SHALL NOT relay sai-1's standalone mandatory-stop message or instruct the user to review the artifacts, carry a handoff, or open a new chat. When the loop converges on a harness where `start-pipeline` supervision is available (Claude Code or opencode, which is the same set of harnesses on which the design phase is chained), explore SHALL report the spec-phase outcome — the number of review passes used and that the last completed review found no `High` findings — as the phase-transition report and SHALL proceed to the chained design phase per the `pipeline-phase-transition` and `pipeline-design-phase-chaining` capabilities rather than terminating the supervised run; the spec-phase supervised-completion report serves as that phase-transition report. If that pass accepted `Medium` or `Low` edits, the report SHALL also state that the resulting artifact state was not re-reviewed and SHALL NOT claim that no `High` findings remain in that edited state. When the three-pass cap is exhausted, explore SHALL report supervised completion, cap exhaustion, and every outstanding `High` finding from the final pass without classifying the outcome as failure, and SHALL NOT chain the design phase. When a reviewer returns `review_failed` or `review_cancelled`, or when a `review_complete` result is handled as `review_failed` for violating the closed severity contract, explore SHALL report supervised completion, that independent review did not complete, the number and finding history of earlier completed passes, and whether accepted edits from the latest completed pass remain unvalidated, and SHALL NOT chain the design phase. That report SHALL state which cause applied, distinguishing a reviewer output-contract violation from a reviewer crash or cancellation, and SHALL identify the offending severity value or its absence. This supervised adapter SHALL NOT change the terminal message of an independently invoked `/sai-1-spec`.

#### Scenario: supervised spec phase converges into design
- **WHEN** the selected change's spec phase converges under `start-pipeline` supervision on a harness where that supervision is available (Claude Code or opencode)
- **THEN** explore emits the spec-phase outcome as the phase-transition report and proceeds to the chained design phase
- **AND** it does not relay the standalone sai-1 mandatory-stop line or propose a manual handoff
- **AND** it does not terminate the supervised run at spec convergence

#### Scenario: supervised spec phase completes after reviewer failure
- **WHEN** the reviewer returned `review_failed` or `review_cancelled` and the selected spec worker later completes its user-facing feedback gate
- **THEN** explore prints the incomplete-review supervised completion line exactly once
- **AND** it does not claim that independent review completed
- **AND** it does not chain the design phase

#### Scenario: cap-exhausted spec phase does not chain design
- **WHEN** the three-pass cap is exhausted with at least one outstanding `High` finding
- **THEN** explore reports cap exhaustion without classifying it as failure
- **AND** it does not chain the design phase

#### Scenario: direct sai-1 retains its terminal line
- **WHEN** `/sai-1-spec` completes outside explore supervision
- **THEN** its existing mandatory-stop message remains unchanged
