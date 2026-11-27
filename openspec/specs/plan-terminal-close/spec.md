# plan-terminal-close Specification

## Purpose
TBD - created by archiving change expand-plan-unattended-terminal-handoff. Update Purpose after archive.

## Requirements

### Requirement: Expanded successful Plan terminal close order
The successful Plan-Unattended terminal SHALL print the expanded close in review → build → next-slice order: review generated artifacts here and give feedback here without touching code, then run the build command printed by the plan coordinator in another chat, then continue with `next-slice` toward the titled active slice, saying that `next-slice` confirms the slice is implemented and committed. The terminal SHALL print no second build command line, so the command printed by the plan coordinator stays the only one. The literals `/sai-build`, `next-slice`, and `{name}` SHALL remain verbatim English with only surrounding prose localized.
#### Scenario: Successful terminal prints ordered close
- **WHEN** a Plan-Unattended run reaches its successful supervised design terminal
- **THEN** the terminal prints the review-here, build-in-another-chat, and titled next-slice close in that order with verbatim literals preserved, and says that `next-slice` confirms the slice is implemented and committed.
#### Scenario: Explore close prints no second build command
- **WHEN** the design segment completed and the plan coordinator printed its build hint
- **THEN** the Explore close refers to that printed command and prints no second `/sai-build` line

### Requirement: Same expanded close on both overview branches
Both overview branches of the successful terminal SHALL emit the same expanded successful close, and `overview_language` (None or a selected language) SHALL NOT change the close. Failure, cancellation, continuation-failure, and STOP paths SHALL keep existing guidance and SHALL NOT use the expanded close.
#### Scenario: Overview value does not change close
- **WHEN** the successful terminal executes on either the opted-in generation branch or the no-generation branch
- **THEN** it emits the identical expanded successful close and leaves failure paths on existing guidance.

### Requirement: Plan terminal performs no implementation dispatch
A successful Plan-Unattended run SHALL perform no implementation-phase dispatch and SHALL never dispatch `/sai-3-implement`. Post-terminal feedback here SHALL reopen no review rounds and redispatch no workers by itself; it enables manual correction or a new Plan.
#### Scenario: Successful Plan ends without implementation
- **WHEN** the successful Plan terminal completes
- **THEN** the run ends with the supervised sai-2 terminal report and dispatches no implementation worker.

### Requirement: Plan build hint carries the publication flag
The plan coordinator's `Plan done` line SHALL name the build command with the publication flag `/sai-build` takes: the bare `--publish` for `yes`, `--publish draft` for `draft`, and `--publish no` for `no`. The plan's own `--publish` answer SHALL NOT decide the flag, and a failed or stopped run SHALL print no hint.

#### Scenario: Completed plan prints the build hint
- **WHEN** both plan segments complete with the build hint value `draft`
- **THEN** the `Plan done` line names `/sai-build {name} --publish draft`

#### Scenario: No hint on a stopped run
- **WHEN** a plan segment fails, is stopped, or ends on an unanswered escalation
- **THEN** the run prints no build hint

### Requirement: Plan accepts --build-publish as the build hint override
`/sai-plan` SHALL accept `--build-publish <yes|no|draft>`, in the separate and attached `--build-publish=<value>` forms, on any invocation, and SHALL use it as the build hint value. It SHALL win over `pr.publishAfterRun` and SHALL NOT change the plan's own publication. A bare `--build-publish`, a value other than `yes`, `no`, or `draft`, or a second `--build-publish` SHALL end the run before anything is written with `Cannot start /sai-plan: --build-publish takes yes, no or draft.`

#### Scenario: The input wins over the setting
- **WHEN** `/sai-plan {name} --build-publish no` runs in a project whose `pr.publishAfterRun` is `yes`
- **THEN** the build hint names `/sai-build {name} --publish no`

#### Scenario: An invalid value ends the run
- **WHEN** `/sai-plan {name} --build-publish maybe` is invoked
- **THEN** the run ends before anything is written with `Cannot start /sai-plan: --build-publish takes yes, no or draft.`

### Requirement: Build hint falls back to the project setting
Without `--build-publish`, the plan coordinator SHALL read `pr.publishAfterRun`: `no` SHALL give `--publish no`, and `yes`, `ask`, an absent key, an invalid value, and an unreadable setting SHALL give the bare `--publish` as a recommendation. On the `/sai-explore` Plan route the value SHALL always be handed over, so the setting SHALL NOT be read there.

#### Scenario: No setting gives the bare recommendation
- **WHEN** a standalone plan completes with no `--build-publish` and an absent `pr.publishAfterRun`
- **THEN** the build hint names `/sai-build {name} --publish`

#### Scenario: A no setting gives --publish no
- **WHEN** a standalone plan completes with no `--build-publish` and `pr.publishAfterRun` reads `no`
- **THEN** the build hint names `/sai-build {name} --publish no`
