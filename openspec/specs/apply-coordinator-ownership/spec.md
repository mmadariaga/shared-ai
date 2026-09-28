# apply-coordinator-ownership Specification

## Purpose

Defines what stays in the `/sai-4-apply` coordinator (main session) under the routed architecture: validation, the `changed_files` union, human gates, and commits are never delegated to the RED or GREEN workers.

## Requirements

### Requirement: coordinator-owns-validation

The apply coordinator SHALL perform the coordinator-owned verification itself: after every worker dispatch it SHALL unconditionally sweep the per-change scratch path, re-run the Step's Verification Checklist (quiet confirmation only, not the RED→GREEN cycle), and independently compare the checklist, changed paths, allowed files, baseline, and worker report before checkbox marking or commit gating. The workers SHALL NOT perform the coordinator's verification; their results are validated by the coordinator.

#### Scenario: coordinator verifies after every dispatch

- **WHEN** a RED or GREEN worker dispatch returns
- **THEN** the coordinator sweeps scratch, re-runs the Step's Verification Checklist, and compares evidence before proceeding

#### Scenario: verification is never delegated

- **WHEN** a Step is verified
- **THEN** the verification is performed by the coordinator in the main session, never by a worker

### Requirement: coordinator-owns-changed-files-union

The coordinator SHALL keep an invocation-scoped ordered duplicate-free union of every `changed_files` path reported by workers across dispatches and retries, and SHALL NOT reset it during the run. Because workers exclude scratch paths from their `changed_files` payloads (per `apply-red-green-worker-model`), the union SHALL contain no path below `.tmp/{change-name}/`, and the coordinator SHALL NOT add a scratch path to the union. The union SHALL feed the pre-commit file visibility report, the add-list derivation, and the terminal documentation commit.

#### Scenario: union accumulates across dispatches

- **WHEN** a split Step's RED dispatch and GREEN dispatch each report changed files
- **THEN** the coordinator unions both reports' paths in first-seen order, with no reset between dispatches

#### Scenario: union accumulates across retries

- **WHEN** a same-worker continuation reports changed files
- **THEN** the coordinator adds them to the same union without resetting the paths reported before the continuation

#### Scenario: scratch paths never enter the union

- **WHEN** a worker's `changed_files` payload omits `.tmp/{change-name}/` paths
- **THEN** the union contains no scratch path and the pre-commit add-list cannot target scratch

### Requirement: coordinator-owns-human-gates
The apply user-facing gates SHALL stay in the coordinator (main session): the commit authorization gates (per-Step STOP & COMMIT and the terminal documentation commit) and the GREEN-conflict escalation. Apply SHALL have no per-Step Human Verification gate and no fast-track deferred combined list. No worker SHALL present a gate to the user or decide a gate outcome, and no worker SHALL mark a checkbox or edit `implementation.md`.

#### Scenario: Human Verification stays in the coordinator
- **WHEN** a Step's Functional section contains at least one `- [ ]` checkbox
- **THEN** no gate is presented by anyone, because the Human Verification gate no longer exists; the terminal functional review re-exercises those checks later in the run

#### Scenario: commit authorization stays in the coordinator
- **WHEN** a STOP & COMMIT marker is reached
- **THEN** the coordinator prints the pre-commit file visibility report, proposes the message, and asks through the closed-choice picker — the worker never stages or commits

### Requirement: coordinator-owns-commit

The commit SHALL be executed by the coordinator in the main session only: the STOP & COMMIT checklist (pre-commit report, message proposal, session-flag check, closed-choice authorization, `git add` + `git commit` on explicit yes), the fast-track auto-commit, and the terminal documentation commit. Workers SHALL be barred from all git operations and from creating commits.

#### Scenario: commit runs only in the main session

- **WHEN** the user authorizes a per-Step commit
- **THEN** the coordinator stages the add-list paths and commits with the proposed message; no worker performs any git operation

#### Scenario: terminal documentation commit stays coordinator-side

- **WHEN** the final sweep passes and the learnings promotion completes
- **THEN** the coordinator evaluates the fixed terminal set and commits it through the terminal gate, never a worker

### Requirement: Worker payloads stay timeless

The apply coordinator SHALL retain task-list, verification, union, gate, and commit ownership while RED and GREEN workers author no time field in their lifecycle payloads (`timeless-worker`).

#### Scenario: Apply receives a worker result
- **WHEN** a RED or GREEN worker returns progress or a terminal result
- **THEN** the coordinator takes observation time from the validator's `validated_at`, never from the payload.

### Requirement: Coordinator-owned commit gates honor the session flag

The apply coordinator SHALL retain ownership of both commit gates and SHALL use the in-memory session authorization flag only to skip the authorization ask. It SHALL still print the pre-commit visibility report and proposed message and SHALL not bypass unrelated stops or operations.

#### Scenario: Active session flag skips only authorization
- **WHEN** the flag is active at a per-Step or terminal documentation commit gate
- **THEN** the coordinator prints the required report and message, then performs the authorized commit without presenting the authorization prompt

### Requirement: Every apply dispatch window is guarded and gates run between windows

Each Step SHALL be one no-commit-guard window spanning its RED, GREEN, and green-exception dispatches and their same-worker continuations, recovery and replacement workers included. The coordinator SHALL run the guard's `snapshot` step immediately before the Step's first dispatch proceeds, holding the returned SHA as invocation-scoped `guard_base`, and its `verify` step before each boundary the no-commit-guard policy lists: before presenting any question to the user, before the Step's commit gate — whether that gate asks the user or the commit is pre-authorized by fast-track or session authorization — and before acting on a run-closing result. After a human turn the coordinator SHALL snapshot again before the answer reaches a worker. A progress event, a notice, and a RED terminal followed by the GREEN dispatch SHALL take no guard call. The commit gate SHALL close the window, and the next Step SHALL open a fresh one. On a `violation` verdict the coordinator SHALL remediate exactly as the no-commit-guard policy prescribes and continue the route. The coordinator's own `git add` and `git commit` operations at the two commit-authorization gates SHALL always run between windows and never inside one; no apply window carries `allow_commit`.

#### Scenario: a Step dispatch closes its window before the scratch sweep

- **WHEN** a RED or GREEN dispatch of a Step returns and the coordinator runs the scratch sweep and comparisons of its post-dispatch sequence
- **THEN** those run inside the Step's running window with no guard call of their own, and the window is closed by a `verify` before the Step's next boundary — a question to the user or the Step's commit gate — with the coordinator's own `git add` and `git commit` running only between windows

#### Scenario: RED and GREEN of one Step share one window

- **WHEN** the RED worker returns its terminal result and the coordinator dispatches the GREEN worker for the same Step with no human turn in between
- **THEN** no guard call runs between the two dispatches and the Step's single window stays open

#### Scenario: the commit gate closes the Step window

- **WHEN** a Step reaches its commit gate, whether asked or pre-authorized
- **THEN** the coordinator verifies the Step's window before the gate, runs its own `git add` and `git commit` outside every window, and opens a fresh window for the next Step
