# worker-dispatch-prompt-template Specification

## Purpose
TBD: Define the encoded literal contract-aware dispatch template for routed worker bindings.

## Requirements

### Requirement: Routed worker bindings use an encoded literal contract-aware dispatch template

Each of the seven Claude Code and seven opencode worker bindings SHALL use a literal, worker-specific initial dispatch prompt template encoded as one double-quoted string on the dispatch line. After substituting the binding's canonical worker contract filename, the prompt string SHALL contain literal `\n` escape sequences (backslash followed by `n`, not physical line breaks) and SHALL decode to exactly these two sections in this order:

    Worker contract: Fetch @sai/orchestration/workers/<worker-contract>.md and follow it exactly.\n\nInvocationEnvelope:\n<original InvocationEnvelope>

`<worker-contract>` SHALL be the matching canonical contract filename. `<original InvocationEnvelope>` SHALL remain an opaque slot for the existing coordinator-supplied envelope, which currently contains the two strings owned by the phase coordinator and worker contract. This change SHALL NOT define, serialize, concatenate, or reinterpret those two strings; their field labels, ordering, precedence, and `--fast-track` parsing remain owned by the phase-specific coordinator and worker contract. The template SHALL not contain the former free-text placeholder or permit the coordinator to invent replacement contract-loading wording.

#### Scenario: Every current binding carries the matching template

- **WHEN** the fourteen active binding files are inspected
- **THEN** each initial `Agent` or `task` dispatch SHALL contain the literal template for its own worker contract
- **AND** the Claude binding SHALL retain background `Agent` dispatch semantics while the opencode binding SHALL retain `task` dispatch semantics

#### Scenario: The existing invocation envelope passes through unchanged

- **WHEN** a coordinator performs the initial dispatch
- **THEN** the binding SHALL place the existing opaque two-string `InvocationEnvelope` into the template slot without changing its serialization or field order
- **AND** phase-specific worker resolution SHALL continue to own interpretation of the envelope

#### Scenario: The encoded template remains parseable on one dispatch line

- **WHEN** a binding's initial dispatch is parsed
- **THEN** the prompt SHALL be captured from the same double-quoted dispatch argument, its literal `\n` sequences SHALL be decoded for comparison, and no physical newline SHALL be required inside the call
- **AND** continuation prompts SHALL not be mistaken for the initial template

#### Scenario: Claude template drift is installer-validated

- **WHEN** Claude worker projections are installed or validated
- **THEN** an installer-owned Claude binding check SHALL validate all seven Claude initial dispatch prompts against the same decoded worker-specific template used by the opencode census
- **AND** a mismatch SHALL fail before the Claude projection writes or activates the affected binding

#### Scenario: A binding template names the wrong contract

- **WHEN** a binding's initial dispatch names a contract belonging to another worker or omits the contract-loading section
- **THEN** validation SHALL fail with the binding path and expected worker-specific contract

### Requirement: Binding continuations remain answer-only and harness-native

Replacing the initial dispatch placeholder SHALL NOT change continuation behavior. Claude bindings SHALL continue the captured worker through `SendMessage`, opencode bindings SHALL continue the captured task through `task(task_id: ...)`, and both SHALL forward only the selected answer or the exact fixed notice acknowledgement where their existing contract requires it.

#### Scenario: Feedback continues the same worker

- **WHEN** a routed worker returns `needs_input`
- **THEN** the binding SHALL reuse its captured continuation reference and forward only the selected value
- **AND** the continuation SHALL not package the contract template, binding metadata, or artifacts as new worker input
