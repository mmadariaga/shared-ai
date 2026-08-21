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

For routed `/sai-2-design` invocations, the coordinator SHALL preserve slash-command invocation and interactive navigation while performing no OpenSpec command execution, change resolution, prerequisite checking, codebase inspection, artifact reading, artifact writing, or technical design reasoning. It SHALL delegate technical workflow to the design worker through the harness binding. The coordinator MAY perform the narrow presence check needed to choose the active static progress-plan variant from the original two-string envelope before dispatch; it SHALL not consume a language value, validate option syntax, default a language, or reinterpret the request. The envelope SHALL remain exactly `wrapper_echo_value` and `arguments_value` with no new field. The coordinator SHALL print worker notices exactly as authored and resume the same worker, render the selected static plan before dispatch, mark steps only from worker progress events, and reconcile only at the applicable terminal route.

#### Scenario: Routed design invocation begins

- **WHEN** Claude Code or opencode invokes `/sai-2-design` with arguments
- **THEN** its coordinator selects the six-step plan when no `--overview-lang` token is present or the seven-step plan when the token is present
- **AND** it dispatches a design worker without resolving the change, reading an artifact, or inspecting the codebase

#### Scenario: Presence selection does not replace worker validation

- **WHEN** the raw envelope contains an invalid, missing-value, or duplicate `--overview-lang` form
- **THEN** the coordinator still only selects the presence-based plan
- **AND** the worker owns validation and returns the pre-resolution failure without overview dispatch

#### Scenario: Technical work is required

- **WHEN** the design workflow requires codebase facts, artifact validation, a design decision, or an artifact edit
- **THEN** the coordinator leaves that work to the design worker and does not perform or duplicate it

#### Scenario: Progress event is rendered and marked

- **WHEN** the worker returns a nonterminal progress event
- **THEN** the coordinator marks only declared step ids in the invocation-scoped selected plan, updates the rendered task list, and continues the same worker with `continue_after_progress`

#### Scenario: Fast-track invocation begins
- **WHEN** the worker returns a nonterminal fast-track notice after successful prerequisite checks
- **THEN** the coordinator prints the notice exactly once and acknowledges the same worker with `continue_after_notice`

#### Scenario: Notice acknowledgement is protocol-only

- **WHEN** the coordinator sends `continue_after_notice` after presenting a worker notice
- **THEN** it does not record that acknowledgement as a user answer, opaque input history, pending feedback, or coordinator-authored interaction state beyond the banner-emitted flag

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

For an invocation with explicit `--overview-lang`, the design coordinator's reconciliation trigger SHALL be the successful overview-generation terminal that follows the feedback gate's `Continue`; the worker's pre-gate `completed` SHALL leave the `overview` step unmarked. For an invocation without the flag, the selected plan SHALL contain no `overview` step, `Continue` SHALL use the no-generation terminal route, and that successful terminal SHALL reconcile every eligible unmarked step except an unmarked evidence-marked `review`, if one exists. Exactly one of the generation route or no-generation route SHALL execute per invocation, selected solely by flag presence, and the design completion sentence SHALL be emitted at most once. A failed or cancelled route SHALL leave the selected list exactly as last rendered. The coordinator SHALL never infer the route from worker summary text or artifact contents.

#### Scenario: The opted-in pre-gate result leaves overview pending

- **WHEN** an opted-in design worker returns `completed` and the coordinator presents the artifact feedback gate
- **THEN** the coordinator leaves the task list exactly as last rendered with `overview` still unmarked

#### Scenario: the pre-gate completed leaves the list alone
- **WHEN** the design worker returns `completed` and the coordinator presents the artifact feedback gate
- **THEN** the coordinator leaves the task list exactly as last rendered with `overview` still unmarked

#### Scenario: reconciliation happens at the generation terminal
- **WHEN** the gate proceeds through `Continue` and the overview-generation continuation returns `status: completed`
- **THEN** that terminal is the reconciliation trigger and the coordinator reconciles the list there

#### Scenario: a failed generation terminal freezes the list
- **WHEN** the overview-generation continuation returns `status: failed`, or the continuation is lost before a state transition
- **THEN** the coordinator leaves the list exactly as last rendered and reports the failure

#### Scenario: Opted-in generation reconciles at success

- **WHEN** the gate proceeds through `Continue` and the opted-in overview-generation continuation returns `status: completed`
- **THEN** that terminal reconciles every eligible unmarked step to `completed` except `review`

#### Scenario: Unopted-in Continue closes without overview

- **WHEN** the gate proceeds through `Continue` for an invocation without `--overview-lang`
- **THEN** no overview-generation continuation is dispatched
- **AND** the six-step plan is reconciled at the no-generation completion terminal, leaving an unmarked evidence-marked `review` incomplete only if one exists
- **AND** no `overview` progress event is emitted

#### Scenario: Failed opted-in generation freezes the list

- **WHEN** an opted-in overview-generation continuation returns `status: failed`, or the continuation is lost before a state transition
- **THEN** the coordinator leaves the list exactly as last rendered and reports the worker-authored failure route

### Requirement: design-adapter-declares-progress-plan

The design phase adapter and the design worker contract SHALL declare one of two static, ordered progress plans selected solely by explicit `--overview-lang` token presence in the active invocation. The opted-in plan SHALL contain exactly these seven steps:

- `prereqs-resolution` — "Check prerequisites"
- `research` — "Research and resolve open questions"
- `design` — "Write design.md"
- `tasks` — "Write tasks.md"
- `interfaces` — "Write interfaces.md"
- `review` — "Review artifacts"
- `overview` — "Generate change-overview.md"

The unopted-in plan SHALL contain exactly the first six steps in the same order and labels and SHALL contain no `overview` or replacement `skipped` step. Both declarations SHALL compare equal for the selected variant. The plan is static and fully known before worker dispatch; it is not carried in the envelope, emitted as a lifecycle field, or inferred from a worker result. The plan SHALL NOT contain a standalone `specs-approval` step.

#### Scenario: Opted-in design plan is declared

- **WHEN** `/sai-2-design` starts with `--overview-lang spanish`
- **THEN** the coordinator and worker declare the seven canonical steps in order
- **AND** the final step is `overview: "Generate change-overview.md"`

#### Scenario: design plan is declared
- **WHEN** `/sai-2-design` starts in Claude Code or opencode
- **THEN** the design adapter declares the canonical progress steps in order
- **AND** the first step is labeled `Check prerequisites`

#### Scenario: worker contract mirrors the ids
- **WHEN** the design worker contract is read
- **THEN** it enumerates the same selected ids and labels in the same order as the coordinator

#### Scenario: design contract test pins the relabeled first step
- **WHEN** the design coordinator and worker declarations are extracted
- **THEN** the ordered pairs include `prereqs-resolution: "Check prerequisites"`

#### Scenario: the approval gate has no step of its own
- **WHEN** the design plan is inspected
- **THEN** it contains no `specs-approval` step
- **AND** the specs approval gate is covered by `prereqs-resolution`

#### Scenario: the panel does not advance while the user decides on the specs
- **WHEN** the worker is waiting on the specs approval answer
- **THEN** `prereqs-resolution` remains `in_progress` and `research` remains `pending`

#### Scenario: Unopted-in design plan omits overview

- **WHEN** `/sai-2-design` starts without `--overview-lang`
- **THEN** the coordinator and worker declare exactly six canonical steps through `review`
- **AND** neither declaration contains an `overview` or `skipped` step

#### Scenario: Worker and coordinator variants mirror

- **WHEN** the active design worker contract is read for either invocation form
- **THEN** its selected id/label list matches the coordinator's selected list in order

#### Scenario: Approval remains folded into prerequisites

- **WHEN** the design plan is inspected in either variant
- **THEN** it contains no `specs-approval` step
- **AND** the specs approval gate remains covered by `prereqs-resolution` without changing its approval mechanics

### Requirement: Continue uses a conditional design terminal route

After design artifacts and the feedback gate are complete, an opted-in invocation SHALL trigger the existing same-worker overview-generation route with the explicitly selected language and existing generator contract. An unopted-in invocation SHALL close through the existing design completion sentence after source-artifact verification without dispatching the generator, writing overview lifecycle metadata, or offering a new navigation choice. Exactly one of these mutually exclusive routes SHALL execute per invocation, selected solely by the presence of `--overview-lang`, and the design completion sentence SHALL be emitted at most once. Both routes SHALL stop after design and SHALL not dispatch implementation planning.

#### Scenario: Opted-in Continue carries generation scope

- **WHEN** `Continue` is selected for a design invocation with `--overview-lang spanish`
- **THEN** the same worker receives the existing generation-trigger continuation with the resolved change name, generation scope, and `spanish`
- **AND** the existing overview terminal behavior is preserved

#### Scenario: Unopted-in Continue is terminal without generation

- **WHEN** `Continue` is selected for a design invocation without `--overview-lang`
- **THEN** the coordinator emits the existing design completion sentence at the no-generation terminal
- **AND** it does not dispatch a generator, write a new overview state, or dispatch `/sai-3-implement`

