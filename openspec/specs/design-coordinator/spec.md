# Design Coordinator Specification

## Purpose

Define the design coordinator: its lifecycle management, notice emission, feedback iteration, continue-now semantics, and relationship to the implementation coordinator binding.

## Interfaces

### DesignInvocationEnvelope

```yaml
wrapper_echo_value: string
arguments_value: string
```

### ContinueNowEnvelope

```yaml
wrapper_echo_value: "placeholder-value"
arguments_value: "placeholder-change-name"
```
## Requirements

The routed design coordinator and invocation bodies are grouped at `sai/commands/design/coordinator.md` and `sai/commands/design/invocation.md`.
### Requirement: Current design harness entrypoints
Claude Code and opencode SHALL invoke the routed design coordinator and their respective design-worker bindings. No supported wrapper SHALL invoke a retired inline loader.

#### Scenario: Routed harness starts design
- **WHEN** Claude Code or opencode invokes `/sai-2-design`
- **THEN** its wrapper SHALL enter the routed coordinator and design-worker binding
- **AND** it SHALL NOT fetch a retired inline adapter or a removed inline command loader

#### Scenario: Retired inline design entry is excluded
- **WHEN** a maintainer inspects the active `/sai-2-design` entrypoints
- **THEN** the active wrappers SHALL be limited to the Claude Code and opencode routed coordinator and matching worker bindings
- **AND** no active entrypoint SHALL fetch a retired inline adapter or removed inline loader

### Requirement: active-harness-entry-boundary

Claude Code and opencode SHALL invoke the routed design coordinator and their respective design-worker bindings. No supported entrypoint SHALL require a legacy loader.

### Requirement: coordinator-has-no-file-search-shell-git-web-openspec-access

The design coordinator SHALL NOT have file, search, shell, git, web, or OpenSpec access. All technical I/O SHALL be delegated to the design planning worker. Completed-step stamps SHALL derive from worker-authored `emitted_on`; the coordinator SHALL perform no wall-clock shell call.

#### Scenario: coordinator restricted to coordination
- **WHEN** the design coordinator is active
- **THEN** it SHALL NOT perform file reads, globs, grep, shell commands, git operations, web fetches, or OpenSpec commands
- **AND** it SHALL delegate all such operations to the design planning worker
- **AND** completed-step stamps SHALL be read from worker payloads without a shell clock call

### Requirement: worker-delegates-explore-only

The design planning worker SHALL delegate source discovery only to its permitted budget-explorer/explore binding.

#### Scenario: explore-only delegation
- **WHEN** the worker needs source code discovery
- **THEN** it SHALL delegate to the budget-explorer or explore agent only
- **AND** SHALL NOT delegate to any other agent type

### Requirement: continue-now-clears-design-lifecycle

Continue now SHALL clear the design lifecycle state and dispatch the established implementation binding.

#### Scenario: continue-now clears state
- **WHEN** the user selects "Continue now in this chat"
- **THEN** the coordinator SHALL clear the design lifecycle state
- **AND** SHALL dispatch the implementation binding without design context

### Requirement: continue-now-envelope-contract

The Continue-now envelope SHALL carry `wrapper_echo_value` and `arguments_value`.

#### Scenario: envelope fields present
- **WHEN** continue-now is triggered
- **THEN** the envelope SHALL contain `wrapper_echo_value` set to the empty string
- **AND** `arguments_value` set to the resolved change name

### Requirement: The design coordinator is a conversational control plane

For routed `/sai-2-design` invocations, the coordinator SHALL preserve slash-command invocation and interactive navigation while performing no OpenSpec command execution, argument parsing, change resolution, prerequisite checking, codebase inspection, artifact reading, artifact writing, or technical design reasoning. It SHALL delegate the technical workflow to the design worker through the harness binding. It SHALL print user-visible worker notices exactly as authored and resume the same worker, without deriving or interpreting the notice. The design adapter declares a progress plan, so the coordinator SHALL render it as a live task list per the neutral policy, mark steps only from worker progress events, and resume the same worker with `continue_after_progress`; the plan and marked set SHALL be held in invocation-scoped state, rendered at dispatch, and reconciled at terminal results, and SHALL NOT be derived from artifacts.

#### Scenario: Routed design invocation begins
- **WHEN** Claude Code or opencode invokes `/sai-2-design` with arguments
- **THEN** the coordinator SHALL construct the shared invocation envelope and dispatch a design worker without resolving the change, reading an artifact, or inspecting the codebase

#### Scenario: Technical work is required
- **WHEN** the design workflow requires codebase facts, artifact validation, a design decision, or an artifact edit
- **THEN** the coordinator SHALL leave that work to the design worker and SHALL NOT perform or duplicate it

#### Scenario: Fast-track invocation begins
- **WHEN** the worker returns a nonterminal fast-track notice after successful prerequisite checks
- **THEN** the coordinator SHALL print the notice exactly once, set its design-scoped banner-emitted flag, and acknowledge the same worker with the fixed protocol value `continue_after_notice` without resolving the change or deciding which gates are skipped

#### Scenario: Progress event is rendered and marked

- **WHEN** the worker returns a nonterminal progress event
- **THEN** the coordinator SHALL mark the reported step ids in the invocation-scoped plan, update the rendered task list, and continue the same worker with `continue_after_progress` without resolving the change or interpreting the event

#### Scenario: Notice acknowledgement is protocol-only
- **WHEN** the coordinator sends `continue_after_notice` after presenting a worker notice
- **THEN** it SHALL NOT record that acknowledgement as a user answer, opaque input history, pending feedback, or coordinator-authored interaction state beyond the banner-emitted flag

### Requirement: The coordinator relays worker input requests
The coordinator SHALL handle a worker `needs_input` result by presenting the worker-authored question and options through the harness-native picker, forwarding the selected value to the same worker through the binding-owned continuation reference, and awaiting the next lifecycle result. For each such exchange it SHALL append one opaque protocol entry containing the exact worker-authored `question`, exact ordered `options`, and exact user-selected or free-text `answer_value`. It SHALL record no coordinator-authored picker labels, feedback-gate prompts, summaries, or inferred conversation content in this history and SHALL not interpret or edit an entry. The coordinator SHALL NOT answer, rewrite, or technically adjudicate the question.

#### Scenario: Worker requests a closed approval or design choice
- **WHEN** the design worker returns `needs_input` with a question and ordered options
- **THEN** the coordinator SHALL present those options through the native picker and forward the selected option value to that same worker session

#### Scenario: User supplies artifact feedback
- **WHEN** the user selects the artifact-feedback option and supplies feedback on `design.md`, `tasks.md`, or `interfaces.md`
- **THEN** the coordinator SHALL forward the feedback to the same worker when continuation is available and SHALL report the worker's selective application or discard results without editing the artifacts itself

#### Scenario: Artifact feedback is pending worker confirmation
- **WHEN** the user supplies free-form artifact feedback
- **THEN** the coordinator SHALL retain the exact raw text as design-scoped `pending_feedback` until a worker result confirms selective application or discard and artifact verification, and SHALL include it in fresh-worker reconstruction if continuation fails before that confirmation

### Requirement: The coordinator owns feedback-gate presentation state
The coordinator SHALL own the artifact-feedback gate's design-lifecycle-scoped iteration counter and the design fast-track banner-emitted flag. It SHALL initialize both at invocation start, present the recommended marker only when the counter is zero, increment the counter only after a worker confirms completion of a feedback turn, clear `pending_feedback` at that same point, and retain both presentation values across same-worker continuation and fresh-worker fallback. The counter and flag SHALL not be persisted or inferred from artifacts.

#### Scenario: Feedback gate is presented after fallback
- **WHEN** one feedback turn completed before the original worker became unavailable and a fresh worker reconstructed the workflow
- **THEN** the coordinator SHALL retain a counter greater than zero and SHALL present `Give more feedback` with no recommended marker

### Requirement: The coordinator handles lifecycle outcomes without artifact reconstruction
The coordinator SHALL process `completed`, `needs_input`, `failed`, and `cancelled` results using the shared worker lifecycle protocol and SHALL maintain the invocation-scoped ordered union of worker-reported changed files. It SHALL never inspect git or OpenSpec artifacts to reconstruct a result or changed-file list.

#### Scenario: Worker completes design generation
- **WHEN** the design worker returns `completed`
- **THEN** the coordinator SHALL report the worker-authored summary and aggregated changed files and proceed to the artifact-feedback and Stop/Continue controls without reading the generated artifacts

#### Scenario: Worker fails or cancels
- **WHEN** the worker returns `failed` or `cancelled`
- **THEN** the coordinator SHALL report the supplied blocking or clean-stop summary with the aggregated changed files and SHALL stop without attempting technical recovery itself

### Requirement: The coordinator owns post-design navigation only as protocol relay
After design artifacts and feedback are complete, the coordinator SHALL emit the existing design completion stop and SHALL stop. It SHALL NOT present a post-feedback navigation choice, SHALL NOT begin an implementation lifecycle namespace, and SHALL NOT dispatch the implementation planning worker. The stop SHALL not cause the design coordinator to resolve the change, read design artifacts, or perform implementation planning.

#### Scenario: User stops after design
- **WHEN** the artifact-feedback gate's proceed option is selected
- **THEN** the command SHALL emit the existing mandatory design completion stop and SHALL not start implementation planning

#### Scenario: No continuation is offered
- **WHEN** design artifacts and feedback are complete on Claude Code or opencode
- **THEN** the coordinator SHALL NOT offer a same-prompt continuation into implementation planning and SHALL NOT construct an implementation invocation envelope

### Requirement: numbered-design-worker-identity
The routed design worker SHALL use the phase-specific identifier `sai-2-design-worker` across opencode agent configuration, Claude Code managed worker definitions, direct wrapper binding fetch references, harness bindings, installer projections, and verification/documentation surfaces. Its reusable technical core SHALL be named `sai-2-design-core` in `sai/compat/` and SHALL remain separate from the implementation worker contract. The Claude Code and opencode routed workers SHALL fetch the renamed core wherever they consume the design invocation core.

#### Scenario: design dispatch resolves the phase worker
- **WHEN** the routed design coordinator dispatches technical design work
- **THEN** the harness binding SHALL target `sai-2-design-worker`
- **AND** the worker SHALL retain the existing design lifecycle, permissions, artifact, and phase-policy contract

#### Scenario: opencode wrapper declares its own coordinator runtime
- **WHEN** opencode invokes `/sai-2-design`
- **THEN** the wrapper SHALL declare `model: opencode-go/glm-5.2` and `variant: high`
- **AND** the wrapper SHALL NOT declare an `agent:` field

#### Scenario: all design paths use the renamed core
- **WHEN** a routed design worker loads the reusable design invocation behavior
- **THEN** it SHALL reference `sai-2-design-core`
- **AND** no caller SHALL fetch the former unnumbered design core name

#### Scenario: design planning starts only from its own invocation
- **WHEN** `/sai-2-design` runs
- **THEN** `/sai-2-design` SHALL dispatch only `sai-2-design-worker`
- **AND** it SHALL NOT dispatch `sai-3-implementation-worker`

### Requirement: design-reconciles-only-at-the-post-gate-terminal

The design coordinator's reconciliation trigger SHALL be the overview-generation terminal that follows the feedback gate's `Continue`, per `coordinator-progress-ownership`. The worker's pre-gate `completed` — the one the coordinator answers by printing the worker summary and presenting the artifact feedback gate — SHALL NOT trigger reconciliation, because the same worker is still continued afterwards for overview generation.

Consequently the `overview` step SHALL NOT be rendered `completed` before overview generation has been dispatched and has succeeded.

#### Scenario: the pre-gate completed leaves the list alone

- **WHEN** the design worker returns `completed` and the coordinator presents the artifact feedback gate
- **THEN** the coordinator SHALL leave the task list exactly as last rendered, with `overview` still unmarked

#### Scenario: reconciliation happens at the generation terminal

- **WHEN** the gate proceeds through `Continue` and the overview-generation continuation returns `status: completed`
- **THEN** that terminal SHALL be the reconciliation trigger, and the coordinator SHALL reconcile the list there, rendering every unmarked step `completed` except `review`

#### Scenario: a failed generation terminal freezes the list

- **WHEN** the overview-generation continuation returns `status: failed`, or the continuation is lost before any state transition
- **THEN** the coordinator SHALL leave the list exactly as last rendered, so `overview` stays unmarked alongside the reported `failure_kind` and `failure_details`

### Requirement: design-adapter-declares-progress-plan

The design phase adapter (`sai/commands/design/coordinator.md`) SHALL declare a `progress_plan` with exactly the following ordered progress steps:

    prereqs-resolution: "Check prerequisites, resolve the change, and approve specs"
    research: "Research and resolve open questions"
    design: "Write design.md"
    tasks: "Write tasks.md"
    interfaces: "Write interfaces.md"
    review: "Review artifacts"
    overview: "Generate change-overview.md"

The indented block above is illustrative of the ids and labels only; it is not the rendering the instruction files use. The declaration as written in `sai/commands/design/coordinator.md` and in the design worker contract (`sai/commands/design/worker.md`) SHALL use those files' existing list rendering, and byte-identity SHALL be asserted between those two file renderings — not between either of them and this delta's block. The worker contract SHALL enumerate the same step ids with the same labels in the same order. The adapter SHALL NOT omit, reorder, or rename these steps, and SHALL NOT add steps. Every label SHALL be imperative rather than nominal.

The plan SHALL NOT contain a standalone `specs-approval` step: the specs approval gate is folded into `prereqs-resolution`, so that step stays `in_progress` while the user is deciding on the specs rather than falsely showing research under way.

#### Scenario: design plan is declared

- **WHEN** `/sai-2-design` starts in Claude Code or opencode
- **THEN** the design adapter SHALL declare the seven canonical progress steps in order

#### Scenario: worker contract mirrors the ids

- **WHEN** the design worker contract is read
- **THEN** it SHALL enumerate exactly `prereqs-resolution`, `research`, `design`, `tasks`, `interfaces`, `review`, and `overview`, in that order, with the same labels the adapter declares
- **AND** its declaration block SHALL be byte-identical to the coordinator file's declaration block, both rendered in those files' existing list form

#### Scenario: the approval gate has no step of its own

- **WHEN** the design plan is inspected
- **THEN** it SHALL contain no `specs-approval` step
- **AND** the specs approval gate SHALL be covered by `prereqs-resolution`

#### Scenario: the panel does not advance while the user decides on the specs

- **WHEN** the worker is waiting on the specs approval answer
- **THEN** `prereqs-resolution` SHALL still render `in_progress` and `research` SHALL still render `pending`
