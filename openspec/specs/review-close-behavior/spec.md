# review-close-behavior Specification

## Purpose
Define the review close as a terminal outcome — the worker returns the summary and audit block and stops, with no feedback pause, picker, or gate — while the coordinator owns terminal presentation.

## Requirements

### Requirement: Review close SHALL end terminally without a feedback pause
The review close step SHALL return completed with the summary and audit block and stop. It SHALL NOT print the changed-files union or the Review done. line; the coordinator owns terminal presentation. It SHALL NOT pause for feedback, present a picker, or open a feedback gate.
#### Scenario: Terminal close with no pending feedback
- **WHEN** a review completes with no pending feedback
- **THEN** the worker returns its summary and audit block, the coordinator prints the changed-files union and Review done., and no question or picker is presented
#### Scenario: Follow-up after close stays conversational
- **WHEN** the user sends follow-up text after the terminal close
- **THEN** the follow-up stays in conversation and does not reopen the closed run
