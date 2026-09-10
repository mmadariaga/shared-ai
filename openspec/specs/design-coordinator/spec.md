# Design Coordinator Specification

## Purpose

Define the design coordinator: its lifecycle management, notice emission, feedback iteration, and relationship to the implementation coordinator binding.

## Interfaces

### DesignInvocationEnvelope

```yaml
arguments_value: string
```
## Requirements

The routed design coordinator, worker, and step-local instruction surfaces are grouped at `sai/commands/design/coordinator.md`, `sai/commands/design/worker.md`, and `sai/commands/design/steps/`.

### Requirement: Design coordinator diagnoses the main path only after non-clean closure

The routed design coordinator SHALL declare the existing recovery policy together with the design worker's main artifact ownership and SHALL preserve the existing overview-generation recovery path. Its clean route remains a thin router: it SHALL not read code, configuration, change artifacts, or design artifacts and SHALL forward worker payloads without inspecting them. A failed result, a coordinator-disproved completed result, or a completed result carrying a STOP opens a narrowly scoped exception under which the coordinator MAY inspect only `design.md`, `tasks.md`, and `interfaces.md`, plus the read-only proposal/spec inputs needed to establish whether a prior-phase cause is out of scope or owner-in-run. The coordinator SHALL never write an artifact; it SHALL either re-dispatch the same worker with a diagnosis, route recovery to an upstream worker for an owner-in-run diagnosis, or stop with zero attempts. For a post-resolution non-clean main-path trigger with Cause Locus `in-scope`, the coordinator SHALL route through `continue_after_recovery` to the same design worker. For a Cause Locus `owner-in-run` identifying a spec worker that owns the correction boundary, the coordinator SHALL route through `continue_after_recovery` to that upstream spec worker as the first consumer for a prior-phase cause, with that recovery being the upstream worker's correction phase.

#### Scenario: Clean design forwarding remains blind
- **WHEN** the design worker returns a clean progress event, notice, input request, completed result, or cancellation
- **THEN** the coordinator SHALL forward or render it under the existing lifecycle contract
- **AND** SHALL not inspect artifacts or change data

#### Scenario: Main design failure is diagnosed from artifacts
- **WHEN** a resolved design worker returns a failed result on the main design path
- **THEN** the coordinator SHALL inspect the declared design surface before deciding recovery or hand-back
- **AND** SHALL report the named class, artifact, concrete point, and cause locus when evidence permits

#### Scenario: Previous-phase contradiction is not repaired by design
- **WHEN** coordinator inspection shows that contradictory `proposal.md` or `specs/**` caused the design failure
- **THEN** the coordinator SHALL determine whether the cause is out-of-scope (no in-run owner holds the correction boundary) or owner-in-run (an in-run owner holds the correction boundary)
- **AND** if out-of-scope, SHALL identify the prior-phase artifact as out of scope, spend zero recovery slots, and not edit or forward a correction that changes the spec
- **AND** if owner-in-run, SHALL route recovery to the owner worker as the first consumer for prior-phase artifact correction

#### Scenario: Coordinator verification wins
- **WHEN** the design worker reports a safe completed or recoverable result but coordinator artifact verification contradicts it
- **THEN** the coordinator SHALL use its own evidence as authoritative
- **AND** SHALL not emit the design completion sentence until a later worker result is independently clean

#### Scenario: Design coordinator never writes
- **WHEN** a diagnosis is eligible for same-worker or owner-worker recovery
- **THEN** the coordinator SHALL send the ordered diagnosis to the same design worker (in-scope) or to the owner worker (owner-in-run)
- **AND** SHALL not edit `design.md`, `tasks.md`, `interfaces.md`, `proposal.md`, `specs/**`, `.openspec.yaml`, or the overview

### Requirement: Design non-clean diagnosis preserves overview and gate boundaries

Main-path artifact diagnosis SHALL be distinct from the existing post-gate overview-generation lifecycle. It SHALL not change the artifact-feedback gate, overview language transport, overview state machine, architecture-snapshot presentation, progress-plan reconciliation, or the existing design completion sentence boundary. A failed diagnosis or recovery SHALL leave the design phase incomplete.

#### Scenario: Main-path recovery does not generate an overview early
- **WHEN** a main design artifact diagnosis is selected before the feedback gate proceeds
- **THEN** the coordinator SHALL continue only the design worker's main planning route
- **AND** SHALL not dispatch overview generation or emit the design completion sentence

#### Scenario: Overview recovery remains separate
- **WHEN** the feedback gate has proceeded and overview generation fails
- **THEN** the existing overview-generation recovery route SHALL remain authoritative
- **AND** the new main-path artifact inspection rule SHALL not create a second overview loop

### Requirement: Current design harness entrypoints
Claude Code and opencode SHALL invoke the routed design coordinator and their respective design-worker bindings, with active source references pointing to the step-owned contract rather than the deleted invocation body.

#### Scenario: Routed harness starts design
- **WHEN** Claude Code or opencode invokes `/sai-2-design`
- **THEN** its wrapper SHALL enter the routed coordinator and design-worker binding
- **AND** it SHALL NOT fetch a deleted invocation source, retired inline adapter, or removed inline command loader

#### Scenario: Retired inline design entry is excluded
- **WHEN** a maintainer inspects the active `/sai-2-design` entrypoints
- **THEN** the active wrappers SHALL be limited to the Claude Code and opencode routed coordinator and matching worker bindings
- **AND** active source references SHALL point to live step-owned surfaces, with no fetch of a deleted invocation body, retired inline adapter, or removed inline loader

#### Scenario: routed-entrypoint-uses-live-contract
- **WHEN** either supported harness invokes `/sai-2-design`
- **THEN** it enters the routed coordinator and worker binding without fetching a deleted invocation source.

### Requirement: active-harness-entry-boundary

Claude Code and opencode SHALL invoke the routed design coordinator and their respective design-worker bindings. No supported entrypoint SHALL require a legacy loader.

#### Scenario: both harnesses use the routed entry

- **WHEN** either supported harness starts the design phase
- **THEN** it invokes the routed design coordinator and its respective design-worker binding
- **AND** no supported entrypoint requires a legacy loader

### Requirement: coordinator-has-no-file-search-shell-git-web-openspec-access

The design coordinator SHALL NOT have file, search, shell, git, web, or OpenSpec access on the clean lifecycle route. All technical I/O SHALL be delegated to the design planning worker, and completed-step stamps SHALL derive from worker-authored `emitted_on` without a wall-clock shell call. The sole additional authority is a non-clean-closure diagnosis route: after resolution, and only for a failed result, a coordinator-disproved completed result, or a completed result carrying a STOP, the coordinator MAY read the declared planning artifacts and read-only prior-phase inputs needed to establish cause. It SHALL not write those artifacts or perform source-code discovery through this exception. The single clean-route exception beyond diagnosis is the no-commit guard: the design coordinator SHALL run the guard's `snapshot` and `verify` tool invocations (`sai/tools/no-commit-guard.js`) immediately before each dispatch and same-worker continuation and immediately after every returned result, before acting on it, and those two tool invocations per window are the coordinator's only git observations on the artifact-blind clean route. No other rule of this requirement changes.

#### Scenario: coordinator restricted to clean coordination

- **WHEN** the design coordinator is active on a clean route
- **THEN** it SHALL not perform file reads, globs, grep, shell commands, git operations, web fetches, or OpenSpec commands
- **AND** it SHALL delegate all such operations to the design planning worker
- **AND** completed-step stamps SHALL be read from worker payloads without a shell clock call

#### Scenario: non-clean exception is narrow

- **WHEN** a post-resolution non-clean closure is received
- **THEN** the coordinator MAY read only the declared planning artifacts and the named prior-phase artifacts needed for diagnosis
- **AND** it SHALL not use the exception on progress, notice, input, cancellation, or clean completion

#### Scenario: the guard's two tool invocations are the only clean-route git access

- **WHEN** the design coordinator snapshots before a dispatch and verifies after the returned result
- **THEN** those two no-commit-guard tool invocations are its only git observations on the clean route
- **AND** every other technical I/O stays delegated to the design planning worker

### Requirement: worker-delegates-explore-only

The design planning worker SHALL delegate source discovery only to its permitted budget-explorer/explore binding.

#### Scenario: explore-only delegation
- **WHEN** the worker needs source code discovery
- **THEN** it SHALL delegate to the budget-explorer or explore agent only
- **AND** SHALL NOT delegate to any other agent type

### Requirement: The design coordinator is a conversational control plane

For routed `/sai-2-design` invocations, the coordinator SHALL preserve slash-command invocation and interactive navigation while performing no OpenSpec command execution, change resolution, prerequisite checking, codebase inspection, artifact reading, artifact writing, or technical design reasoning on the clean route. It SHALL delegate technical workflow to the design worker through the harness binding. The coordinator MAY perform the narrow presence check needed to choose the active static progress-plan variant from the original `arguments_value` request before dispatch; it SHALL not consume a language value, validate option syntax, default a language, or reinterpret the request. The request SHALL remain `arguments_value` only. It SHALL print worker notices exactly as authored and resume the same worker, while progress state remains coordinator-owned.

#### Scenario: Routed design invocation begins

- **WHEN** Claude Code or opencode invokes `/sai-2-design` with arguments
- **THEN** the coordinator dispatches a design worker without resolving the change, reading an artifact, or inspecting the codebase
- **AND** it forwards only `arguments_value`

#### Scenario: Presence selection does not replace worker validation

- **WHEN** the raw envelope contains an invalid, missing-value, or duplicate `--overview-lang` form
- **THEN** the coordinator still only selects the presence-based plan
- **AND** the worker owns validation and returns the pre-resolution failure without overview dispatch

#### Scenario: Technical work is required

#### Scenario: Non-clean diagnosis is not technical ownership
- **WHEN** a non-clean closure triggers the coordinator's permitted artifact inspection
- **THEN** the coordinator SHALL use the evidence only to choose routing, cause locus, and hand-back or same-worker continuation
- **AND** the worker SHALL remain the owner of correction and verification
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
- **THEN** a cancelled result SHALL stop cleanly without diagnosis, while a resolved failed result SHALL enter the shared non-clean diagnosis route
- **AND** the coordinator SHALL not attempt an artifact repair or fabricate a successful terminal

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

The unopted-in plan SHALL contain exactly the first six steps in the same order and labels and SHALL contain no `overview` or replacement `skipped` step. Both declarations SHALL compare equal for the selected variant. The plan is static and fully known before worker dispatch; it is not carried in the envelope, emitted as a lifecycle field, or inferred from a worker result. The plan SHALL NOT contain a standalone `specs-approval` step. While the static `step_pointer_map` is in force, every progress-event continuation payload SHALL additionally carry the deterministic `Active step:` pointer line derived from that map, and artifact-feedback and `continue_after_recovery` continuations SHALL carry no pointer line so the worker's active step persists across them.

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

#### Scenario: feedback continuation leaves the active step unchanged

- **WHEN** the coordinator forwards supplied feedback text to the same design worker
- **THEN** the continuation carries no `Active step:` line and the worker continues under the step file already active in its continuous session

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

### Requirement: Design coordinator declares a static step_pointer_map over both plans' superset

The design coordinator card SHALL declare a static optional `step_pointer_map` — fully known at dispatch, immutable for the invocation, and never carried in the dispatch envelope or any reconstruction field — mapping every declared step id from both plans' superset to its just-in-time instruction pointer: `prereqs-resolution` to none and `research`, `design`, `tasks`, `interfaces`, `review`, and `overview` each to their file under `sai/commands/design/steps/`. Base-plan activations SHALL NOT derive the inert `overview` pointer entry; pointer derivation SHALL consult only steps declared in the active plan. Replacement reconstruction SHALL require the departing worker's `active_step_id`, and the replacement's first continuation SHALL carry the correct pointer line for that active step.

#### Scenario: base-plan activation never derives the inert entry

- **WHEN** the unopted six-step plan is active and pointer derivation runs after a progress event
- **THEN** derivation consults only the six declared base-plan steps and never emits an `Active step:` line naming `overview`

#### Scenario: replacement resumes at the departed worker's active step

- **WHEN** the coordinator reconstructs one replacement worker from complete state including the departing worker's `active_step_id`
- **THEN** the replacement's first continuation carries the pointer line naming that active step and its `sai/commands/design/steps/` path

