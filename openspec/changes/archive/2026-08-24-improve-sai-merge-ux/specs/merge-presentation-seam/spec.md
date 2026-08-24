## MODIFIED Requirements

### Requirement: Coordinator-owned merge presentation seam

The merge coordinator MUST route every validated worker lifecycle result through a merge-local presentation seam that keeps worker source, merge presentation state, and mutation outcomes separate. The concise renderer MUST preserve worker-authored question text and option values, present the branch question as `¿Qué rama quieres mergear?` with date-bearing labels, and render detailed branch and authorization context in coordinator-owned summaries.

#### Scenario: Concise branch context is rendered

- **WHEN** the worker returns the branch-selection result
- **THEN** the coordinator presents the exact question and option values with the ordered candidate details in the adjacent decision summary

### Requirement: Legacy rendering preserves merge behavior

The active merge presentation renderer MUST preserve worker-authored summaries, timestamps, verification-round behavior, continuation semantics, and terminal completion semantics while using concise decision-oriented summaries instead of full lifecycle payloads.

#### Scenario: Verification behavior remains unchanged

- **WHEN** a verification round fails or reaches the three-round cap
- **THEN** the presentation seam records the same staged and uncommitted state without implying that a commit occurred

### Requirement: Absent progress plans remain absent except for the merge adaptive surface

The merge presentation seam MUST NOT synthesize a worker progress plan or worker progress event. The coordinator MAY render the separate adaptive merge TODO after source-branch selection, and that TODO MUST NOT alter worker continuation or mutation ownership.

#### Scenario: Merge TODO is rendered after branch selection

- **WHEN** the user selects a source branch
- **THEN** the coordinator renders the canonical merge TODO without adding a worker progress plan

## ADDED Requirements

### Requirement: Adaptive merge TODO uses canonical route transitions

The coordinator MUST render only the canonical merge TODO items for the resolved route, in fixed order, and MUST remove impossible conflict items after a clean outcome. The TODO MUST remain rendering-only and MUST never authorize a merge, resolution, rename, staging operation, or commit.

#### Scenario: Clean merge removes impossible work

- **WHEN** the merge completes without conflicts
- **THEN** the TODO marks the merge item complete and omits scope, resolution, and verification items before presenting collision and authorization state
