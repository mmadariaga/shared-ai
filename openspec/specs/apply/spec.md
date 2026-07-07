# apply Specification

## Purpose
TBD - created by archiving change extract-commit-rules-shared-instruction. Update Purpose after archive.
## Requirements
### Requirement: Coordinator dispatches each Step to a subagent
During `sai-4-apply`, the main thread SHALL act as a coordinator: for each Step in `implementation.md` it SHALL identify the next unchecked Step and dispatch a subagent to execute that Step's implementation body. The coordinator itself SHALL NOT perform the read-before-write reads, RED-test runs, or GREEN iteration of the Step — those happen inside the subagent so their output never enters the coordinator's context. The subagent SHALL continue executing Steps sequentially until the plan is finished, without returning control to the coordinator between Steps. Each subagent invocation SHALL be self-contained: the prompt SHALL include all necessary context (Step text, RED→GREEN rules, read-before-write rule, relevant technical learnings) so the subagent does not need to refer back to prior conversation.

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

### Requirement: Subagent is barred from git, commits, and the STOP & COMMIT boundary
The Step-execution subagent SHALL NOT run any git operation, SHALL NOT create commits, and SHALL NOT cross a STOP & COMMIT marker. When a subagent's Step reaches a STOP & COMMIT, the subagent SHALL stop and report the STOP rather than acting on it.

#### Scenario: Subagent's Step reaches a STOP & COMMIT marker
- **WHEN** the subagent executing a Step encounters a STOP & COMMIT marker
- **THEN** the subagent halts, performs no git action and no commit, and returns a report indicating the STOP was reached (with the exact marker message)

#### Scenario: Subagent is tempted to stage or commit
- **WHEN** a Step's body contains "stage and commit" style wording
- **THEN** the subagent still performs no git or commit action; staging and committing remain the coordinator's responsibility under the human gate

### Requirement: Only the coordinator writes implementation.md
Checkbox marking and the deviations appendix in `implementation.md` SHALL be written ONLY by the coordinator, derived from the subagent's report. The subagent SHALL NOT modify `implementation.md`.

#### Scenario: Subagent finishes a Step with deviations
- **WHEN** the subagent reports deviations for a completed Step
- **THEN** the coordinator (not the subagent) writes those deviations into the `## Appendix: Plan vs Final Implementation` section and marks the Step's checkboxes

#### Scenario: Subagent never edits the plan document
- **WHEN** the subagent executes any Step
- **THEN** `implementation.md` shows no edits authored by the subagent; all checkbox and appendix edits trace to the coordinator

### Requirement: Commit message format at STOP & COMMIT markers
When the implementation plan reaches a STOP & COMMIT marker, the agent SHALL apply commit message format rules from `@sai/instructions/commit-rules.md` when proposing the commit message. The commit-rules MUST be loaded at or before the point where the agent drafts a commit message proposal.

#### Scenario: Agent reaches STOP & COMMIT without commit-rules loaded
- **WHEN** `apply.md` is executed and a STOP & COMMIT marker is encountered
- **THEN** the agent MUST have loaded `@sai/instructions/commit-rules.md` before drafting the commit message, ensuring Conventional Commits format, ≤50-char subject, and self-critique checklist are applied

#### Scenario: Commit proposed by apply matches commit-rules constraints
- **WHEN** the agent proposes a commit message at a STOP & COMMIT marker
- **THEN** the proposed subject MUST follow `type(scope): description` format, be ≤ 50 characters, and every claim MUST map to staged hunks only

### Requirement: Explicit permission gate at STOP & COMMIT stays in the main thread
When `apply.md` is executed and a STOP & COMMIT marker is encountered, the main thread (coordinator) SHALL propose the commit message and ask the user for explicit per-invocation authorization before running `git commit`. The STOP & COMMIT human authorization gate SHALL remain in the coordinator — it SHALL NOT be delegated to the subagent. Silently skipping the commit step is a spec violation.

#### Scenario: User grants commit permission
- **WHEN** the coordinator reaches a STOP & COMMIT marker and the user answers `y` to the proposed commit
- **THEN** the coordinator runs `git commit` and reports the resulting SHA + subject

#### Scenario: User declines or does not respond
- **WHEN** the coordinator reaches a STOP & COMMIT marker and the user does not answer `y`
- **THEN** the coordinator MUST NOT run `git commit`; MUST describe the staged changes and instruct the user to commit themselves

#### Scenario: Subagent reports a STOP & COMMIT was reached
- **WHEN** a subagent report indicates a STOP was reached at a STOP & COMMIT marker
- **THEN** the coordinator proposes the commit message and asks the user `(y/n)`, committing only on explicit `y` and otherwise describing the staged changes for the user to commit themselves

### Requirement: Agent SHALL perform a final checkbox sweep after all steps complete
When all steps in `implementation.md` are complete, the apply agent MUST scan the entire file and verify that every checkbox that should be checked is marked `[x]`. Any unchecked items MUST be reported to the user before the implementation is declared done.

#### Scenario: All checkboxes marked
- **WHEN** all steps are complete and every checkbox in `implementation.md` is `[x]`
- **THEN** the agent declares the implementation done without additional output

#### Scenario: Unchecked items remain
- **WHEN** all steps are complete but one or more checkboxes remain `[ ]`
- **THEN** the agent reports the unchecked items to the user and does NOT declare the implementation done until the user resolves them

### Requirement: Apply agent completion message
When `/sai-4-apply` reaches its completion phase, the agent's stop condition SHALL require that: (1) the implementation is done, (2) all human verification gates have been reviewed, and (3) commits are done. The completion message printed to the user SHALL be: "Implementation applied. Run `/sai-5-review {name}` in a new chat when ready."

#### Scenario: Apply agent reaches completion
- **WHEN** `/sai-4-apply` has applied all implementation steps, all human verification gates have been reviewed by the user, and all commits have been created
- **THEN** the agent prints exactly: "Implementation applied. Run `/sai-5-review {name}` in a new chat when ready." and stops

#### Scenario: Human verification gates not yet reviewed
- **WHEN** `/sai-4-apply` has applied implementation steps but human verification gates have not been reviewed
- **THEN** the agent MUST NOT print the completion message — it must present the verification gates to the user first

