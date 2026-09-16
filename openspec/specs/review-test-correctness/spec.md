# review-test-correctness Specification

## Purpose
TBD - created by archiving change fix-review-pass12-sai-build-tools. Update Purpose after archive.

## Requirements

### Requirement: Review test Pass reference aligns with live contract

The review coordinator-worker contract test SHALL pin the Pass 12 mutation-analysis activation-gate reference instead of Pass 11, matching sai/commands/review/worker.md.

#### Scenario: Contract test pins Pass 12

- **WHEN** the review coordinator-worker test suite runs its worker-contract assertions
- **THEN** the Pass assertion matches the live Pass 12 gate and skip reference
