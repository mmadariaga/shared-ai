# plan-terminal-close Specification

## Purpose
TBD - created by archiving change expand-plan-unattended-terminal-handoff. Update Purpose after archive.

## Requirements

### Requirement: Expanded successful Plan terminal close order
The successful Plan-Unattended terminal SHALL print the expanded close in review → build → next-slice order: review generated artifacts here and give feedback here without touching code, then run `/sai-build {name}` in another chat, then continue with `next-slice` toward the titled active slice. The literals `/sai-build`, `next-slice`, and `{name}` SHALL remain verbatim English with only surrounding prose localized.
#### Scenario: Successful terminal prints ordered close
- **WHEN** a Plan-Unattended run reaches its successful supervised design terminal
- **THEN** the terminal prints the review-here, build-in-another-chat, and titled next-slice close in that order with verbatim literals preserved.

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
