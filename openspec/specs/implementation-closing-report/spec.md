# implementation-closing-report Specification

## Purpose
Define one outcome-first closing-report authority for standalone Apply, Build, and Explore's full Direct Build route while preserving each route's execution and authorization rules.

## Requirements

### Requirement: Shared closing authority applies only at full-route terminal close

Standalone `/sai-4-apply`, `/sai-build`, and Explore's full `direct-build-unattended` route SHALL use `sai/policies/implementation-closing-report.md` as their single closing-format authority in Claude Code and opencode. Each route SHALL render its report once at its existing terminal close, including failure, cancellation, and interruption. An execution question or pending recovery choice SHALL remain a pause, not a closing report. Contract-pinned stop text SHALL retain its precedence. The `--no-specs` POC SHALL retain its own closing behavior.

#### Scenario: Full routes share the authority

- **WHEN** any of the three full routes reaches its existing terminal close in Claude Code or opencode
- **THEN** it uses the same closing-format authority without changing route completion conditions, execution ownership, authorizations, recovery budgets, or safety gates

#### Scenario: A question pauses execution

- **WHEN** a route awaits an execution answer or recovery decision without ending the run
- **THEN** it presents the existing question without emitting a final closing report

#### Scenario: POC retains its close

- **WHEN** Explore runs the pinned `--no-specs` POC profile
- **THEN** that profile retains its own closing behavior rather than adopting this shared format

### Requirement: Required initial status reflects the existing route outcome

A shared closing report SHALL start with exactly one English required literal: `Status: completed successfully.` when existing completion conditions hold with no relevant known warning; `Status: completed with warnings.` when those conditions hold with a known limitation or problem, including pending human checks or omitted checks; or `Status: stopped.` when the route did not complete. These literals SHALL precede Terminology under the existing required-literal preservation exception in `public-chat.md`. A stopped report SHALL state whether failure, cancellation, or interruption ended the run and why in What you need to know. Partial work SHALL remain identified as partial.

#### Scenario: Completed run has no warning

- **WHEN** existing route completion conditions hold and no relevant warning is known
- **THEN** the report starts with `Status: completed successfully.`

#### Scenario: Completed run has pending checks or a permitted omission

- **WHEN** completion conditions hold but a human check remains pending or a verification check was permissibly omitted
- **THEN** the report starts with `Status: completed with warnings.` and identifies the limitation without representing an omitted check as a pass

#### Scenario: Execution ends without completion

- **WHEN** failure, cancellation, or interruption ends a run before its route completion conditions hold
- **THEN** the report starts with `Status: stopped.` and states the ending reason without describing partial work as completed

### Requirement: Outcome and actions precede execution details

After its initial status, the report SHALL use this order: Terminology when applicable; What you need to know; the complete `Terminal functional review — pending human review` block when applicable; Next step; and Execution details as the last report section. What you need to know SHALL name the command and change, summarize the material outcome, and identify every relevant limitation and required action, including what was not checked and why, known pre-existing failures, and incidents affecting the outcome. A reader stopping before Execution details SHALL be able to identify the outcome, limitations, pending checks with their reasons, and the next required action.

#### Scenario: Diagnostics do not hide a relevant problem

- **WHEN** technical evidence explains a verification limitation or incident affecting the outcome
- **THEN** What you need to know summarizes that problem before the detailed evidence appears in Execution details

#### Scenario: Complete human-review information is available

- **WHEN** an actual terminal functional review produced pending fail or unverifiable checks
- **THEN** the full held block lists every pending check, its reason, and the recommendation before Next step and Execution details rather than replacing the block with a count

#### Scenario: No review findings exist

- **WHEN** the functional review never ran or produced no pending checks
- **THEN** the report omits the pending-human-review block and invents no findings

### Requirement: Reporting uses available evidence and preserves observed state

The report SHALL use only results already available from execution, including checks, incidents, affected files, commits, and authorization decisions. It SHALL remain conversation-only, introduce no persisted reporting state, and run no verification solely to compose the report. A stopped report SHALL state what work and commits remain, including observed written, staged, and uncommitted work and known commit references. Declined commits SHALL retain their existing consequences and be disclosed. Reporting SHALL assume no rollback and grant no new operation.

#### Scenario: Run stops after partial work

- **WHEN** a route closes after writing or staging work or creating commits without completing
- **THEN** the report describes that observed remaining state and existing recovery guidance without authorizing rollback, another commit, or additional verification

### Requirement: Authorization disclosures remain at their decision point

Each original tool-generated report SHALL remain visible at its existing pre-authorization point, including included and excluded files, necessary warnings, the proposed message, and the authorization question. Only the final diagnostic collection SHALL move to Execution details. Execution details SHALL preserve original reports verbatim and contain the available work, verification, affected-file, created-commit, declined or no-op commit, and correction-trace records, subject to existing route telemetry omissions. Existing active authorization SHALL retain its effect; this format SHALL grant none.

#### Scenario: Commit requires a decision

- **WHEN** a route reaches an existing commit-authorization point
- **THEN** it presents the original disclosure and question before the decision and collects the final diagnostic record in Execution details without changing the authorization gate
