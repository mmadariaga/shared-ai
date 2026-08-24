## MODIFIED Requirements

### Requirement: phase-adapter-declares-progress-plan

A routed phase adapter MAY declare a static, ordered worker progress plan. A phase adapter without a worker `progress_plan` SHALL run without worker progress events and without a worker-derived task list, except that `/sai-merge` MAY render a separate coordinator-owned adaptive TODO whose route is unknown until source-branch selection and merge outcome. The adaptive TODO SHALL not be transported in the worker envelope and SHALL not alter worker continuation semantics.

#### Scenario: Merge adaptive TODO is separate from worker progress

- **WHEN** `/sai-merge` runs with no declared worker progress plan
- **THEN** the coordinator may render the canonical adaptive TODO after branch selection without synthesizing a worker progress plan
