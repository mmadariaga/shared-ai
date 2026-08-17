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

The apply human gates SHALL stay in the coordinator (main session): the Human Verification gate (presenting the Step's `- [ ]` checkboxes and waiting for user confirmation), the fast-track deferred combined list, the commit authorization gates (per-Step STOP & COMMIT and the terminal documentation commit), and the GREEN-conflict escalation. No worker SHALL present a gate to the user or decide a gate outcome.

#### Scenario: Human Verification stays in the coordinator

- **WHEN** a Step's Human section contains at least one `- [ ]` checkbox
- **THEN** the coordinator presents those checks to the user and waits; the RED or GREEN worker never presents or confirms them

#### Scenario: commit authorization stays in the coordinator

- **WHEN** a STOP & COMMIT marker is reached
- **THEN** the coordinator prints the pre-commit file visibility report, proposes the message, and asks through the closed-choice picker — the worker never stages or commits

### Requirement: coordinator-owns-commit

The commit SHALL be executed by the coordinator in the main session only: the STOP & COMMIT checklist (pre-commit report, message proposal, session-flag check, closed-choice authorization, `git add` + `git commit` on explicit yes), the fast-track auto-commit, and the terminal documentation commit. Workers SHALL be barred from all git operations and from creating commits.

#### Scenario: commit runs only in the main session

- **WHEN** the user authorizes a per-Step commit
- **THEN** the coordinator stages the add-list paths and commits with the proposed message; no worker performs any git operation

#### Scenario: terminal documentation commit stays coordinator-side

- **WHEN** the final sweep passes and the Learnings Promotion Pass completes
- **THEN** the coordinator evaluates the fixed terminal set and commits it through the terminal gate, never a worker

### Requirement: Worker payloads author emission time

The apply coordinator SHALL retain task-list, verification, union, gate, and commit ownership while RED and GREEN workers author `emitted_on` in their lifecycle payloads.

#### Scenario: Apply receives a timestamped result
- **WHEN** a RED or GREEN worker returns progress or a terminal result
- **THEN** the coordinator uses the payload timestamp for progress rendering without taking over its composition.
