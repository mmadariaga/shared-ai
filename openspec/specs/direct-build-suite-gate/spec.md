# direct-build-suite-gate Specification

## Purpose
TBD - created by archiving change direct-build-suite-gate. Update Purpose after archive.

## Requirements

### Requirement: Direct Build runs a mandatory suite gate before backfill

The full `direct-build-unattended` route SHALL run Step 2b, the suite gate, after the Step 2 functional fix loop converges or exhausts its cap and before Step 3 backfill preparation. The gate SHALL run the indicated and related tests under `sai/policies/test-execution.md`: on the first run and on every gate round, its test set SHALL be the test files the implementer created or modified plus the tests that `test-select.js select` reports for the diff since `base_sha` (untracked, unstaged, and deleted paths included, the dirty git state excluded), computed again at every round. The full suite SHALL run only when the selection cannot be trusted, and the routine full-suite run belongs to CI. When the test set holds no test, no test SHALL run, the gate SHALL be green, and `Verification` SHALL say that no test is related to the changes. The gate's completion criterion SHALL be binary: green, which continues to Step 3, or stop. The gate SHALL be a substep of `Build/Implement`, SHALL NOT add a panel entry, and SHALL NOT renumber the eight-step flow. The coordinator SHALL record the dirty git state when it dispatches the implementer, in the run directory and as the `baseline` record of `direct-build-run@1`.

#### Scenario: Green suite continues to backfill

- **WHEN** the suite gate's first run completes with no failing test
- **THEN** the route continues to Step 3 with no `base_sha` check, and `Verification` names the test command line, its selection result, and the green result

#### Scenario: The gate adds no panel entry

- **WHEN** the suite gate runs during a Direct Build slice
- **THEN** it runs as a substep of `Build/Implement` and the route projection still shows exactly `Build/Implement`, `Backfill`, and `Archive`

#### Scenario: No related test makes the gate green

- **WHEN** the implementer touched no test file and `select` reports no test for the diff since `base_sha`
- **THEN** no test runs, the gate is green, and `Verification` says that no test is related to the changes

### Requirement: An executor runs the full test suite

The coordinator SHALL resolve the test command once with `test-select.js command` and SHALL run each gate run through an executor subagent dispatched with the loaded budget executor binding and opening with its `ready` handshake, handing it the exact command line built from the resolved command, its scoping idiom, and the gate's test set (the full suite once, with the reason kept, when the selection answers `full`), never a generic goal. The executor SHALL return exactly the command line, whether it ran, the exit code, and the identifiers of the failing tests. The executor SHALL NOT move HEAD and SHALL NOT touch the working tree beyond running the tests. Each run SHALL append one line to `selection.md` in the run directory.

#### Scenario: Executor reports the observed suite result

- **WHEN** the suite gate dispatches its executor
- **THEN** the executor returns the command line, whether it ran, the exit code, and the failing test identifiers, leaving HEAD and the working tree unchanged

#### Scenario: An untrusted selection runs the full suite once

- **WHEN** `select` answers `full` for a gate run
- **THEN** the executor runs the full suite once and the gate records the reason in `selection.md`

### Requirement: A missing suite skips the gate with a pinned notice

When the executor finds no test suite in the project, explore SHALL print exactly `> Suite gate: skipped — no test suite found` and SHALL continue to Step 3.

#### Scenario: No suite found

- **WHEN** the executor reports that the project has no test suite
- **THEN** explore prints `> Suite gate: skipped — no test suite found`, continues to Step 3, and `Verification` states that no test suite was found

### Requirement: First red run classifies failures at base_sha

Every failing test SHALL be classified lazily under `sai/policies/test-execution.md` before any gate round: it SHALL first be rerun once at the current state through a second executor dispatch, where a pass makes it flaky (reported in `Verification`, never sent to the implementer, never blocking); a test that still fails SHALL then run at `base_sha` through `test-select.js swap --base <base_sha> --paths-file <paths file>` and `restore`, with the swap record kept as the `swap` record of `direct-build-run@1` and the verdict of `restore` read before anything else happens. A test that also fails at `base_sha` SHALL be a pre-existing failure that is reported in `Verification`, never sent to the implementer, and never blocking. A test that passes at `base_sha`, does not exist there, or cannot run there SHALL be a new failure, and so SHALL every failure when `swap` answers `refused` or a tool error. A `restore` that answers `failed` SHALL be an obstacle of `step-2b` that the run never leaves unresolved: nothing is staged, committed, or continued while the working tree holds files of `base_sha`. When every failing test is flaky or pre-existing, no gate round SHALL run and the route SHALL continue to Step 3. The temporary detached `git worktree` at `base_sha` SHALL NOT be used.

#### Scenario: Every red test is pre-existing

- **WHEN** every failing test fails again on its rerun and also fails at `base_sha`
- **THEN** no gate round runs, the route continues to Step 3, and `Verification` lists those tests as pre-existing failures

#### Scenario: Pre-existing and new failures together

- **WHEN** the first red run contains both tests that fail at `base_sha` and tests that pass at `base_sha`
- **THEN** only the tests that pass at `base_sha` are sent to the implementer as new failures, and the pre-existing failures are reported without blocking

#### Scenario: Unclassifiable tests block

- **WHEN** a failing test cannot be run at `base_sha`, or `swap` answers `refused`
- **THEN** it counts as a new failure

#### Scenario: The classification worktree leaves no trace

- **WHEN** the `base_sha` check finishes, including when the run of the failing tests fails
- **THEN** `restore` brings the run's files back, HEAD and the index are untouched, and the no-commit guard sees no movement

#### Scenario: A flaky failure does not block

- **WHEN** a failing test passes on its rerun at the current state
- **THEN** it is reported as flaky in `Verification` and is never sent to the implementer

### Requirement: Gate rounds correct new failures through the same implementer

One gate round SHALL be one continuation of the same implementer worker carrying the new failures as an ordered finding list, the fix-loop continuation type, followed by one rerun of the gate's test set, computed again, through a fresh executor dispatch. The `gate_rounds` counter SHALL allow at most three completed gate rounds per slice attempt, SHALL reset on a new attempt, and SHALL be independent of `fix_rounds`; exhausting either counter SHALL NOT consume the other. A test that failed in no earlier run of the gate but passed in one with the change SHALL be a new failure directly, with no `base_sha` check. A gate round SHALL NOT reopen the Step 2 adversarial review. Every test file the implementer touches in a gate round SHALL be recorded for `Verification` and SHALL join the gate's indicated tests.

#### Scenario: A correction breaks a previously green test

- **WHEN** a gate-round correction makes a test fail that passed in the first gate run
- **THEN** that test is a new failure without a `base_sha` check

#### Scenario: Gate and fix-loop budgets are independent

- **WHEN** the adversarial review exhausted `fix_rounds` or a gate round runs
- **THEN** `gate_rounds` and `fix_rounds` are counted separately, and the gate round does not reopen the adversarial review

### Requirement: Unresolved new failures or an unrunnable suite stop the route

An ambiguous test command, or a test command that fails before running any test, SHALL be an obstacle of `step-2b` under `sai/policies/test-execution.md` and `sai/policies/obstacle-escalation.md`, with a budget of 3 attempts, each a different approach, and SHALL never let the route continue as if tests had run. When new failures remain after the third completed gate round, or when that obstacle's budget is spent, the route SHALL stop at its own terminal suite gate, defined in Step 2b of `sai/commands/explore/direct-build-coordinator.md` without citing another command: the command and the failure SHALL be reported and nothing after the gate SHALL be run or marked; Steps 3 through 8 SHALL NOT run, so no backfill, archive, or commit occurs; guard window 1 SHALL be verified; the changes SHALL stay unstaged in the working tree; the shared stopped Direct Build terminal report SHALL state in What you need to know that the run is incomplete and name the verification limitation, and SHALL list the red tests or the command and error in Verification within Execution details; and explore SHALL then emit `{intent: fail}` to `explore-slice@1`. The stop SHALL escalate under `sai/policies/obstacle-escalation.md`, with its options following the report as a separate decision prompt. The slice SHALL be marked failed and remain retryable, a retry SHALL run the suite gate afresh, and no later slice SHALL start. The stop SHALL NOT enter the slice completion transition.

#### Scenario: New failures remain after three gate rounds

- **WHEN** new failures remain after the third completed gate round
- **THEN** the route runs no backfill, archive, or commit, leaves the changes unstaged, reports stopped incompleteness before the red-test diagnostic record, emits `{intent: fail}`, and starts no later slice

#### Scenario: The suite cannot run

- **WHEN** the test command fails before running any test because of missing dependencies, a broken environment, or a runner error, on three attempts with different approaches
- **THEN** the route stops, identifies the verification limitation before the detailed command and error, and runs no backfill, archive, or commit

#### Scenario: The gate does not depend on the apply command

- **WHEN** `sai/commands/explore/direct-build-coordinator.md` is read after `/sai-4-apply` is retired
- **THEN** its Step 2b stop branch states the terminal suite gate behavior itself and does not cite `/sai-4-apply`

### Requirement: The no-specs POC profile runs no suite gate

The Direct Build `--no-specs` POC profile SHALL run only Steps 1 and 2 and SHALL NOT run Step 2b.

#### Scenario: POC skips the suite gate

- **WHEN** the POC lane dispatches Direct Build with `--no-specs`
- **THEN** the implementer and functional fix loop run and the suite gate does not
