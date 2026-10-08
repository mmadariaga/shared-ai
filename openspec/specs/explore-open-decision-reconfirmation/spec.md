# explore-open-decision-reconfirmation Specification

## Purpose
This capability makes `sai-explore` ask every open decision again at `Crystallize` entry, while the user is still present. A decision stays open only when the user explicitly chooses that, after a notice that it will stop an unattended route later.

## Requirements

### Requirement: Open decisions are checked first at Crystallize entry

An open decision is a behavior the exploration left undefined, whether it sits in an edge case, an implementation detail, or the conversation. As the first action of `sai/commands/explore/steps/crystallization-protocol.md`, `sai-explore` SHALL check the agreed `E1`…`En` and `I1`…`In` lists and the conversation for open decisions of the current idea that are neither answered nor explicitly left open. Only when at least one exists, it SHALL fetch `sai/commands/explore/steps/open-decisions.md` and complete that step before loading the slicing assessment. With none, it SHALL continue and show nothing about the check. The Crystallize entry order SHALL be: the open-decision reconfirmation when an open decision exists, then the slicing assessment, then the crystallization language gate, then `Ready to Propose` block printing.

#### Scenario: No open decision adds no stop

- **WHEN** the progression enters `Crystallize` and the current idea has no open decision
- **THEN** `open-decisions.md` is not fetched, nothing about the check is shown, and the slicing assessment runs next

#### Scenario: An open decision runs the step before the slicing assessment

- **WHEN** the progression enters `Crystallize` and at least one open decision of the current idea has no outcome
- **THEN** `open-decisions.md` is fetched and its step completes before the slicing assessment is loaded

#### Scenario: Only the crystallization protocol fetches the step

- **WHEN** the fetch directives of `common.md` and `slicing-assessment.md` are inspected
- **THEN** neither file fetches `open-decisions.md`, and it is the first fetch directive of `crystallization-protocol.md`

### Requirement: The reconfirmation step completes only when every open decision has an outcome

The open-decision step SHALL be complete only when every open decision is answered or explicitly left open, whatever their number. The slicing assessment SHALL start only then, so every `Ready to Propose` block is printed after the step.

#### Scenario: Blocks wait for every outcome

- **WHEN** several open decisions exist and one of them still has no outcome
- **THEN** the slicing assessment does not start and no `Ready to Propose` block is printed

### Requirement: One consequence notice precedes the first open-decision question

Before the first question, `sai-explore` SHALL show one notice, once per idea, as plain text in the conversation language. The notice SHALL state that some decisions are still open, that each decision left open will be asked during planning or implementation, and that the question stops an unattended route until it is answered. The notice text SHALL be pinned once, in `open-decisions.md`.

#### Scenario: Notice shown once before the questions

- **WHEN** the step starts for an idea with two open decisions
- **THEN** the notice is shown once, before the first question, and is not repeated before the second question

### Requirement: Each open decision is asked once as a closed-choice question

`sai-explore` SHALL ask each open decision once, one decision per question, as a closed-choice prompt through the native picker, per the closed-choice rule of `sai/policies/remember.md` and the content rules of `sai/policies/question-context.md`. The text before the picker SHALL quote the open decision as the exploration left it and name where it sits: its `E<n>` or `I<n>` identifier, or the conversation. The options SHALL be that decision's own concrete answers, followed by `Leave it open` as the last option.

#### Scenario: Question quotes the decision and offers leaving it open last

- **WHEN** an open decision held by an edge-case item is asked
- **THEN** the question quotes the decision, names its `E<n>` identifier, lists its own answers, and ends the options with `Leave it open`

### Requirement: An answered open decision becomes a decision of the block

When the user chooses one of the decision's answers, or states one clearly in free text, the outcome SHALL be Answered. `sai-explore` SHALL write the answer with its rationale to `Decisions & Rationale` and SHALL rewrite the `Edge Cases` or `Implementation Details` item that held the open decision so that the item states the decided behavior. The item SHALL keep its identifier and position, and both agreed lists SHALL stay agreed with no second review.

#### Scenario: Answer rewrites the holding item without a second review

- **WHEN** the user answers an open decision held by item `E3`
- **THEN** the answer is written to `Decisions & Rationale`, `E3` states the decided behavior at the same position, and neither list is reviewed again

### Requirement: Leaving a decision open requires an explicit per-decision choice

The outcome SHALL be Left open only when the user chooses `Leave it open` for that decision. `sai-explore` SHALL then write the decision to `Request Additional Notes` in the `Undecided:` form that `sai/policies/ready-to-propose-format.md` owns. Any other reply — ambiguous, missing, or a dismissed picker — SHALL leave the open decision without an outcome, and `sai-explore` SHALL ask that same decision again.

#### Scenario: Explicit choice leaves the decision open

- **WHEN** the user chooses `Leave it open` for one open decision
- **THEN** that decision is written to `Request Additional Notes` as an `Undecided:` sentence and the other open decisions are still asked

#### Scenario: Ambiguous reply asks again

- **WHEN** the reply to an open-decision question is ambiguous, missing, or a dismissed picker
- **THEN** the decision has no outcome and the same decision is asked again

### Requirement: A material change during reconfirmation follows the material-change rule

A reply that materially changes the idea SHALL follow the Material change rule of `sai/commands/explore/steps/common.md`: the progression SHALL return to `Explore change` and no block SHALL be printed.

#### Scenario: Material change returns to Explore change

- **WHEN** a reply to an open-decision question materially changes the idea
- **THEN** the progression returns to `Explore change` and no `Ready to Propose` block is printed

### Requirement: The reconfirmation runs once per idea and survives slicing and resumption

The step SHALL run once per idea, before the slicing assessment. When the slicing assessment then cuts the idea, each answered decision and each `Undecided:` entry SHALL be attributed to the block of the change it belongs to. When crystallization is interrupted and resumed with the idea unchanged, the recorded outcomes SHALL stand: `sai-explore` SHALL ask only the open decisions that have no outcome yet, without repeating the notice.

#### Scenario: Sliced idea attributes each outcome to its change

- **WHEN** the slicing assessment cuts an idea whose open decisions already have outcomes
- **THEN** each answered decision and each `Undecided:` entry appears in the block of the change it belongs to

#### Scenario: Resumed crystallization does not repeat outcomes

- **WHEN** crystallization resumes with the idea unchanged after some open decisions received an outcome
- **THEN** only the open decisions without an outcome are asked and the notice is not shown again

### Requirement: The reconfirmation adds no stage, event, or panel entry

The outcomes of the step SHALL be held in the conversation only. The `explore-idea@1` stage machine SHALL receive no event for this step, SHALL gain no stage, and the panel SHALL gain no entry.

#### Scenario: Stage machine is unchanged

- **WHEN** the stages of `explore-idea@1` are inspected after this change
- **THEN** they are exactly `explore-change`, `poc-lane`, `review-edge-cases`, `implementation-details`, and `crystallize`, and the machine source names no open-decision event

### Requirement: A pending open-decision question closes a stage 4 turn

At stage 4, a turn SHALL end with the pending open-decision, slicing, or language-gate question, re-asked after an interruption, or with the shared crystallization-turn close. No stage-aware reminder SHALL be appended.

#### Scenario: Interrupted open-decision question is re-asked

- **WHEN** an unrelated turn interrupts a pending open-decision question at stage 4
- **THEN** the turn ends by asking that open-decision question again, with no stage-aware reminder
