# direct-build-suite-gate Specification

## Purpose
TBD - created by archiving change direct-build-suite-gate. Update Purpose after archive.

## Requirements

### Requirement: Direct Build runs a mandatory suite gate before backfill

The full `direct-build-unattended` route SHALL run Step 2b, the suite gate, after the Step 2 functional fix loop converges or exhausts its cap and before Step 3 backfill preparation. The gate's completion criterion SHALL be binary: green, which continues to Step 3, or stop. The gate SHALL be a substep of `Build/Implement`, SHALL NOT add a panel entry, and SHALL NOT renumber the eight-step flow.

#### Scenario: Green suite continues to backfill

- **WHEN** the suite gate's first run completes with no failing test
- **THEN** the route continues to Step 3 with no `base_sha` check, and `Verification` names the suite command and the green result

#### Scenario: The gate adds no panel entry

- **WHEN** the suite gate runs during a Direct Build slice
- **THEN** it runs as a substep of `Build/Implement` and the route projection still shows exactly `Build/Implement`, `Backfill`, and `Archive`

### Requirement: An executor runs the full test suite

The coordinator SHALL run the project's full test suite through an executor subagent dispatched with the loaded budget executor binding and opening with its `ready` handshake. The executor SHALL return exactly the chosen command, whether it ran, the exit code, and the identifiers of the failing tests. The executor SHALL NOT move HEAD and SHALL NOT touch the working tree beyond running the suite.

#### Scenario: Executor reports the observed suite result

- **WHEN** the suite gate dispatches its executor
- **THEN** the executor returns the chosen command, whether it ran, the exit code, and the failing test identifiers, leaving HEAD and the working tree unchanged

### Requirement: A missing suite skips the gate with a pinned notice

When the executor finds no test suite in the project, explore SHALL print exactly `> Suite gate: skipped — no test suite found` and SHALL continue to Step 3.

#### Scenario: No suite found

- **WHEN** the executor reports that the project has no test suite
- **THEN** explore prints `> Suite gate: skipped — no test suite found`, continues to Step 3, and `Verification` states that no test suite was found

### Requirement: First red run classifies failures at base_sha

On the first red suite run only, and before any gate round, explore SHALL dispatch a second executor, with the same binding and `ready` handshake, that runs only the failing tests at `base_sha` in a temporary detached `git worktree` created outside the working tree and removed when the check finishes, even when the check fails. The executor SHALL return each test as `pass`, `fail`, or `unrunnable`. A `fail` test SHALL be a pre-existing failure that is reported in `Verification`, never sent to the implementer, and never blocking. A `pass` or `unrunnable` test SHALL be a new failure. When every red test is pre-existing, no gate round SHALL run and the route SHALL continue to Step 3.

#### Scenario: Every red test is pre-existing

- **WHEN** every failing test also fails at `base_sha`
- **THEN** no gate round runs, the route continues to Step 3, and `Verification` lists those tests as pre-existing failures

#### Scenario: Pre-existing and new failures together

- **WHEN** the first red run contains both tests that fail at `base_sha` and tests that pass at `base_sha`
- **THEN** only the tests that pass at `base_sha` are sent to the implementer as new failures, and the pre-existing failures are reported without blocking

#### Scenario: Unclassifiable tests block

- **WHEN** a failing test cannot be run at `base_sha`
- **THEN** it is classified `unrunnable` and counts as a new failure

#### Scenario: The classification worktree leaves no trace

- **WHEN** the `base_sha` check finishes, including when it fails
- **THEN** the temporary detached worktree is removed, HEAD and the working tree are untouched, and the no-commit guard sees no movement

### Requirement: Gate rounds correct new failures through the same implementer

One gate round SHALL be one continuation of the same implementer worker carrying the new failures as an ordered finding list, the fix-loop continuation type, followed by one suite rerun through a fresh executor dispatch. The `gate_rounds` counter SHALL allow at most three completed gate rounds per slice attempt, SHALL reset on a new attempt, and SHALL be independent of `fix_rounds`; exhausting either counter SHALL NOT consume the other. A test that fails for the first time in a later round SHALL be a new failure directly, with no `base_sha` check. A gate round SHALL NOT reopen the Step 2 adversarial review. Every test file the implementer touches in a gate round SHALL be recorded for `Verification`.

#### Scenario: A correction breaks a previously green test

- **WHEN** a gate-round correction makes a test fail that passed in the first gate run
- **THEN** that test is a new failure without a `base_sha` check

#### Scenario: Gate and fix-loop budgets are independent

- **WHEN** the adversarial review exhausted `fix_rounds` or a gate round runs
- **THEN** `gate_rounds` and `fix_rounds` are counted separately, and the gate round does not reopen the adversarial review

### Requirement: Unresolved new failures or an unrunnable suite stop the route

When new failures remain after the third completed gate round, or when the suite command fails before running any test, the route SHALL stop the way `/sai-4-apply`'s Terminal suite gate does: Steps 3 through 8 SHALL NOT run, so no backfill, archive, or commit occurs; guard window 1 SHALL be verified; the changes SHALL stay unstaged in the working tree; the shared stopped Direct Build terminal report SHALL state in What you need to know that the run is incomplete and name the verification limitation, and SHALL list the red tests or the command and error in Verification within Execution details; and explore SHALL then emit `{intent: fail}` to `explore-slice@1`. The slice SHALL be marked failed and remain retryable, and no later slice SHALL start. The stop SHALL NOT go through **Bounded Recovery** and SHALL NOT enter the slice completion transition.

#### Scenario: New failures remain after three gate rounds

- **WHEN** new failures remain after the third completed gate round
- **THEN** the route runs no backfill, archive, or commit, leaves the changes unstaged, reports stopped incompleteness before the red-test diagnostic record, emits `{intent: fail}`, and starts no later slice

#### Scenario: The suite cannot run

- **WHEN** the suite command fails before running any test because of missing dependencies, a broken environment, or a runner error
- **THEN** the route stops, identifies the verification limitation before the detailed command and error, and runs no backfill, archive, or commit

### Requirement: The no-specs POC profile runs no suite gate

The Direct Build `--no-specs` POC profile SHALL run only Steps 1 and 2 and SHALL NOT run Step 2b.

#### Scenario: POC skips the suite gate

- **WHEN** the POC lane dispatches Direct Build with `--no-specs`
- **THEN** the implementer and functional fix loop run and the suite gate does not
