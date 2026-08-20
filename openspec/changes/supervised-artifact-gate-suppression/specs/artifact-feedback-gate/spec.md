## MODIFIED Requirements

### Requirement: Shared parameterized gate instruction

The gate logic SHALL live in exactly one shared instruction file, `sai/policies/artifact-feedback-gate.md`, parameterized by three required inputs supplied by the fetching body or coordinator — the list of artifacts written in the step (by name), the proceed-option label, and the next action to take when proceed is chosen — plus one optional input, `mode`, whose closed vocabulary is exactly `interactive` and `supervised`. When `mode` is omitted, the gate SHALL behave as `interactive`. When a non-empty `mode` value other than `interactive` or `supervised` is supplied, the gate SHALL STOP and ask for a valid `mode` — it SHALL NOT default that invalid value to `interactive` and SHALL NOT execute supervised auto-proceed. The optional-`mode` omitted default is a bounded exception to the gate's missing-parameter STOP rule; that STOP rule SHALL continue to apply unchanged to the three required parameters and to invalid non-empty `mode` values. The gate behavior MUST NOT be duplicated inline in either body file or worker contract. The gate SHALL NOT detect invocation context at runtime to choose a mode. The `next-action` value is always the one supplied by the current fetch site; different fetch sites MAY supply different next-actions for the same proceed-label.

#### Scenario: single shared source

- **WHEN** the routed sai-1 coordinator and routed sai-2 coordinator each reach their completion phase
- **THEN** each fetches `sai/policies/artifact-feedback-gate.md` and supplies its own artifact list, proceed-label, and next-action
- **AND** neither coordinator nor worker contract restates the gate's loop logic inline

#### Scenario: Copilot inline consumer remains on the shared policy

- **WHEN** the Copilot inline path reaches its completion phase
- **THEN** it continues to consume the same `sai/policies/artifact-feedback-gate.md` policy without changing its existing feedback behavior

#### Scenario: parameters differ per step

- **WHEN** the shared instruction is fetched by the standalone sai-1 coordinator versus the standalone sai-2 coordinator
- **THEN** sai-1 passes artifacts `proposal.md` and `specs/**`, proceed-label `Finish step`, and next-action "fire the existing MANDATORY STOP"
- **AND** sai-2 passes artifacts `design.md`, `tasks.md`, and `interfaces.md`, proceed-label `Continue`, and next-action "emit the existing design completion sentence and stop" as the terminal design navigation action

#### Scenario: supervised design fetch site supplies a different next-action

- **WHEN** explore's supervised design-phase gate site supplies the shared gate
- **THEN** it passes artifacts `design.md`, `tasks.md`, and `interfaces.md`, proceed-label `Continue`, next-action equal to overview generation plus the supervised design terminal, and `mode = supervised`
- **AND** that next-action differs from the standalone sai-2 coordinator's completion-sentence next-action by design

#### Scenario: omitted mode defaults to interactive

- **WHEN** a fetch site supplies artifacts, proceed-label, and next-action but omits `mode`
- **THEN** the gate behaves as `interactive`
- **AND** it does not STOP for the missing optional parameter

#### Scenario: invalid mode value stops

- **WHEN** a fetch site supplies a non-empty `mode` value other than `interactive` or `supervised`
- **THEN** the gate STOPs and asks for a valid `mode`
- **AND** it does not default the invalid value to `interactive`
- **AND** it does not execute supervised auto-proceed

#### Scenario: missing required parameter still stops

- **WHEN** a fetch site omits artifacts, proceed-label, or next-action
- **THEN** the gate STOPs and asks for the missing required parameter
- **AND** it does not assume a default for that required parameter

#### Scenario: mode is declared at the fetch site, not detected

- **WHEN** the gate chooses between interactive presentation and supervised auto-proceed
- **THEN** the choice is determined only by the `mode` value supplied (or defaulted) at the fetch site
- **AND** the gate does not inspect conversation history, caller identity, or runtime invocation context to select a mode

### Requirement: Gate presentation via the harness option-picker

When `mode` is `interactive` (including the omitted-mode default), the gate SHALL present its two choices through the harness's native option-picker per the "Closed-choice prompts" rule in `sai/policies/remember.md` (on Claude Code, the `AskUserQuestion` tool). Option labels SHALL be full words. The two options are a feedback option and the step-specific proceed option (`Finish step` for sai-1, `Continue` for sai-2).

The feedback option label SHALL be iteration-aware: on the first presentation of the gate within a given `/sai-*` invocation, the label SHALL read `Give feedback (Recommended)`; on every subsequent re-presentation within the same invocation (i.e. after the user has selected the feedback option and the gate is being offered again), the label SHALL read `Give more feedback`. On the first presentation, only the feedback option carries the `Recommended` marker; on every subsequent re-presentation, neither option carries that marker. The option description text SHALL remain unchanged across iterations. The internal `## On "Give feedback"` section heading in the gate instruction SHALL stay literal and SHALL NOT be re-titled to match the iteration-aware label (it is internal section prose, not user-visible). The iteration-aware label and recommendation-marker rules apply identically under Claude Code, opencode, and Copilot.

When `mode` is `supervised`, the gate SHALL NOT present the option-picker and SHALL NOT offer feedback or proceed choices to the user; supervised next-action execution is owned solely by the requirement `Supervised mode is a sequencing auto-proceed, not gate removal`.

#### Scenario: Claude Code presentation

- **WHEN** `mode` is `interactive` and the gate is reached on Claude Code
- **THEN** it presents exactly two clickable options through `AskUserQuestion` — one to give feedback on the artifacts and one proceed option carrying the step-specific full-word label, with the iteration-aware feedback option label per the requirement above

#### Scenario: labels are full words

- **WHEN** the gate's option labels are drafted for an interactive presentation
- **THEN** they read as full words (e.g. `Finish step`, `Continue`, `Give feedback (Recommended)`, `Give more feedback`) and never as single- or two-letter abbreviations

#### Scenario: first presentation reads "Give feedback (Recommended)"

- **WHEN** `mode` is `interactive` and the gate is offered for the first time within a `/sai-*` invocation (the in-conversation iteration counter is 0)
- **THEN** the feedback option label SHALL read `Give feedback (Recommended)` and only the feedback option carries the `Recommended` marker

#### Scenario: subsequent presentations read "Give more feedback"

- **WHEN** `mode` is `interactive` and the gate is re-offered after the user has previously selected the feedback option within the same `/sai-*` invocation (the in-conversation iteration counter is ≥ 1)
- **THEN** the feedback option label SHALL read `Give more feedback`

#### Scenario: only the label changes between iterations

- **WHEN** `mode` is `interactive` and the gate is re-offered on the second or later iteration
- **THEN** the feedback option's short label and recommendation markers change according to the iteration rule; the feedback option's description text, the proceed option's label and description, the harness option-picker path, and every other field of both options stay identical to the first presentation
- **AND** on the re-presentation neither option carries the `Recommended` marker

#### Scenario: internal section heading stays literal

- **WHEN** the gate instruction is updated to add the iteration-aware label rule
- **THEN** the internal `## On "Give feedback"` section heading in `sai/policies/artifact-feedback-gate.md` SHALL remain byte-for-byte unchanged — it is internal prose, not user-visible, and re-titling it would be cosmetic noise

#### Scenario: iteration-aware label applies across all three harnesses

- **WHEN** `mode` is `interactive` and the gate is offered on Claude Code, opencode, or Copilot
- **THEN** the same iteration-aware label and recommendation-marker rules apply — first presentation `Give feedback (Recommended)` with only the feedback option recommended, subsequent `Give more feedback` with neither option recommended — because the rules live in the shared gate instruction that all three harnesses fetch

#### Scenario: supervised mode presents no option-picker

- **WHEN** `mode` is `supervised` and the deferred-gate condition resolves
- **THEN** the gate does not present the harness option-picker
- **AND** supervised next-action execution follows `Supervised mode is a sequencing auto-proceed, not gate removal`

### Requirement: Gate advertises the free-text feedback channel

When `mode` is `interactive` (including the omitted-mode default), the artifact feedback gate SHALL use the canonical question `Share your feedback on {artifacts} below. You can also type feedback directly in the free-text box.` and the canonical `Give feedback` option description `Feedback on {artifacts}; you can also type feedback directly in the free-text box.`, replacing `{artifacts}` with the supplied artifact list and rendering both strings in the user's language per `sai/policies/remember.md`. The shared instruction SHALL use this harness-neutral wording rather than substitute harness-specific labels. The gate SHALL continue to present exactly two declared choices in the existing order: `Give feedback (Recommended)` on the first presentation or `Give more feedback` thereafter, followed by the supplied proceed option. The option labels, ordering, `Recommended` marker, iteration counter, proceed-label values, artifact list, and proceed semantics SHALL remain unchanged under interactive mode.

When `mode` is `supervised`, the gate SHALL NOT emit the free-text question, free-text option description, or free-text channel advertisement, and SHALL NOT accept a free-text feedback path.

#### Scenario: initial gate advertises free-text feedback

- **WHEN** `mode` is `interactive` and the gate is presented for the first time in a sai-1 or sai-2 step
- **THEN** its question reads `Share your feedback on {artifacts} below. You can also type feedback directly in the free-text box.` after `{artifacts}` is replaced and the text is rendered in the user's language
- **AND** the `Give feedback (Recommended)` option description reads `Feedback on {artifacts}; you can also type feedback directly in the free-text box.` after the same replacement and language rendering
- **AND** the declared options remain `Give feedback (Recommended)` followed by the step-specific proceed option

#### Scenario: later gate presentations preserve the existing controls

- **WHEN** `mode` is `interactive` and the gate is re-presented after a feedback turn completes
- **THEN** its question and feedback option description continue to use the same canonical wording, with the current artifact list and language rendering
- **AND** the feedback label is `Give more feedback`, the `Recommended` marker is absent, the option order is unchanged, and the iteration counter follows the existing in-conversation rules

#### Scenario: supervised mode omits free-text channel

- **WHEN** `mode` is `supervised` and the deferred-gate condition resolves
- **THEN** the gate does not emit the free-text question or free-text option description
- **AND** it does not accept a free-text feedback path

### Requirement: Proceed branches per step

The proceed option SHALL perform the `next-action` supplied by the current fetch site. When `mode` is `interactive` and the standalone sai-1 coordinator is the fetch site, selecting `Finish step` SHALL trigger the existing MANDATORY STOP. When `mode` is `interactive` and the standalone sai-2 coordinator is the fetch site, selecting `Continue` SHALL emit the existing design completion sentence and stop without presenting a continuation question or dispatching an implementation worker. When `mode` is `supervised`, next-action execution without a user selection is owned solely by the requirement `Supervised mode is a sequencing auto-proceed, not gate removal`; the next-action values remain fetch-site-supplied — for explore's supervised spec site the spec-to-design phase transition; for explore's supervised design site overview generation plus the supervised design terminal — and SHALL NOT be substituted with the standalone coordinator next-actions.

#### Scenario: sai-1 proceed fires the stop

- **WHEN** `mode` is `interactive` and the user selects `Finish step` in the standalone sai-1 gate
- **THEN** the existing MANDATORY STOP fires and the step ends with its standard stop message

#### Scenario: sai-2 proceed completes design

- **WHEN** `mode` is `interactive` and the user selects `Continue` in the standalone sai-2 gate
- **THEN** the existing design completion sentence is emitted and the step stops
- **AND** no continuation question is presented and no implementation worker is dispatched

#### Scenario: supervised spec proceed chains design

- **WHEN** `mode` is `supervised` and the deferred-gate condition resolves at explore's supervised spec gate site
- **THEN** supervised next-action execution follows `Supervised mode is a sequencing auto-proceed, not gate removal` with the site's supplied next-action (spec-to-design phase transition)
- **AND** it does not fire the standalone sai-1 MANDATORY STOP

#### Scenario: supervised design proceed generates overview

- **WHEN** `mode` is `supervised` and the deferred-gate condition resolves at explore's supervised design gate site
- **THEN** supervised next-action execution follows `Supervised mode is a sequencing auto-proceed, not gate removal` with the site's supplied next-action (overview generation plus the supervised design terminal)
- **AND** it does not emit the standalone sai-2 completion sentence in place of that next-action

### Requirement: Gate placement after the decision summary

The gate application point SHALL sit after the step's existing decision summary and SHALL NOT modify the existing decision-summary blocks. In interactive sai-1 the gate sits between the decision summary and the MANDATORY STOP; in interactive sai-2 it sits between the decision summary and the existing design completion sentence, which is emitted only after the user selects `Continue`. When `mode` is `supervised`, the same placement relative to the decision summary applies and the user-facing picker is not presented; supervised next-action execution is owned solely by the requirement `Supervised mode is a sequencing auto-proceed, not gate removal`. Reports the fetching body already defines as part of proceed (for example explore item 10's phase-transition report after the spec artifact gate proceeds, and the design-phase counterparts) SHALL keep the order that body already specifies — this placement requirement does not reorder those post-proceed reports before auto-proceed.

#### Scenario: decision summary is unchanged

- **WHEN** either body file is updated to add the gate
- **THEN** the existing decision-summary section is left byte-for-byte intact and the gate is added after it

#### Scenario: sai-2 gate precedes design completion

- **WHEN** `mode` is `interactive` and standalone sai-2 reaches completion
- **THEN** the order is: decision summary, then the feedback gate, then the existing design completion sentence only after the user selects `Continue`

#### Scenario: supervised placement preserves fetching-body post-proceed report order

- **WHEN** `mode` is `supervised` and the deferred-gate condition resolves at an explore gate site
- **THEN** the gate application follows the decision summary without presenting a user picker
- **AND** reports the fetching body defines as part of proceed keep that body's existing order relative to gate proceed (for example the spec phase-transition report after the gate proceeds)

### Requirement: Machine review findings use a pre-gate adapter

The shared artifact feedback gate capability SHALL define one machine-feedback adapter for supervised sai-1 review findings. For every completed review round in the bounded convergence loop, the adapter SHALL accept that round's structured findings array — each finding conforming to the shared review finding contract of the `review-finding-format` capability — continue each finding to the same spec-proposal worker, and apply the gate's canonical per-item split, legitimacy judgment, artifact-only edit, discard-reason, and decision-summary recomputation rules. These semantics and the finding shape SHALL remain single-sourced in the shared gate instruction and the shared review finding contract and SHALL NOT be restated in explore or reviewer instructions.

Machine-feedback processing is not a user feedback-selection turn. It SHALL NOT present the gate picker, emit the empty-turn prompt for user feedback text, increment the in-conversation iteration counter, or execute the proceed branch. The ordinary user-facing gate SHALL be deferred while the review round's machine-feedback processing is still in progress. After the review round converges or exhausts the one-round cap:

- When `mode` is `interactive` (including the omitted-mode default), the ordinary user-facing gate SHALL be presented for the first time at iteration 0. Its first options SHALL remain `Give feedback (Recommended)` before `Finish step`.
- When `mode` is `supervised`, the gate SHALL NOT present the picker, emit the free-text prompt, accept the free-text path, or increment the iteration counter; supervised next-action execution is owned solely by the requirement `Supervised mode is a sequencing auto-proceed, not gate removal`. The iteration counter SHALL remain 0 for the entire supervised run.

#### Scenario: machine findings are accepted for evaluation

- **WHEN** a supervised sai-1 review round returns one or more structured findings
- **THEN** each finding conforms to the shared review finding contract of the `review-finding-format` capability
- **AND** the shared machine-feedback adapter sends each finding to the same spec-proposal worker for canonical per-item evaluation
- **AND** accepted edits stay within `proposal.md` and `specs/**`
- **AND** every discarded finding is reported with its specific reason

#### Scenario: High finding schedules another round

- **WHEN** a completed review round contains a `High` finding and another round remains within the bound
- **THEN** machine-feedback processing completes without presenting or advancing the user-facing gate
- **AND** the next bounded review round remains eligible to dispatch while the gate stays deferred
- **AND** the iteration counter remains 0
- **AND** the gate's in-conversation iteration counter remains 0 for any later first interactive presentation

#### Scenario: interactive convergence reaches the ordinary gate

- **WHEN** `mode` is `interactive` and a completed review round contains no `High` findings and its machine feedback has been processed
- **THEN** the ordinary user-facing gate is presented at iteration 0
- **AND** the first user-facing option remains `Give feedback (Recommended)`

#### Scenario: interactive cap exhaustion reaches the ordinary gate

- **WHEN** `mode` is `interactive` and machine-feedback processing completes for a review round that contained `High` findings and exhausts the one-round cap
- **THEN** no later review round is dispatched
- **AND** the ordinary user-facing gate is presented at iteration 0

#### Scenario: interactive empty findings converge

- **WHEN** `mode` is `interactive` and a review round returns an empty findings array
- **THEN** the adapter makes no artifact edit
- **AND** the ordinary user-facing gate is presented at iteration 0

#### Scenario: supervised convergence auto-proceeds

- **WHEN** `mode` is `supervised` and a completed review round contains no `High` findings and its machine feedback has been processed
- **THEN** the gate does not present the picker, free-text prompt, or free-text path
- **AND** the iteration counter remains 0
- **AND** supervised next-action execution follows `Supervised mode is a sequencing auto-proceed, not gate removal`

#### Scenario: supervised cap exhaustion auto-proceeds

- **WHEN** `mode` is `supervised` and machine-feedback processing completes for a review round that contained `High` findings and exhausts the one-round cap
- **THEN** no later review round is dispatched
- **AND** the gate does not present the picker, free-text prompt, or free-text path
- **AND** the iteration counter remains 0
- **AND** supervised next-action execution follows `Supervised mode is a sequencing auto-proceed, not gate removal`
- **AND** cap exhaustion remains a non-failure outcome

#### Scenario: supervised empty findings auto-proceed

- **WHEN** `mode` is `supervised` and a review round returns an empty findings array
- **THEN** the adapter makes no artifact edit
- **AND** the gate does not present the picker, free-text prompt, or free-text path
- **AND** the iteration counter remains 0
- **AND** supervised next-action execution follows `Supervised mode is a sequencing auto-proceed, not gate removal`

## ADDED Requirements

### Requirement: Supervised mode is a sequencing auto-proceed, not gate removal

When `mode` is `supervised`, the gate SHALL keep its role as a phase sequencer: it SHALL perform the supplied `next-action` exactly once after the deferred-gate condition resolves (convergence, one-round cap exhaustion, or empty findings). Supervised mode SHALL NOT delete the gate call, invent a combined post-sai-2 gate, write `.openspec.yaml`, or act as an approval gate. Supervised mode SHALL add no new conversation text of its own; visibility remains the reports the fetching body already emits at those points. Execution of `next-action` under supervised mode is owned by the shared gate policy, not reimplemented inline by the fetching body.

#### Scenario: supervised proceed executes the fetch site's supplied next-action

- **WHEN** `mode` is `supervised` and the deferred-gate condition resolves
- **THEN** the gate performs exactly the `next-action` supplied by that fetch site — the same action interactive proceed would run at that site
- **AND** it performs that action exactly once
- **AND** it does not substitute a different fetch site's next-action

#### Scenario: supervised mode never writes approval state

- **WHEN** `mode` is `supervised` and the gate auto-proceeds
- **THEN** the gate does not write `.openspec.yaml`
- **AND** the gate does not ask for or record approval
