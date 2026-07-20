# Artifact Feedback Gate Specification

## Requirements

### Requirement: Shared parameterized gate instruction

The gate logic SHALL live in exactly one shared instruction file, `sai/instructions/artifact-feedback-gate.md`, parameterized by three inputs supplied by the fetching body file: the list of artifacts written in the step (by name), the proceed-option label, and the next action to take when proceed is chosen. The gate behavior MUST NOT be duplicated inline in either body file.

#### Scenario: single shared source
- **WHEN** `sai/commands/sai-1-spec.md` and `sai/commands/sai-2-design.md` both reach their completion phase
- **THEN** each fetches `sai/instructions/artifact-feedback-gate.md` and supplies its own artifact list, proceed-label, and next-action, and neither body file restates the gate's loop logic inline

#### Scenario: parameters differ per step
- **WHEN** the shared instruction is fetched by sai-1 versus sai-2
- **THEN** sai-1 passes artifacts `proposal.md` and `specs/**`, proceed-label `Finish step`, and next-action "fire the existing MANDATORY STOP"
- **AND** sai-2 passes artifacts `design.md`, `tasks.md`, and `interfaces.md`, proceed-label `Continue`, and next-action "advance to the existing (a)/(b) implementation question"

### Requirement: Gate presentation via the harness option-picker

The gate SHALL present its two choices through the harness's native option-picker per the "Closed-choice prompts" rule in `sai/instructions/remember.md` (on Claude Code, the `AskUserQuestion` tool). Option labels SHALL be full words. The two options are a feedback option and the step-specific proceed option (`Finish step` for sai-1, `Continue` for sai-2).

The feedback option label SHALL be iteration-aware: on the first presentation of the gate within a given `/sai-*` invocation, the label SHALL read `Give feedback`; on every subsequent re-presentation within the same invocation (i.e. after the user has selected the feedback option and the gate is being offered again), the label SHALL read `Give more feedback`. The option description text SHALL remain unchanged across iterations — only the short label changes between the first presentation and any re-presentation. The internal `## On "Give feedback"` section heading in the gate instruction SHALL stay literal and SHALL NOT be re-titled to match the iteration-aware label (it is internal section prose, not user-visible). The iteration-aware label rule applies identically under Claude Code, opencode, and Copilot.

#### Scenario: Claude Code presentation

- **WHEN** the gate is reached on Claude Code
- **THEN** it presents exactly two clickable options through `AskUserQuestion` — one to give feedback on the artifacts and one proceed option carrying the step-specific full-word label, with the iteration-aware feedback option label per the requirement above

#### Scenario: labels are full words

- **WHEN** the gate's option labels are drafted
- **THEN** they read as full words (e.g. `Finish step`, `Continue`, `Give feedback`, `Give more feedback`) and never as single- or two-letter abbreviations

#### Scenario: first presentation reads "Give feedback"

- **WHEN** the gate is offered for the first time within a `/sai-*` invocation (the in-conversation iteration counter is 0)
- **THEN** the feedback option label SHALL read `Give feedback`

#### Scenario: subsequent presentations read "Give more feedback"

- **WHEN** the gate is re-offered after the user has previously selected the feedback option within the same `/sai-*` invocation (the in-conversation iteration counter is ≥ 1)
- **THEN** the feedback option label SHALL read `Give more feedback`

#### Scenario: only the label changes between iterations

- **WHEN** the gate is re-offered on the second or later iteration
- **THEN** only the feedback option label differs from the first presentation; the feedback option's description text, the proceed option's label and description, the harness option-picker path, and every other field of both options stay identical to the first presentation

#### Scenario: internal section heading stays literal

- **WHEN** the gate instruction is updated to add the iteration-aware label rule
- **THEN** the internal `## On "Give feedback"` section heading in `sai/instructions/artifact-feedback-gate.md` SHALL remain byte-for-byte unchanged — it is internal prose, not user-visible, and re-titling it would be cosmetic noise

#### Scenario: iteration-aware label applies across all three harnesses

- **WHEN** the gate is offered on Claude Code, opencode, or Copilot
- **THEN** the same iteration-aware label rule applies — first presentation `Give feedback`, subsequent `Give more feedback` — because the rule lives in the shared gate instruction that all three harnesses fetch

### Requirement: Per-step artifact listing

When offering the feedback option, the gate SHALL list the artifacts written in that step by name so the user knows exactly what feedback applies to. The list SHALL be `proposal.md` and `specs/**` in sai-1, and `design.md`, `tasks.md`, and `interfaces.md` in sai-2.

#### Scenario: sai-1 lists spec artifacts
- **WHEN** the gate is offered at the end of sai-1
- **THEN** the feedback option names `proposal.md` and `specs/**` as the artifacts open to feedback

#### Scenario: sai-2 lists design artifacts
- **WHEN** the gate is offered at the end of sai-2
- **THEN** the feedback option names `design.md`, `tasks.md`, and `interfaces.md` as the artifacts open to feedback

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

### Requirement: Proceed branches per step

The proceed option SHALL perform a step-specific next action. In sai-1, selecting `Finish step` SHALL trigger the existing MANDATORY STOP. In sai-2, selecting `Continue` SHALL advance to the existing (a)/(b) implementation-continuation question unchanged.

#### Scenario: sai-1 proceed fires the stop
- **WHEN** the user selects `Finish step` in the sai-1 gate
- **THEN** the existing MANDATORY STOP fires and the step ends with its standard stop message

#### Scenario: sai-2 proceed advances to the existing question
- **WHEN** the user selects `Continue` in the sai-2 gate
- **THEN** control passes to the pre-existing (a)/(b) implementation-continuation question, which is presented unchanged

### Requirement: Gate placement after the decision summary

The gate SHALL be inserted after the step's existing decision summary and SHALL NOT modify the existing decision-summary blocks. In sai-1 the gate sits between the decision summary and the MANDATORY STOP; in sai-2 it sits between the decision summary and the existing (a)/(b) question.

#### Scenario: decision summary is unchanged
- **WHEN** either body file is updated to add the gate
- **THEN** the existing decision-summary section is left byte-for-byte intact and the gate is added after it

#### Scenario: sai-2 gate precedes the (a)/(b) question
- **WHEN** sai-2 reaches completion
- **THEN** the order is: decision summary, then the feedback gate, then (only after proceed) the existing (a)/(b) question

### Requirement: sai-2 gate coexists with the existing (b) confirm without stale re-reads

In sai-2 the feedback gate precedes, and does not replace, the existing (a)/(b) implementation-continuation flow. When the user later chooses branch (b) (continue in this chat), the pre-continuation review-and-confirm step SHALL re-read every artifact the gate could have edited — `design.md`, `tasks.md`, AND `interfaces.md` — so that a gate iteration which edited `interfaces.md` is not carried into implementation from a stale read. The gate does not suppress branch (b)'s confirm; a user who already iterated in the gate MAY confirm immediately.

#### Scenario: interfaces.md edited in the gate is re-read before continuing
- **WHEN** a sai-2 gate iteration edits `interfaces.md` and the user subsequently selects branch (b)
- **THEN** the pre-continuation re-read covers `design.md`, `tasks.md`, and `interfaces.md` before the implementation plan is generated

#### Scenario: gate does not remove the (b) confirm
- **WHEN** the user has iterated in the gate and then selects branch (b)
- **THEN** the existing review-and-confirm step is still presented, and the user MAY confirm without further edits

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

Because the gate is presented through a harness option-picker, selecting the feedback option cannot itself carry the feedback text. On selecting the feedback option, the gate SHALL FIRST emit a clean, non-accusatory prompt that names the step's `artifacts` and invites the user to supply their feedback in the next turn — it SHALL NOT report or imply that no feedback was supplied, and SHALL NOT run the per-item split/evaluate processing on an empty turn.

The prompt's canonical form is `Share your feedback on {artifacts} below.`, where `{artifacts}` is replaced by the step's artifact list. Following the established explore.md item-3 pattern, this canonical form is authored in English but is NOT output verbatim in English: it is rendered in the user's language at runtime per `sai/instructions/remember.md` (for a Spanish-speaking user it reads `Indícame a continuación tu feedback sobre {artifacts}`). Only when the user's language is English is the English form output as-is.

After emitting this prompt the gate SHALL wait for the user's reply, then apply the existing per-item feedback processing (`## On "Give feedback"`) to the supplied text. The existing selective-application, discard-reporting, resummarize, and re-offer behavior is unchanged; this requirement only inserts the clean prompt-and-wait step ahead of it.

#### Scenario: feedback option emits a clean prompt naming the artifacts

- **WHEN** the user selects the feedback option in the gate
- **THEN** the gate emits a clean prompt that names the step's `artifacts` and asks the user to supply feedback in the next turn
- **AND** it does NOT report that no feedback was found and does NOT run the per-item processing on an empty turn

#### Scenario: prompt is rendered in the user's language

- **WHEN** the user's conversation language is not English
- **THEN** the canonical English prompt `Share your feedback on {artifacts} below.` is rendered in the user's language (for Spanish: `Indícame a continuación tu feedback sobre {artifacts}`)
- **AND** when the user's language is English the English form is output as-is

#### Scenario: supplied feedback flows into the existing per-item processing

- **WHEN** the user replies to the clean prompt with their feedback text
- **THEN** the gate applies the existing `## On "Give feedback"` per-item split, selective application, discard reporting, resummarize, and re-offer behavior to that text, unchanged

#### Scenario: artifact list matches the step

- **WHEN** the clean prompt is emitted in sai-1 versus sai-2
- **THEN** `{artifacts}` names `proposal.md` and `specs/**` in sai-1, and `design.md`, `tasks.md`, and `interfaces.md` in sai-2 — matching the step's existing artifact list

### Requirement: Iteration counter is in-conversation only

The gate SHALL track the iteration that drives the iteration-aware feedback option label with a single in-conversation counter starting at 0. The counter SHALL be incremented by 1 immediately after each feedback-selection turn completes. The counter SHALL be held in the agent's working memory for the duration of the current session only and SHALL NOT be written to any artifact, configuration file, `.openspec.yaml`, or any other on-disk state. The counter SHALL reset to 0 at the start of every fresh `/sai-*` invocation, so the first presentation of the gate in a new chat always reads `Give feedback`. The counter SHALL NOT be derived from any marker in the gate's own artifact set, hidden comment, or external state.

#### Scenario: counter starts at 0 on the first presentation

- **WHEN** a `/sai-*` invocation reaches the gate for the first time
- **THEN** the counter is 0 and the feedback option label reads `Give feedback`

#### Scenario: counter increments after a feedback turn completes

- **WHEN** the user selects the feedback option and the gate applies the feedback, reprints the decision summary, and re-offers the gate
- **THEN** the counter has been incremented by 1 before the next presentation, and the next presentation of the feedback option label reads `Give more feedback`

#### Scenario: counter is not written to disk

- **WHEN** the gate tracks the iteration counter
- **THEN** no artifact under `openspec/changes/{change-name}/` (including `proposal.md`, `design.md`, `tasks.md`, `interfaces.md`, `specs/**`, `review.md`, `security.md`, `performance.md`, `accessibility.md`, `implementation.md`, or `.openspec.yaml`) is created or modified to record the counter, and no project source or configuration file outside the change directory is touched to record the counter

#### Scenario: counter resets across invocations

- **WHEN** a new `/sai-*` invocation reaches the gate
- **THEN** the counter is 0 for that invocation regardless of any prior chat's history, and the first presentation of the feedback option label reads `Give feedback`

#### Scenario: counter is not derived from artifact state

- **WHEN** the gate tracks the iteration counter
- **THEN** the counter is held in the agent's working memory only — it is NOT re-derived from a marker in `proposal.md`, `design.md`, `tasks.md`, `interfaces.md`, `specs/**`, `review.md`, `security.md`, `performance.md`, `accessibility.md`, `implementation.md`, or `.openspec.yaml`, and it is NOT re-derived from any external or prior-conversation context (Isolation Mode)
