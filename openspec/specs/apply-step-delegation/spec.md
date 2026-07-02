# apply-step-delegation Specification

## Purpose
TBD - created by archiving change delegate-apply-steps-to-subagent. Update Purpose after archive.
## Requirements
### Requirement: Coordinator dispatches each Step to a subagent

During `sai-4-apply`, the main thread SHALL act as a coordinator: for each Step in `implementation.md` it SHALL identify the next unchecked Step and dispatch a subagent to execute that Step's implementation body. The coordinator itself SHALL NOT perform the read-before-write reads, RED-test runs, or GREEN iteration of the Step — those happen inside the subagent so their output never enters the coordinator's context.

#### Scenario: Coordinator reaches the next unchecked Step

- **WHEN** the coordinator finishes one Step and looks for the next work
- **THEN** it locates the next Step in `implementation.md` whose checkboxes are not all `[x]` and dispatches a subagent to execute that Step's implementation body

#### Scenario: Coordinator does not absorb execution noise

- **WHEN** a Step requires reading files before writing, running a RED test, or iterating on GREEN
- **THEN** those operations are performed by the subagent, and only the subagent's compact report (not the raw file dumps, tracebacks, or iteration logs) returns to the coordinator

### Requirement: Sequential, no-skip Step processing

The coordinator SHALL process Steps strictly in order and SHALL NOT skip any Step. On resume, it SHALL pick up at the next unchecked Step.

#### Scenario: Resuming a partially applied plan

- **WHEN** `sai-4-apply` is resumed on a plan where Steps 1–2 are fully `[x]` and Step 3 is unchecked
- **THEN** the coordinator dispatches a subagent for Step 3, not for any earlier or later Step

### Requirement: Subagent receives the Step text plus execution rules

When dispatching a subagent, the coordinator SHALL provide the full text of the Step, the RED→GREEN handling rules, and the read-before-write rule from `apply.md`, plus any technical learnings the coordinator deems relevant (per `apply-technical-learnings-memory`). The subagent SHALL execute the Step's implementation body: write the RED test, run it, write the GREEN implementation, and iterate until GREEN passes.

#### Scenario: Step with a RED block is dispatched

- **WHEN** the coordinator dispatches a Step that contains a RED block
- **THEN** the subagent's instructions include the full Step text and the RED→GREEN rules, and the subagent writes the test first, runs the RED verification, then writes and iterates the GREEN implementation until it passes

### Requirement: Subagent runs on the same model as the coordinator

The Step-execution subagent SHALL run on the same model as the coordinator, not a cheaper tier. This overrides any default budget routing that would assign a lower-tier model to an executor subagent.

#### Scenario: Budget routing would downgrade the executor

- **WHEN** budget/cost-discipline defaults would route an executor subagent to a cheaper model
- **THEN** the apply coordinator overrides that default and dispatches the Step-execution subagent on its own model, preserving RED→GREEN judgment quality

### Requirement: Checkboxes are marked per Step, not per item

The coordinator SHALL mark a Step's checkboxes after it receives the subagent's report and verifies the Step (per `apply-coordinator-verification`). This per-Step granularity supersedes the prior "mark each item immediately, do not batch" rule for the `sai-4-apply` phase.

#### Scenario: Step completes and is verified

- **WHEN** the subagent reports a Step done and the coordinator's own re-run of the Step's Verification Checklist passes
- **THEN** the coordinator marks all of that Step's completed checkboxes `[x]` in one update, rather than marking each item the instant it was executed

