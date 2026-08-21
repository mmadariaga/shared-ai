# Artifact Feedback Gate Specification

## Purpose

Define the shared user-facing and machine-feedback processing semantics for artifact review gates.

## Requirements

### Requirement: Routed coordinators own one feedback-text prompt emission

For routed sai-1 and sai-2, the coordinator SHALL be the sole owner of the user-facing feedback-text prompt after the user selects the feedback option. The coordinator SHALL emit that prompt exactly once for each such selection, wait for the user's reply, and forward the supplied text to the same worker. The worker MUST NOT emit, re-present, or otherwise duplicate the prompt; it SHALL only process the text received from the coordinator using the shared gate rules.

Exactly one routed coordinator prompt is emitted for each feedback selection.

#### Scenario: routed sai-1 delegates feedback text without duplicating the prompt

- **WHEN** the routed sai-1 user selects the feedback option
- **THEN** the coordinator emits exactly one clean feedback-text prompt naming `proposal.md` and `specs/**`, waits for the reply, and forwards that reply to the same spec-proposal worker
- **AND** the worker does not emit or re-present the prompt

#### Scenario: routed sai-2 delegates feedback text without duplicating the prompt

- **WHEN** the routed sai-2 user selects the feedback option
- **THEN** the coordinator emits exactly one clean feedback-text prompt naming `design.md`, `tasks.md`, and `interfaces.md`, waits for the reply, and forwards that reply to the same design-planning worker
- **AND** the worker does not emit or re-present the prompt

#### Scenario: repeated selections have separate single emissions

- **WHEN** the user selects the feedback option on more than one gate iteration
- **THEN** each selection produces exactly one prompt emission for that selection
- **AND** no selection causes an additional prompt emission from either the coordinator or worker

### Requirement: Shared parameterized gate instruction

The gate logic SHALL live in exactly one shared instruction file, `sai/policies/artifact-feedback-gate.md`, parameterized by three required inputs supplied by the fetching body or coordinator — the list of artifacts written in the step (by name), the proceed-option label, and the next action to take when proceed is chosen — plus one optional input, `mode`, whose closed vocabulary is exactly `interactive` and `supervised`. When `mode` is omitted, the gate SHALL behave as `interactive`. When a non-empty `mode` value other than `interactive` or `supervised` is supplied, the gate SHALL STOP and ask for a valid `mode` — it SHALL NOT default that invalid value to `interactive` and SHALL NOT execute supervised auto-proceed. The gate behavior MUST NOT be duplicated inline in either body file or worker contract. The gate SHALL NOT detect invocation context at runtime to choose a mode. The `next-action` value is always the one supplied by the current fetch site; different fetch sites MAY supply different next-actions for the same proceed-label.

#### Scenario: single shared source

- **WHEN** the routed sai-1 coordinator and routed sai-2 coordinator each reach their completion phase
- **THEN** each fetches `sai/policies/artifact-feedback-gate.md` and supplies its own artifact list, proceed-label, and next-action
- **AND** neither coordinator nor worker contract restates the gate's loop logic inline

#### Scenario: Copilot inline consumer remains on the shared policy

- **WHEN** the Copilot inline path reaches its completion phase
- **THEN** it continues to consume the same `sai/policies/artifact-feedback-gate.md` policy without changing its existing feedback behavior

#### Scenario: parameters differ per step

- **WHEN** the shared instruction is fetched by sai-1 versus sai-2
- **THEN** sai-1 passes artifacts `proposal.md` and `specs/**`, proceed-label `Finish step`, and next-action "fire the existing MANDATORY STOP"
- **AND** sai-2 passes artifacts `design.md`, `tasks.md`, and `interfaces.md`, proceed-label `Continue`, and next-action "emit the existing design completion sentence and stop" as the terminal design navigation action

### Requirement: Gate presentation via the harness option-picker

When `mode` is `supervised`, the gate SHALL NOT present the option-picker and SHALL NOT offer feedback or proceed choices to the user; supervised next-action execution is owned solely by `Supervised mode is a sequencing auto-proceed, not gate removal`.

The gate SHALL present its two choices through the harness's native option-picker per the "Closed-choice prompts" rule in `sai/policies/remember.md` (on Claude Code, the `AskUserQuestion` tool). Option labels SHALL be full words. The two options are a feedback option and the step-specific proceed option (`Finish step` for sai-1, `Continue` for sai-2).

The feedback option label SHALL be iteration-aware: on the first presentation of the gate within a given `/sai-*` invocation, the label SHALL read `Give feedback (Recommended)`; on every subsequent re-presentation within the same invocation (i.e. after the user has selected the feedback option and the gate is being offered again), the label SHALL read `Give more feedback`. On the first presentation, only the feedback option carries the `Recommended` marker; on every subsequent re-presentation, neither option carries that marker. The option description text SHALL remain unchanged across iterations. The internal `## On "Give feedback"` section heading in the gate instruction SHALL stay literal and SHALL NOT be re-titled to match the iteration-aware label (it is internal section prose, not user-visible). The iteration-aware label and recommendation-marker rules apply identically under Claude Code, opencode, and Copilot.

#### Scenario: Claude Code presentation

- **WHEN** the gate is reached on Claude Code
- **THEN** it presents exactly two clickable options through `AskUserQuestion` — one to give feedback on the artifacts and one proceed option carrying the step-specific full-word label, with the iteration-aware feedback option label per the requirement above

#### Scenario: labels are full words

- **WHEN** the gate's option labels are drafted
- **THEN** they read as full words (e.g. `Finish step`, `Continue`, `Give feedback (Recommended)`, `Give more feedback`) and never as single- or two-letter abbreviations

#### Scenario: first presentation reads "Give feedback (Recommended)"

- **WHEN** the gate is offered for the first time within a `/sai-*` invocation (the in-conversation iteration counter is 0)
- **THEN** the feedback option label SHALL read `Give feedback (Recommended)` and only the feedback option carries the `Recommended` marker

#### Scenario: subsequent presentations read "Give more feedback"

- **WHEN** the gate is re-offered after the user has previously selected the feedback option within the same `/sai-*` invocation (the in-conversation iteration counter is ≥ 1)
- **THEN** the feedback option label SHALL read `Give more feedback`

#### Scenario: only the label changes between iterations

- **WHEN** the gate is re-offered on the second or later iteration
- **THEN** the feedback option's short label and recommendation markers change according to the iteration rule; the feedback option's description text, the proceed option's label and description, the harness option-picker path, and every other field of both options stay identical to the first presentation
- **AND** on the re-presentation neither option carries the `Recommended` marker

#### Scenario: internal section heading stays literal

- **WHEN** the gate instruction is updated to add the iteration-aware label rule
- **THEN** the internal `## On "Give feedback"` section heading in `sai/policies/artifact-feedback-gate.md` SHALL remain byte-for-byte unchanged — it is internal prose, not user-visible, and re-titling it would be cosmetic noise

#### Scenario: iteration-aware label applies across all three harnesses

- **WHEN** the gate is offered on Claude Code, opencode, or Copilot
- **THEN** the same iteration-aware label and recommendation-marker rules apply — first presentation `Give feedback (Recommended)` with only the feedback option recommended, subsequent `Give more feedback` with neither option recommended — because the rules live in the shared gate instruction that all three harnesses fetch

### Requirement: Per-step artifact listing

When offering the feedback option, the gate SHALL list the artifacts written in that step by name so the user knows exactly what feedback applies to. The list SHALL be `proposal.md` and `specs/**` in sai-1, and `design.md`, `tasks.md`, and `interfaces.md` in sai-2.

#### Scenario: sai-1 lists spec artifacts

- **WHEN** the gate is offered at the end of sai-1
- **THEN** the feedback option names `proposal.md` and `specs/**` as the artifacts open to feedback

#### Scenario: sai-2 lists design artifacts

- **WHEN** the gate is offered at the end of sai-2
- **THEN** the feedback option names `design.md`, `tasks.md`, and `interfaces.md` as the artifacts open to feedback

### Requirement: Gate advertises the free-text feedback channel

When `mode` is `supervised`, the gate SHALL NOT emit the free-text question, free-text option description, review-loop note, or free-text channel advertisement, and SHALL NOT accept a free-text feedback path.

In interactive mode, the artifact feedback gate SHALL add a non-option presentation note immediately before the existing canonical question. The note's prose SHALL be rendered in the user's language per `sai/policies/remember.md` and SHALL explain that the user can use `sai-explore`'s literal `review-loop` token to obtain an artifact review and paste its findings here. Only the command identifier `sai-explore` and the token `review-loop` SHALL remain verbatim English.

The artifact feedback gate SHALL use the canonical question `Share your feedback on {artifacts} below. You can also type feedback directly in the free-text box.` and the canonical `Give feedback` option description `Feedback on {artifacts}; you can also type feedback directly in the free-text box.`, replacing `{artifacts}` with the supplied artifact list and rendering both strings in the user's language per `sai/policies/remember.md`. The shared instruction SHALL use this harness-neutral wording rather than substitute harness-specific labels. The gate SHALL continue to present exactly two declared choices in the existing order: `Give feedback (Recommended)` on the first presentation or `Give more feedback` thereafter, followed by the supplied proceed option. The note is informational presentation text, not a third option, feedback input, approval, or progress event. The option labels, ordering, `Recommended` marker, iteration counter, proceed-label values, artifact list, and proceed semantics SHALL remain unchanged.

#### Scenario: initial gate advertises free-text feedback

- **WHEN** the gate is presented for the first time in a sai-1 or sai-2 step
- **THEN** its question reads `Share your feedback on {artifacts} below. You can also type feedback directly in the free-text box.` after `{artifacts}` is replaced and the text is rendered in the user's language
- **AND** the `Give feedback (Recommended)` option description reads `Feedback on {artifacts}; you can also type feedback directly in the free-text box.` after the same replacement and language rendering
- **AND** the declared options remain `Give feedback (Recommended)` followed by the step-specific proceed option

#### Scenario: later gate presentations preserve the existing controls

- **WHEN** the gate is re-presented after a feedback turn completes
- **THEN** its question and feedback option description continue to use the same canonical wording, with the current artifact list and language rendering
- **AND** the feedback label is `Give more feedback`, the `Recommended` marker is absent, the option order is unchanged, and the iteration counter follows the existing in-conversation rules

#### Scenario: review-loop note is not a third choice

- **WHEN** the interactive gate renders its presentation
- **THEN** the review-loop note SHALL not be emitted as an option or interpreted as feedback
- **AND** exactly two clickable options SHALL remain available

#### Scenario: supervised mode remains picker-free

- **WHEN** the gate is applied with `mode = supervised`
- **THEN** it SHALL emit neither the review-loop note nor the interactive question
- **AND** it SHALL retain the existing supervised sequencing auto-proceed rules

### Requirement: Free-text replies enter existing feedback processing

A non-empty reply supplied through the harness-provided free-text channel that does not select either declared gate option SHALL be treated as potential feedback and SHALL enter the existing `## On "Give feedback"` per-item processing directly. The gate SHALL apply the existing legitimacy judgment, artifact-only edits, discard reporting, summary recomputation, iteration increment, and re-offer behavior without adding a feedback prompt or changing worker-lifecycle payloads. Selecting the declared feedback option SHALL retain the existing clean follow-up prompt and wait behavior for surfaces that use that path.

#### Scenario: free-text reply is processed without a second prompt

- **WHEN** the user types non-empty feedback into the free-text box while responding to the gate
- **THEN** the gate passes that text directly to the existing `## On "Give feedback"` per-item processing
- **AND** legitimate items edit only the supplied artifacts, illegitimate items are discarded with specific reasons, and questions are answered without artifact edits
- **AND** the gate recomputes the decision summary, increments the iteration counter, and re-offers the gate using the existing semantics
- **AND** no additional clean feedback-text prompt is emitted for that free-text reply

#### Scenario: question-only free-text feedback follows existing turn semantics

- **WHEN** the free-text reply is a question that is answered without editing any supplied artifact
- **THEN** the gate still recomputes the decision summary, increments the iteration counter, and re-offers the gate using the existing semantics
- **AND** the next feedback label is `Give more feedback` and no artifact edit is implied by the counter transition

#### Scenario: declared feedback option retains the follow-up path

- **WHEN** the user selects `Give feedback` or `Give more feedback` rather than supplying free-text in the picker response
- **THEN** the gate retains the existing single clean prompt naming the supplied artifacts, waits for the next reply, and feeds that reply into the same per-item processing
- **AND** the gate does not report or imply that the empty selection turn contained no feedback

#### Scenario: surfaces without a free-text channel remain supported

- **WHEN** the active surface does not provide a free-text reply channel
- **THEN** the two declared gate options and the existing follow-up feedback path remain available without a harness-conditional rule in the shared gate

### Requirement: Feedback loop — edit, resummarize, re-offer

When the user selects the feedback option, the gate SHALL apply the user's feedback by editing the listed artifacts in place, then reprint the step's existing decision summary derived from the updated artifacts, then re-offer the same gate. This loop SHALL repeat until the user selects the proceed option.

#### Scenario: one feedback iteration

- **WHEN** the user selects the feedback option and provides feedback
- **THEN** the gate edits the relevant listed artifacts in place, reprints the decision summary computed from the updated artifacts, and presents the gate again with the same two options

#### Scenario: loop terminates on proceed

- **WHEN** the user selects the proceed option at any iteration
- **THEN** the loop stops and the gate performs the step's proceed branch

### Requirement: Feedback is applied selectively, not blindly

When the user selects the feedback option, the gate SHALL evaluate each feedback item independently and apply only those that are legitimate. An item is illegitimate when it: contradicts the change's Why/scope or the artifact's purpose; would violate an established constraint (`artifact-only-scope`, Isolation Mode, atomic-commit planning, etc.); is factually contradicted by the just-written artifacts or the codebase; is out of phase for the step (e.g. design decisions requested during the spec-only sai-1 phase); or is internally contradictory or would remove a testable requirement without replacement.

The gate SHALL report every discarded item individually — the item and the reason it was not applied — before reprinting the decision summary and re-offering the gate. The discard SHALL be soft: a reported item MAY be reimposed by the user on the next iteration, and once reimposed the gate applies it as ordinary feedback.

#### Scenario: legitimate feedback is applied

- **WHEN** the user provides a feedback item that improves or corrects an artifact within scope
- **THEN** the gate edits the relevant listed artifact in place to reflect it

#### Scenario: illegitimate item is discarded with a reported reason

- **WHEN** a feedback item is out of scope, factually wrong against the artifacts, or would violate an established constraint
- **THEN** the gate does NOT apply it, and reports the item together with the specific reason it was not applied, before reprinting the summary and re-offering the gate

#### Scenario: mixed feedback is split per item

- **WHEN** a single feedback turn contains both legitimate and illegitimate items
- **THEN** the gate applies the legitimate items and reports each discarded item separately with its own reason — never applying or rejecting the whole turn as a unit

#### Scenario: discard is soft and reopenable

- **WHEN** the user reimposes a previously discarded item on a later gate iteration
- **THEN** the gate treats it as ordinary feedback and applies it, rather than silently discarding it again

### Requirement: Routed design adapts ownership without forking gate semantics

The shared gate instruction, `sai/policies/artifact-feedback-gate.md`, SHALL remain the single source of artifact lists, option labels and order, recommendation-marker behavior, iteration semantics, selective feedback rules, summary placement, and proceed behavior for both sai-1 and sai-2. The routed design adapter MAY assign presentation state, including the single feedback-text prompt emission, to the coordinator and design-artifact evaluation and edits to the worker, but SHALL NOT duplicate or change those shared semantics.

#### Scenario: Shared gate policy is updated for routed design

- **WHEN** `sai/policies/artifact-feedback-gate.md` gains coordinator-worker ownership guidance
- **THEN** the guidance SHALL explicitly preserve the Copilot inline execution path and SHALL keep one canonical definition of the gate's user-visible and selective-edit behavior

#### Scenario: Routed design retains its artifact set

- **WHEN** routed `/sai-2-design` presents or processes the shared feedback gate
- **THEN** the coordinator SHALL name exactly `design.md`, `tasks.md`, and `interfaces.md`, and the worker SHALL selectively edit only those artifacts before returning the recomputed design summary

### Requirement: Proceed branches per step

The proceed option SHALL perform a step-specific next action. In sai-1, selecting `Finish step` SHALL trigger the existing MANDATORY STOP. In sai-2, selecting `Continue` SHALL emit the existing design completion sentence and stop without presenting a continuation question or dispatching an implementation worker.

#### Scenario: sai-1 proceed fires the stop

- **WHEN** the user selects `Finish step` in the sai-1 gate
- **THEN** the existing MANDATORY STOP fires and the step ends with its standard stop message

#### Scenario: sai-2 proceed completes design

- **WHEN** the user selects `Continue` in the sai-2 gate
- **THEN** the existing design completion sentence is emitted and the step stops
- **AND** no continuation question is presented and no implementation worker is dispatched

### Requirement: Gate placement after the decision summary

The gate SHALL be inserted after the step's existing decision summary and SHALL NOT modify the existing decision-summary blocks. In sai-1 the gate sits between the decision summary and the MANDATORY STOP; in sai-2 it sits between the decision summary and the existing design completion sentence, which is emitted only after the user selects `Continue`.

#### Scenario: decision summary is unchanged

- **WHEN** either body file is updated to add the gate
- **THEN** the existing decision-summary section is left byte-for-byte intact and the gate is added after it

#### Scenario: sai-2 gate precedes design completion

- **WHEN** sai-2 reaches completion
- **THEN** the order is: decision summary, then the feedback gate, then the existing design completion sentence only after the user selects `Continue`

### Requirement: Loop respects artifact-only-scope

Every edit made during the feedback loop SHALL stay within the step's artifact-only scope. In sai-1 the loop MAY edit only `proposal.md` and `specs/**`; in sai-2 the loop MAY edit only `design.md`, `tasks.md`, and `interfaces.md`. The loop MUST NOT touch project source, configuration, or any file outside the step's allowed set.

#### Scenario: sai-1 edit stays in scope

- **WHEN** the user's sai-1 feedback would require changing behavior
- **THEN** the loop edits only `proposal.md` and/or `specs/**` files and never any project source or configuration file

#### Scenario: sai-2 edit stays in scope

- **WHEN** the user's sai-2 feedback would require changing behavior
- **THEN** the loop edits only `design.md`, `tasks.md`, and/or `interfaces.md` and never any project source or configuration file

### Requirement: Loop preserves Isolation Mode

The feedback loop SHALL operate purely as same-session interaction grounded in the just-written artifacts. It MUST NOT introduce prior-conversation or external context. Reprinted summaries SHALL trace only to the updated artifacts, consistent with the step's existing Isolation Mode and decision-summary tracing rules.

#### Scenario: no context pollution in the loop

- **WHEN** the gate reprints the decision summary after a feedback edit
- **THEN** every summary line traces to content in the updated step artifacts and no information from prior conversation appears

### Requirement: Selecting the feedback option prompts cleanly for feedback text

Because the gate is presented through a harness option-picker, selecting the feedback option itself carries no feedback text. A harness-provided free-text reply is a separate input path governed by `Free-text replies enter existing feedback processing`. On selecting the declared feedback option, the gate SHALL FIRST emit exactly one clean, non-accusatory prompt that names the step's `artifacts` and invites the user to supply their feedback in the next turn. The coordinator owns this emission on routed sai-1 and sai-2; the worker SHALL NOT emit a second copy. The gate SHALL NOT report or imply that no feedback was supplied, and SHALL NOT run the per-item split/evaluate processing on an empty turn.

The prompt's canonical form is `Share your feedback on {artifacts} below.`, where `{artifacts}` is replaced by the step's artifact list. Following the established explore.md item-3 pattern, this canonical form is authored in English but is NOT output verbatim in English: it is rendered in the user's language at runtime per `sai/policies/remember.md` (for a Spanish-speaking user it reads `Indícame a continuación tu feedback sobre {artifacts}`). Only when the user's language is English is the English form output as-is.

After emitting this prompt exactly once, the gate SHALL wait for the user's reply, then apply the existing per-item feedback processing (`## On "Give feedback"`) to the supplied text. The existing selective-application, discard-reporting, resummarize, and re-offer behavior is unchanged; this requirement only inserts the single clean prompt-and-wait step ahead of it.

#### Scenario: feedback option emits one clean prompt naming the artifacts

- **WHEN** the user selects the feedback option in the gate
- **THEN** the coordinator emits exactly one clean prompt that names the step's `artifacts` and asks the user to supply feedback in the next turn
- **AND** it does not report that no feedback was found, run per-item processing on an empty turn, or permit the worker to emit another prompt

#### Scenario: prompt is rendered in the user's language

- **WHEN** the user's conversation language is not English
- **THEN** the canonical English prompt `Share your feedback on {artifacts} below.` is rendered in the user's language (for Spanish: `Indícame a continuación tu feedback sobre {artifacts}`)
- **AND** when the user's language is English the English form is output as-is

#### Scenario: prompt language rendering uses the canonical policy

- **WHEN** the gate applies the prompt's language-rendering rule
- **THEN** it follows `sai/policies/remember.md` for runtime language rendering
- **AND** it does not reference the non-existent `sai/instructions/remember.md` path

#### Scenario: supplied feedback flows into the existing per-item processing

- **WHEN** the user replies to the single clean prompt with feedback text
- **THEN** the gate applies the existing `## On "Give feedback"` per-item split, selective application, discard reporting, resummarize, and re-offer behavior to that text, unchanged

#### Scenario: artifact list matches the step

- **WHEN** the clean prompt is emitted in sai-1 versus sai-2
- **THEN** `{artifacts}` names `proposal.md` and `specs/**` in sai-1, and `design.md`, `tasks.md`, and `interfaces.md` in sai-2, matching the step's existing artifact list

### Requirement: Iteration counter is in-conversation only

The gate SHALL track the iteration that drives the iteration-aware feedback option label with a single in-conversation counter starting at 0. The counter SHALL be incremented by 1 immediately after each feedback-selection turn completes. The counter SHALL be held in the agent's working memory for the duration of the current session only and SHALL NOT be written to any artifact, configuration file, `.openspec.yaml`, or any other on-disk state. The counter SHALL reset to 0 at the start of every fresh `/sai-*` invocation, so the first presentation of the gate in a new chat always reads `Give feedback (Recommended)`. The counter SHALL NOT be derived from any marker in the gate's own artifact set, hidden comment, or external state.

#### Scenario: counter starts at 0 on the first presentation

- **WHEN** a `/sai-*` invocation reaches the gate for the first time
- **THEN** the counter is 0 and the feedback option label reads `Give feedback (Recommended)`

#### Scenario: counter increments after a feedback turn completes

- **WHEN** the user selects the feedback option and the gate applies the feedback, reprints the decision summary, and re-offers the gate
- **THEN** the counter has been incremented by 1 before the next presentation, and the next presentation of the feedback option label reads `Give more feedback`

#### Scenario: counter is not written to disk

- **WHEN** the gate tracks the iteration counter
- **THEN** no artifact under `openspec/changes/{change-name}/` (including `proposal.md`, `design.md`, `tasks.md`, `interfaces.md`, `specs/**`, `review.md`, `security.md`, `performance.md`, `accessibility.md`, `implementation.md`, or `.openspec.yaml`) is created or modified to record the counter, and no project source or configuration file outside the change directory is touched to record the counter

#### Scenario: counter resets across invocations

- **WHEN** a new `/sai-*` invocation reaches the gate
- **THEN** the counter is 0 for that invocation regardless of any prior chat's history, and the first presentation of the feedback option label reads `Give feedback (Recommended)`

#### Scenario: counter is not derived from artifact state

- **WHEN** the gate tracks the iteration counter
- **THEN** the counter is held in the agent's working memory only — it is NOT re-derived from a marker in `proposal.md`, `design.md`, `tasks.md`, `interfaces.md`, `specs/**`, `review.md`, `security.md`, `performance.md`, `accessibility.md`, `implementation.md`, or `.openspec.yaml`, and it is NOT re-derived from any external or prior-conversation context (Isolation Mode)

### Requirement: Machine review findings use a pre-gate adapter

The shared artifact feedback gate capability SHALL define one machine-feedback adapter for supervised sai-1 review findings. For every completed review round in the bounded convergence loop, the adapter SHALL accept that round's structured findings array — each finding conforming to the shared review finding contract of the `review-finding-format` capability — continue each finding to the same spec-proposal worker, and apply the gate's canonical per-item split, legitimacy judgment, artifact-only edit, discard-reason, and decision-summary recomputation rules. These semantics and the finding shape SHALL remain single-sourced in the shared gate instruction and the shared review finding contract and SHALL NOT be restated in explore or reviewer instructions.

Machine-feedback processing is not a user feedback-selection turn. It SHALL NOT present the gate picker, emit the empty-turn prompt for user feedback text, increment the in-conversation iteration counter, or execute the proceed branch. The ordinary user-facing gate SHALL be deferred while the review round's machine-feedback processing is still in progress and SHALL be presented for the first time at iteration 0 only after the review rounds converge or exhaust the three-round cap. The supervised cap is at most three rounds per phase per Auto attempt and resets for each new Auto attempt. Its first options SHALL remain `Give feedback (Recommended)` before `Finish step`. Gate ownership, option labels, iteration-counter rules, and the worker-failure-interruption branch are unchanged by this requirement; only the deferred-gate exhaustion trigger tracks the three-round bound owned by `supervised-review-rounds`.

#### Scenario: machine findings are accepted for evaluation

- **WHEN** a supervised sai-1 review round returns one or more structured findings
- **THEN** each finding conforms to the shared review finding contract of the `review-finding-format` capability
- **AND** the shared machine-feedback adapter sends each finding to the same spec-proposal worker for canonical per-item evaluation
- **AND** accepted edits stay within `proposal.md` and `specs/**`
- **AND** every discarded finding is reported with its specific reason

#### Scenario: High finding schedules another round

- **WHEN** a completed review round contains a `High` finding and another round remains within the bound
- **THEN** machine-feedback processing completes without presenting or advancing the user-facing gate
- **AND** the iteration counter remains 0
- **AND** the gate's in-conversation iteration counter remains 0 for the later first presentation

#### Scenario: convergence reaches the ordinary gate

- **WHEN** a completed review round contains no `High` findings and its machine feedback has been processed
- **THEN** the ordinary user-facing gate is presented at iteration 0
- **AND** the first user-facing option remains `Give feedback (Recommended)`

#### Scenario: cap exhaustion reaches the ordinary gate

- **WHEN** machine-feedback processing completes for a third review round that contained `High` findings
- **THEN** no later review round is dispatched
- **AND** the ordinary user-facing gate is presented at iteration 0

### Requirement: Supervised mode is a sequencing auto-proceed, not gate removal

When `mode` is `supervised`, the gate SHALL keep its role as a phase sequencer: it SHALL perform the supplied `next-action` exactly once after the deferred-gate condition resolves (convergence, one-round cap exhaustion, or empty findings). Supervised mode SHALL NOT delete the gate call, invent a combined post-sai-2 gate, write `.openspec.yaml`, or act as an approval gate. Supervised mode SHALL add no new conversation text of its own; visibility remains the reports the fetching body already emits at those points. Execution of `next-action` under supervised mode is owned by the shared gate policy, not reimplemented inline by the fetching body.

#### Scenario: supervised proceed executes the fetch site's supplied next-action
- **WHEN** `mode` is `supervised` and the deferred-gate condition resolves
- **THEN** the gate performs exactly the `next-action` supplied by that fetch site
- **AND** it performs that action exactly once
- **AND** it does not substitute a different fetch site's next-action

#### Scenario: supervised mode never writes approval state
- **WHEN** `mode` is `supervised` and the gate auto-proceeds
- **THEN** the gate does not write `.openspec.yaml`
- **AND** the gate does not ask for or record approval

#### Scenario: empty findings converge

- **WHEN** a review round returns an empty findings array
- **THEN** the adapter makes no artifact edit
- **AND** the ordinary user-facing gate is presented at iteration 0
