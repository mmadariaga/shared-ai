# obstacle-escalation Specification

## Purpose
TBD - created by archiving change goal-driven-commit. Update Purpose after archive.

## Requirements

### Requirement: One shared obstacle and escalation policy

`sai/policies/obstacle-escalation.md` SHALL be the single source for the two meanings that goal-driven command cards share: stopping on an obstacle with recovery options, and escalating to the user. A card that loads it SHALL name only its own obstacles, their identifiers, the approaches that suit it, where it writes the hand-over of a new worker, where it keeps its counters, and its own force-majeure cases, and SHALL NOT restate the policy's rules. The `/sai-commit`, `/sai-archive`, `/sai-backfill`, `/sai-merge`, `/sai-3-implement`, and `/sai-4-review` coordinators, the audit coordinator, the plan segment cycle, and the Direct Build coordinator card (`sai/commands/explore/direct-build-coordinator.md`) SHALL load it. The `/sai-explore` stop points outside those cards (the stored-block export failures of `sai/commands/explore/steps/pipeline-plan-unattended.md` and `sai/commands/explore/steps/pipeline-direct-build.md`, and the pending-execution branch of `sai/commands/explore/steps/route-selector.md`) SHALL reference it instead of `stop-options.md`, `bounded-recovery.md`, or `unattended-runtime-recovery.md`, and SHALL keep the same recovery choices.

#### Scenario: A goal-driven card defers to the policy

- **WHEN** the `/sai-merge` coordinator card is read
- **THEN** it fetches `sai/policies/obstacle-escalation.md` and keeps only its own obstacle identifiers, approaches, and force-majeure case instead of restating the budget and escalation rules

#### Scenario: Archive and backfill name only their own obstacles

- **WHEN** the `/sai-archive` and `/sai-backfill` coordinator cards are read
- **THEN** each fetches `sai/policies/obstacle-escalation.md` and names only its own obstacles (`worker` for archive; `worker` and `draft` for backfill) and its planned stops, keeping the attempt count in the conversation

#### Scenario: The Direct Build card names its step obstacles

- **WHEN** `sai/commands/explore/direct-build-coordinator.md` is read
- **THEN** it fetches `sai/policies/obstacle-escalation.md`, names one budget of 3 attempts per step from `step-1` to `step-8` including `step-2b`, lists its own force-majeure cases, and writes the hand-over of a new worker itself

#### Scenario: Explore stop points keep their recovery choices

- **WHEN** a Plan or Direct Build stored-block export returns `BLOCK_NOT_FOUND` or `BLOCK_EXPORT_FAILED`, or the route selector reaches a pending Direct Build execution that needs a decision
- **THEN** explore escalates per `sai/policies/obstacle-escalation.md` with the same choices as before (retrying the export or re-emitting the block with `--amend`) and references no `stop-options.md`

### Requirement: Obstacles spend a budget of three attempts

Under the policy, each obstacle SHALL have an identifier and a budget of 3 attempts, where an attempt is one response with an approach different from the previous one: a corrected instruction, a different correction of the work or a different way to run the failing tool, or a new worker that gets the ready handshake and a hand-over summary written by the card, never the old worker's history. A card that keeps run state SHALL record each attempt there before making it; a card without run state SHALL keep the count in the conversation. When the budget is gone the card SHALL escalate at once, without advancing to another task first.

#### Scenario: Repeating an approach is not an attempt

- **WHEN** a card answers an obstacle with the same approach it used last time
- **THEN** that response does not count as a new attempt against the budget of 3

### Requirement: Planned stops are not obstacles

A stop that the card's contract defines (a literal stop text, an approval or authorization gate, or a stop the user chose, such as a declined confirmation) SHALL keep its own text and SHALL get no options and no escalation.

#### Scenario: A declined confirmation ends without options

- **WHEN** the user declines a confirmation that the card's contract defines
- **THEN** the card closes with that contract's own text and offers no recovery options

### Requirement: Force majeure escalates at once

Force majeure SHALL escalate at once without spending an attempt: a change of intent for the request the user made; an operation that needs human authorization (push, deletion, shared-system change, a missing credential, or an unavailable external service); an exhausted budget; and any further case the card names.

#### Scenario: An operation needs human authorization

- **WHEN** an obstacle can only be resolved by a push the user did not authorize
- **THEN** the card escalates at once and spends no attempt

### Requirement: Escalation gives a stop report and options

Escalating SHALL be a stop with recovery options, given in this order: a stop report that says in plain words what happened, what is done and its exact state, what was tried, and what is pending; then options asked through the native picker per `sai/policies/question-context.md`, within the picker's capacity. The options SHALL offer one or more ways to continue, each naming a different approach, and one option that stops the run and leaves everything as it is; each option SHALL name one concrete action, its cost, its effect, and what stays with the user. When the evidence favors one option it SHALL come first as the recommended one with a one-line reason; when the evidence supports only one viable path, the card SHALL state it as the next step with no picker. Options SHALL rest on evidence the card already holds and SHALL widen no read or write scope.

#### Scenario: An exhausted budget escalates with options

- **WHEN** three different approaches fail to clear an obstacle
- **THEN** the card prints a stop report and then asks through the native picker with ways to continue and one option that stops the run and leaves everything as it is

### Requirement: Answers and authority of options

A free-text reply SHALL be treated as the user's own instruction, not an invalid option. Choosing a way to continue SHALL reset that obstacle's counter and the card SHALL carry out the chosen approach; choosing to stop SHALL close the run; a dismissed question SHALL close the run as escalated and leave the state as it is. A card that keeps run state SHALL record the escalation and the answer there. Options SHALL be proposals only: choosing one SHALL authorize only that action inside the gates it already carries, an option that involves a destructive operation SHALL name it so its confirmation fires, and the policy SHALL grant no new retry, read, or write authority.

#### Scenario: Choosing to continue resets the budget

- **WHEN** the user picks a way to continue at an escalation
- **THEN** that obstacle's counter resets and the card carries out the chosen approach within its existing gates
