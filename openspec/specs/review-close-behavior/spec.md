# review-close-behavior Specification

## Purpose
TBD - created by archiving change review-close-archive-guard. Update Purpose after archive.

## Requirements

### Requirement: Review close SHALL end terminally without a feedback pause
The review close step SHALL return completed with the summary and audit block, print the changed-files union, then Review done., and stop. It SHALL NOT pause for feedback, present a picker, or open a feedback gate.
#### Scenario: Terminal close with no pending feedback
- **WHEN** a review completes with no pending feedback
- **THEN** the run ends with summary plus Review done. and no question or picker is presented
#### Scenario: Follow-up after close stays conversational
- **WHEN** the user sends follow-up text after the terminal close
- **THEN** the follow-up stays in conversation and does not reopen the closed run
