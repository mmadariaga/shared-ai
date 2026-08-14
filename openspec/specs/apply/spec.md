# apply Specification

## Purpose
TBD - created by archiving change extract-commit-rules-shared-instruction. Update Purpose after archive.
## Requirements
### Requirement: Coordinator dispatches each Step to a worker on every iteration
During `sai-4-apply`, the main thread SHALL act as a coordinator: for each Step in `implementation.md` it SHALL identify the next unchecked Step and dispatch a managed Step-execution worker (the RED or GREEN worker, per the routing decision tree) to execute that Step's implementation body. The coordinator itself SHALL NOT perform the read-before-write reads, RED-test runs, or GREEN iteration of the Step — those happen inside the dispatched worker(s) so their output never enters the coordinator's context. Each worker invocation SHALL be self-contained: the dispatch SHALL include all necessary context (Step text, RED→GREEN rules, read-before-write rule, allowed-file list, relevant technical learnings) so the worker does not need to refer back to prior conversation.

The no-self-execution rule holds on every iteration, not just the first. After a Step's STOP & COMMIT checklist finishes (commit created, or the user declined and was told how to commit themselves), the first action of the new iteration MUST be the same: dispatch a NEW Step-execution worker for the next unchecked Step (per the Step routing decision tree in `sai/commands/apply/runner.md` and the managed RED/GREEN worker bindings). The coordinator SHALL NOT edit code, run tests, or perform the next Step's body itself, no matter how small or familiar the next Step looks after the ones already done.

#### Scenario: Coordinator reaches the next unchecked Step
- **WHEN** the coordinator finishes one Step and looks for the next work
- **THEN** it locates the next Step in `implementation.md` whose checkboxes are not all `[x]` and dispatches a managed Step-execution worker to execute that Step's implementation body

#### Scenario: Coordinator reaches the next unchecked Step on a later iteration
- **WHEN** the coordinator finishes a Step's STOP & COMMIT checklist (commit authorized or declined) and an unchecked Step remains
- **THEN** the coordinator dispatches a NEW Step-execution worker for the next unchecked Step — it does not execute the next Step's body itself, even when the next Step is small or familiar

#### Scenario: Coordinator does not absorb execution noise
- **WHEN** a Step requires reading files before writing, running a RED test, or iterating on GREEN
- **THEN** those operations are performed by the dispatched worker(s), and only the compact worker report (not the raw file dumps, tracebacks, or iteration logs) returns to the coordinator

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

### Requirement: Step-execution work is dispatched via the managed RED/GREEN worker bindings

The Step-execution work SHALL be dispatched through the managed apply worker bindings (`sai-4-red-worker` and `sai-4-green-worker`), projected from the worker-matrix on the budget tier for both harnesses. The RED worker authors tests (blind in the split flow; green-exception in the production-free flow) and the GREEN worker implements with an absolute test-file prohibition. The previous dispatch through the per-harness `budget-subagent` skill binding is superseded: the write-capable cheap-tier Step-execution role is now the managed apply worker bindings, whose model tier is the budget tier, not the coordinator's model.

The workers SHALL NOT be dispatched to `budget-explorer` (read-only) and SHALL NOT be replaced by direct coordinator execution of the Step body.

#### Scenario: managed worker bindings used for Step dispatch
- **WHEN** the coordinator dispatches a Step-execution worker for a Step in `implementation.md`
- **THEN** the dispatch uses the active `sai-4-red-worker` or `sai-4-green-worker` binding (budget tier), never a raw `budget-subagent` skill dispatch

#### Scenario: budget-explorer is NOT used for step dispatch
- **WHEN** the coordinator needs a write-capable Step-execution worker
- **THEN** it dispatches the RED or GREEN worker binding, NOT `budget-explorer` (which is read-only)

#### Scenario: Step-execution worker model is the budget tier, not the coordinator's model
- **WHEN** the managed apply worker bindings resolve a model
- **THEN** the resolved model is the budget tier — the coordinator does NOT force the worker to inherit its own model

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
When the implementation plan reaches a STOP & COMMIT marker, the agent SHALL apply commit message format rules from `@sai/policies/commit-rules.md` when proposing the commit message. The commit-rules MUST be loaded at or before the point where the agent drafts a commit message proposal.

#### Scenario: Agent reaches STOP & COMMIT without commit-rules loaded
- **WHEN** `apply.md` is executed and a STOP & COMMIT marker is encountered
- **THEN** the agent MUST have loaded `@sai/policies/commit-rules.md` before drafting the commit message, ensuring Conventional Commits format, ≤50-char subject, and self-critique checklist are applied

#### Scenario: Commit proposed by apply matches commit-rules constraints
- **WHEN** the agent proposes a commit message at a STOP & COMMIT marker
- **THEN** the proposed subject MUST follow `type(scope): description` format, be ≤ 50 characters, and every claim MUST map to staged hunks only

### Requirement: Explicit permission gate at STOP & COMMIT stays in the main thread
When `apply.md` is executed and a STOP & COMMIT marker is encountered, the main thread (coordinator) SHALL propose the commit message and ask the user for explicit per-invocation authorization before running `git commit`. The STOP & COMMIT human authorization gate SHALL remain in the coordinator — it SHALL NOT be delegated to the subagent. Silently skipping the commit step is a spec violation. The authorization prompt MUST be presented as a closed-choice prompt with options `yes` / `no` (per the "Closed-choice prompts" rule in `remember.md`, which gives the per-harness option-picker mapping). The coordinator commits only on an explicit `yes`; anything else (no, silence, redirect, or any other reply) is a decline.

#### Scenario: User grants commit permission
- **WHEN** the coordinator reaches a STOP & COMMIT marker and the user answers `yes` to the proposed commit
- **THEN** the coordinator runs `git commit` and reports the resulting SHA + subject

#### Scenario: User declines or does not respond
- **WHEN** the coordinator reaches a STOP & COMMIT marker and the user does not answer `yes`
- **THEN** the coordinator MUST NOT run `git commit`; MUST describe the staged changes and instruct the user to commit themselves

#### Scenario: Subagent reports a STOP & COMMIT was reached
- **WHEN** a subagent report indicates a STOP was reached at a STOP & COMMIT marker
- **THEN** the coordinator proposes the commit message and asks via a closed-choice yes/no prompt, committing only on explicit `yes` and otherwise describing the staged changes for the user to commit themselves

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

