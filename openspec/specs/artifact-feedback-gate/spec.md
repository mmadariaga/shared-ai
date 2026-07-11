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

#### Scenario: Claude Code presentation
- **WHEN** the gate is reached on Claude Code
- **THEN** it presents exactly two clickable options through `AskUserQuestion` — one to give feedback on the artifacts and one proceed option carrying the step-specific full-word label

#### Scenario: labels are full words
- **WHEN** the gate's option labels are drafted
- **THEN** they read as full words (e.g. `Finish step`, `Continue`) and never as single- or two-letter abbreviations

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
