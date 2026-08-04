# explore-pipeline-supervision Specification

## Purpose

Define routed supervision of the isolated sai-1 spec-proposal worker from `sai-explore`.
## Requirements
### Requirement: Explore supervises the routed sai-1 phase

On Claude Code and opencode, `sai-explore` SHALL act only as the lifecycle coordinator when `start-pipeline` selects one uncompleted change from the chat-scoped tracked crystallized set. It SHALL dispatch the existing `sai-1` spec-proposal worker with that change's emitted `Ready to Propose` block as the isolated request envelope; the worker SHALL retain ownership of prerequisites, research, change resolution, `proposal.md`, `specs/**`, decision summaries, consistency checks, feedback edits, and spec-phase completion. An uncompleted change is a tracked name that has not returned `completed` from supervised spec execution in this explore chat; failed or cancelled attempts remain uncompleted.

#### Scenario: routed harness starts a tracked change
- **WHEN** the user selects an uncompleted tracked change after sending `start-pipeline` in a Claude Code or opencode explore chat
- **THEN** explore dispatches the existing `sai-1` spec-proposal worker for that change
- **AND** the worker receives the emitted crystallized block rather than the surrounding explore conversation

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

When the supervised spec-proposal worker completes after the bounded independent-review convergence loop and user-facing feedback gate, explore SHALL NOT relay sai-1's standalone mandatory-stop message or instruct the user to review the artifacts, carry a handoff, or open a new chat. When the loop converges, explore SHALL report supervised completion, the number of review passes used, and that the last completed review found no `High` findings. If that pass accepted `Medium` or `Low` edits, it SHALL also report that the resulting artifact state was not re-reviewed and SHALL NOT claim that no `High` findings remain in that edited state. When the three-pass cap is exhausted, explore SHALL report supervised completion, cap exhaustion, and every outstanding `High` finding from the final pass without classifying the outcome as failure. When a reviewer returns `review_failed` or `review_cancelled`, or when a `review_complete` result is handled as `review_failed` for violating the closed severity contract, explore SHALL report supervised completion, that independent review did not complete, the number and finding history of earlier completed passes, and whether accepted edits from the latest completed pass remain unvalidated. That report SHALL state which cause applied, distinguishing a reviewer output-contract violation from a reviewer crash or cancellation, and SHALL identify the offending severity value or its absence. This supervised adapter SHALL NOT change the terminal message of an independently invoked `/sai-1-spec`.

#### Scenario: supervised spec phase completes
- **WHEN** the selected change completes its supervised spec worker, independent review, and user-facing feedback gate
- **THEN** explore prints the supervised completion line exactly once
- **AND** it does not relay the standalone sai-1 mandatory-stop line or propose a manual handoff

#### Scenario: supervised spec phase completes after reviewer failure
- **WHEN** the reviewer returned `review_failed` or `review_cancelled` and the selected spec worker later completes its user-facing feedback gate
- **THEN** explore prints the incomplete-review supervised completion line exactly once
- **AND** it does not claim that independent review completed

#### Scenario: direct sai-1 retains its terminal line
- **WHEN** `/sai-1-spec` completes outside explore supervision
- **THEN** its existing mandatory-stop message remains unchanged

