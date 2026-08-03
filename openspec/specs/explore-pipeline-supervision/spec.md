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

### Requirement: Every worker question is escalated to the user

The supervising explore coordinator MUST present every `needs_input` question from the spec-proposal worker to the user without answering it, inferring an answer from explore context, or delegating the decision to another agent. It SHALL preserve the worker's exact question and option values, use the harness-native picker when the question is closed-choice, and continue the same worker with the user's answer according to the existing routed worker lifecycle.

#### Scenario: worker requests clarification
- **WHEN** the supervised spec-proposal worker returns `needs_input`
- **THEN** explore presents that question to the user with its exact options and values
- **AND** after the user answers, explore continues the same worker with that answer

#### Scenario: explore context appears to contain an answer
- **WHEN** a worker question could seemingly be answered from reasoning earlier in the explore chat
- **THEN** explore still escalates the question to the user and does not answer autonomously

### Requirement: Supervision preserves worker terminal behavior

Explore SHALL handle `completed`, `failed`, and `cancelled` worker results using the shared coordinator and worker lifecycle contracts. A failed or cancelled spec-proposal worker SHALL stop the active attempt with a concise status while leaving that selected change uncompleted and eligible for a later `start-pipeline` attempt; explore SHALL NOT repair artifacts directly or silently replace a terminal result with success.

#### Scenario: worker fails
- **WHEN** the supervised spec-proposal worker returns `failed`
- **THEN** explore reports the failure concisely and stops the supervised run for that change
- **AND** explore performs no artifact write or repair

#### Scenario: failed change remains retryable
- **WHEN** a selected change's worker fails or is cancelled
- **THEN** that change remains uncompleted and appears in the next `start-pipeline` selection
- **AND** no other tracked change is dispatched by the failed attempt

### Requirement: Independent commands remain independently invocable

The supervised entry path SHALL NOT change the contracts or availability of independently invoked `/sai-1-spec` and `/sai-2-design`. A user who does not send `start-pipeline` SHALL observe their existing behavior unchanged.

#### Scenario: user invokes sai-1 directly
- **WHEN** the user invokes `/sai-1-spec` outside pipeline supervision
- **THEN** the command follows its existing invocation and completion contract without requiring explore

### Requirement: Supervised completion replaces standalone navigation

When the supervised spec-proposal worker completes after the independent review attempt and user-facing feedback gate, explore SHALL NOT relay sai-1's standalone mandatory-stop message or instruct the user to review the artifacts, carry a handoff, or open a new chat. When the reviewer returned `review_complete`, explore SHALL print exactly `Supervised sai-1 done in openspec/changes/{name}/. Independent review and artifact feedback are complete; sai-2 was not run.` When the reviewer returned `review_failed` or `review_cancelled`, explore SHALL print exactly `Supervised sai-1 done in openspec/changes/{name}/. Independent review did not complete; artifact feedback is complete; sai-2 was not run.` This supervised adapter SHALL NOT change the terminal message of an independently invoked `/sai-1-spec`.

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
