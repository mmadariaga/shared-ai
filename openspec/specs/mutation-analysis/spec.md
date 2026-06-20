## ADDED Requirements

### Requirement: Mutation Analysis Pass Exists In The Review Workflow

The review workflow in `sai/instructions/review.md` SHALL include a Mutation Analysis pass, designated pass 11, that runs after the existing ten review passes. The pass MUST perform mutation testing scoped to the diff against the parent branch and emit surviving mutants as findings in `review.md`. The `review` artifact instruction in `openspec/schemas/sai-workflow/schema.yaml` MUST name eleven passes (including Mutation Analysis), not ten.

#### Scenario: Pass 11 documented after the ten existing passes

- **WHEN** a reader inspects `sai/instructions/review.md`
- **THEN** a Mutation Analysis pass numbered 11 is present, ordered after the existing passes 1–10
- **AND** the `review` artifact instruction in `openspec/schemas/sai-workflow/schema.yaml` lists eleven passes including Mutation Analysis

### Requirement: Activation Gate

Pass 11 SHALL run only when BOTH conditions hold: the diff against the parent branch contains testable production code, AND the repository contains at least one test file. When either condition is false, the pass MUST be skipped silently (no finding, no Mutation Analysis section content beyond a skipped note).

#### Scenario: Diff has production code and repo has tests

- **WHEN** the diff against the parent branch contains testable production code
- **AND** the repository contains at least one test file
- **THEN** pass 11 executes

#### Scenario: No test files in the repository

- **WHEN** the repository contains no test file
- **THEN** pass 11 is skipped silently and emits no mutation findings

#### Scenario: Diff contains no testable production code

- **WHEN** the diff against the parent branch contains no testable production code (e.g. docs or config only)
- **THEN** pass 11 is skipped silently and emits no mutation findings

### Requirement: Mutation Scope Limited To The Diff

The set of files eligible for mutation SHALL be exactly the production-code files changed in the diff against the parent branch. Pass 11 MUST NOT mutate files outside that diff.

#### Scenario: Only diff files are mutated

- **WHEN** pass 11 selects mutation targets
- **THEN** every mutated file is a production-code file present in the diff against the parent branch
- **AND** no file outside that diff is mutated

### Requirement: Mutation Tool Auto-Detection

Pass 11 SHALL detect the available mutation testing tool by inspecting the project's manifest files. Manifests to inspect include `package.json` (Stryker), `pom.xml` or `build.gradle` (PIT), `pyproject.toml` or `requirements.txt` (mutmut), `go.mod` (go-mutesting), `Cargo.toml` (cargo-mutants), and `CMakeLists.txt` (mull). A tool is considered available when its package is declared as a project dependency. If a tool is detected, pass 11 SHALL run it, parse its surviving mutants, and MUST skip the LLM-as-mutator path. Otherwise, pass 11 SHALL fall back to the LLM-as-mutator path.

#### Scenario: Stryker detected in package.json

- **WHEN** a Stryker package is declared in `package.json` (e.g. `@stryker-mutator/core` or a runner package)
- **THEN** pass 11 runs Stryker, parses surviving mutants, and skips LLM-as-mutator

#### Scenario: PIT detected in pom.xml or build.gradle

- **WHEN** `org.pitest` is declared in `pom.xml` or the PIT plugin in `build.gradle`
- **THEN** pass 11 runs PIT, parses surviving mutants, and skips LLM-as-mutator

#### Scenario: Other supported tool detected

- **WHEN** mutmut, go-mutesting, cargo-mutants, or mull is declared in the corresponding manifest
- **THEN** pass 11 runs the detected tool, parses surviving mutants, and skips LLM-as-mutator

#### Scenario: No mutation tool detected

- **WHEN** no supported mutation tool is declared in any manifest
- **THEN** pass 11 falls back to the LLM-as-mutator path

### Requirement: Test Command Auto-Detection

Under the LLM-as-mutator path (Tier 2), pass 11 SHALL detect the project's test command by inspecting the same manifest files used for tool detection. Detection sources include: `scripts.test` in `package.json` (Node), `mvn test` or `gradle test` (JVM), `pytest` (Python), `go test ./...` (Go), `cargo test` (Rust). The detected test command is used for the baseline test pass and for every per-mutation test run (subject to the 60-second per-mutation timeout). If no test command can be detected, pass 11 SHALL report in `review.md` that mutation analysis could not run due to an undetermined test command and MUST NOT emit mutation findings.

#### Scenario: Test command auto-detected

- **WHEN** Tier 2 is active and a test command is detected in the manifest
- **THEN** pass 11 uses the detected command for the baseline and per-mutation test runs

#### Scenario: Test command not detectable

- **WHEN** Tier 2 is active and no test command can be detected from any manifest
- **THEN** pass 11 reports in `review.md` that mutation analysis could not run
- **AND** no mutation findings are emitted

### Requirement: LLM-As-Mutator Baseline And Per-Mutation Safety Protocol

Before any mutation under Tier 2, the baseline test suite MUST pass; if it does not, no mutation is applied. For each mutation, the executing subagent MUST follow this protocol in order: (1) pre-check that `git status --porcelain {file}` is empty; if dirty, STOP — do not mutate that file and ask the user to commit or undo; (2) apply the mutation; (3) run the test command with a 60-second timeout; (4) revert with the file-scoped command `git checkout -- {file}` — never a project-wide revert; (5) verify the revert by confirming `git diff {file}` is empty. If the revert verification fails, the mutation MUST be marked revert-failed.

#### Scenario: Baseline test suite fails

- **WHEN** the baseline test suite does not pass before mutation
- **THEN** no mutation is applied and pass 11 reports the baseline failure instead of mutation findings

#### Scenario: Per-mutation pre-check finds a dirty file

- **WHEN** `git status --porcelain {file}` is non-empty before applying a mutation to that file
- **THEN** the mutation is not applied
- **AND** the mutation is recorded as pre-check-failed

#### Scenario: Revert is file-scoped

- **WHEN** a mutation is reverted
- **THEN** the revert command is `git checkout -- {file}` scoped to the single mutated file
- **AND** no project-wide revert is issued

#### Scenario: Revert verification fails

- **WHEN** after reverting, `git diff {file}` is non-empty
- **THEN** the mutation is recorded as revert-failed

#### Scenario: Test run exceeds the timeout

- **WHEN** the test command for a mutation runs longer than 60 seconds
- **THEN** the run is bounded by the 60-second per-mutation timeout

### Requirement: Subagent Dispatch Contract

Under Tier 2, the main agent (frontier tier) SHALL decide which mutations to apply and what each mutation is. Mechanical apply/test/revert/verify I/O MUST be delegated to cheap-tier subagents (`budget-subagent`, `model: haiku`), one subagent per batch of mutations. Batches MUST be dispatched sequentially to avoid file conflicts. Each batch MUST contain at most 5–6 mutations so the subagent stays within its ~30 tool-call soft cap. The subagent output contract MUST return a per-mutation result for every mutation assigned to it; no assigned mutation may be silently dropped.

#### Scenario: Main agent reasons, subagent executes

- **WHEN** mutations are tested under Tier 2
- **THEN** the main agent decides the mutations
- **AND** a cheap-tier `budget-subagent` performs the apply/test/revert/verify I/O

#### Scenario: Batches run sequentially

- **WHEN** more than one batch of mutations exists
- **THEN** batches are dispatched one after another, not concurrently

#### Scenario: Batch size capped

- **WHEN** a batch is dispatched to a subagent
- **THEN** it contains at most 5–6 mutations

#### Scenario: Every assigned mutation is reported

- **WHEN** a subagent finishes a batch
- **THEN** its output contains one result for each mutation it was assigned
- **AND** no assigned mutation is omitted

### Requirement: Outcome To Finding Mapping

Each tested mutation has exactly one outcome, mapped to review output as follows. A killed mutation (a test failed) MUST produce no finding and remain internal only. A survived mutation (all tests passed) MUST be reported as a Major finding identified `mMUT-N` in `review.md`. A pre-check-failed mutation MUST be reported as a Major finding whose message is "Could not test {file}: uncommitted changes. Commit or undo and re-run review." A revert-failed mutation MUST be reported as a Blocker finding in `review.md` AND a critical working-tree-pollution warning MUST be printed to the user.

#### Scenario: Killed mutation produces no finding

- **WHEN** a mutation is killed by the test suite
- **THEN** no finding is written for it

#### Scenario: Survived mutation is Major

- **WHEN** a mutation survives the test suite
- **THEN** it is written as a Major finding identified `mMUT-N`

#### Scenario: Pre-check-failed mutation is Major with the could-not-test message

- **WHEN** a mutation is pre-check-failed
- **THEN** it is written as a Major finding stating "Could not test {file}: uncommitted changes. Commit or undo and re-run review."

#### Scenario: Revert-failed mutation is a Blocker with a pollution warning

- **WHEN** a mutation is revert-failed
- **THEN** it is written as a Blocker finding in `review.md`
- **AND** a critical working-tree-pollution warning is printed to the user

### Requirement: Surviving Mutant Finding Row Format

When pass 11 emits a finding for a surviving mutation, the finding row in `review.md` SHALL be identified `mMUT-N` (where N is a 1-based counter scoped to the surviving mutations in this review) and MUST contain the following fields in this order:

- **Location** — `path/to/file.ext:LINE` or `path/to/file.ext:LINE-LINE`
- **Mutation class** — one of `NegatedCondition`, `ChangedOperator`, `RemovedCall`, `ChangedReturn`, `NegatedBoolean`, `InvertedBranch`, `OffByOne`, or another concise label chosen by the agent
- **Original** — the unmutated code (or its essence) at the location
- **Applied** — the mutated code that was applied and reverted
- **Result** — a one-line statement that the mutation survived the test suite
- **Why it survives** — a one-sentence explanation referencing the missing test or untested branch
- **Suggested fix** — a concrete test the developer can add to catch this mutation

#### Scenario: Surviving mutant row contains all required fields

- **WHEN** pass 11 emits an `mMUT-N` finding
- **THEN** the row contains Location, Mutation class, Original, Applied, Result, Why it survives, and Suggested fix in that order

### Requirement: Revert-Failure Cascade Preserves Visibility

When a mutation is revert-failed, pass 11 MUST continue dispatching subsequent batches. The per-file pre-check on later batches naturally records files left dirty by the failed revert as pre-check-failed, so the downstream effect is visible rather than hidden.

#### Scenario: Later batches continue after a revert failure

- **WHEN** a mutation in an earlier batch is revert-failed
- **THEN** subsequent batches are still dispatched
- **AND** files left dirty cascade to pre-check-failed via the per-file pre-check

### Requirement: Full-Visibility Aggregate Invariant

Every mutation the main agent decides on MUST appear in the output, even when a technical impediment prevented testing it. The aggregate counts MUST satisfy the invariant: survived + killed + preCheckFailed + revertFailed == the total number of mutations decided by the main agent.

#### Scenario: Counts reconcile to the decided total

- **WHEN** pass 11 finishes
- **THEN** survived + killed + preCheckFailed + revertFailed equals the total number of mutations the main agent decided on

#### Scenario: An untested mutation still appears

- **WHEN** a mutation could not be tested due to a pre-check or revert impediment
- **THEN** it still appears in the output with its outcome (pre-check-failed or revert-failed)
