## ADDED Requirements

### Requirement: The `/sai-3-implement` agent SHALL read all existing audit artifacts for a change before generating `implementation.md`.

When producing an implementation plan, the agent must check for audit artifacts produced by earlier review passes and incorporate their findings as explicit steps rather than leaving them untracked.

#### Scenario: Audit artifacts exist for the change
- **WHEN** one or more of `review.md`, `security.md`, `performance.md`, or `accessibility.md` exist in `openspec/changes/{change-name}/`
- **THEN** the agent reads each file that exists, extracts all actionable findings or suggested changes, and appends them as numbered steps at the end of `implementation.md` — one step per artifact (e.g., `Step N: Address review findings`, `Step N+1: Address security findings`)

#### Scenario: No audit artifacts exist for the change
- **WHEN** none of `review.md`, `security.md`, `performance.md`, or `accessibility.md` exist in `openspec/changes/{change-name}/`
- **THEN** the agent proceeds with standard `implementation.md` generation without appending any audit steps

### Requirement: Audit artifact steps MUST NOT be merged with existing implementation steps.

Each audit artifact produces its own dedicated step. Findings from different artifacts are kept separate and appended after all steps derived from `design.md` and `tasks.md`.
