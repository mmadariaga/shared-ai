# security-worker-bindings Specification

## Purpose
TBD - created by syncing change sai-6-security-coordinator-worker-split. Update Purpose after archive.

## Requirements

### Requirement: Claude Code and opencode bindings dispatch the security worker

The Claude Code and opencode security-worker bindings SHALL render from the standalone worker template and carry only the create and continue calls for `sai-5-security-worker`: Claude Code creates it with `Agent` and continues it with `SendMessage` to the captured agent ID, and opencode creates it with `task` and continues it with the captured `task_id`. The creation dispatch SHALL carry only the ready prompt. The shared audit coordinator that fetches the binding SHALL own the lifecycle: when to create the worker, what each message carries, and when to replace it under its obstacle budget, a replacement receiving only the coordinator's hand-over note and no prior history or report contents.

#### Scenario: Routed security worker is dispatched
- **WHEN** the audit coordinator starts a security run on Claude Code or opencode
- **THEN** its matching binding creates the security worker with the ready prompt alone
- **AND** the other harness binding is not involved in the invocation

#### Scenario: Same-worker continuation fails
- **WHEN** the security worker returns no ready, stays silent, or drifts
- **THEN** the coordinator may create a replacement with the same binding call, within its attempt budget
- **AND** the replacement receives a hand-over note naming the symptom, not the old worker's history or report contents

### Requirement: Security bindings authorize read-only research and bounded dependency audits

The bindings SHALL authorize read-only `explore` research with the existing security output contract and shall authorize only bounded execution of the supported dependency-audit commands needed for SCA. They SHALL reject generic write-capable worker delegation, package installation, dependency updates, production edits, dependency-file edits, and configuration mutation.

#### Scenario: Large security diff needs research
- **WHEN** the worker delegates inspection of a diff over the existing 500-LOC threshold
- **THEN** the binding permits read-only `explore` research within the eight-call audit cap
- **AND** each delegated result uses the required bounded evidence fields

#### Scenario: Worker requests an unapproved operation
- **WHEN** the worker requests a command outside the supported audit-tool allowlist or requests a write-capable branch
- **THEN** the binding rejects the operation
- **AND** the security audit remains read-only

### Requirement: Security binding results stay closed and unchanged

The bindings SHALL return the worker's closed results — `step-done`, `question`, `completed`, and `failed` — to the coordinator unchanged, with worker-authored summaries, questions, `report_path`, `counts`, and `changed_files` intact. The security worker SHALL NOT ask the user to select a change, because the coordinator resolves the change before creating it. GitHub Copilot SHALL remain outside these bindings.

#### Scenario: Worker completes after resolution
- **WHEN** the security worker returns `completed`
- **THEN** the coordinator receives the worker-authored summary, the report path, the counts, and the changed-file paths unchanged
- **AND** no Copilot binding is involved
