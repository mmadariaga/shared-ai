# review-test-correctness Specification

## Purpose
Define the alignment between the review coordinator-worker contract test and the live worker card, pinning the Pass 12 mutation-analysis activation gate.

## Requirements

### Requirement: Review test Pass reference aligns with live contract

The review coordinator-worker contract test SHALL assert exactly passes 1–11, the four-step plan, the first event containing resolution and scope, and three complete-path events. It SHALL assert mutation-step retirement and report-only write scope instead of the retired Pass 12 gate. Audit machines SHALL retain their five steps and four complete-path events.

#### Scenario: Contract test pins Pass 12
- **WHEN** the review coordinator-worker test suite runs its worker-contract assertions
- **THEN** it verifies the retired Pass 12 gate is absent, the eleven remaining passes and four-step plan match the live contract, and review completes in three progress events
