# User-Initiated Redispatch Specification

## Purpose
TBD

## Requirements

### Requirement: User-initiated actions are outside system-managed caps

System-managed retry, review, and replacement caps SHALL constrain only actions initiated by the system. An explicit user-initiated dispatch or re-dispatch SHALL be treated as a new user action and SHALL not consume or accumulate against those system-managed caps.

#### Scenario: User dispatch is outside the replacement budget
- **WHEN** the user explicitly requests a dispatch after a terminal routing failure
- **THEN** the coordinator treats it as a new user action and leaves the system-managed replacement budget unchanged

### Requirement: Worker-level recovery is an ordinary fresh dispatch

After a worker-level routing stop reaches terminal `failed`, an explicit user request in the current session SHALL perform an ordinary dispatch of the original envelope. The fresh worker SHALL not reuse the failed worker's journal, SHALL not be represented as a replacement-worker continuation, and SHALL be permitted in the same session without consuming the replacement budget. This requirement covers in-session worker recovery; coordinator-owned recovery is defined by the cross-harness path stop rule.

#### Scenario: User re-dispatches in the current session
- **WHEN** the user explicitly requests the original dispatch in the current session after a worker-level terminal routing failure
- **THEN** the coordinator starts an ordinary fresh worker from the original envelope, with no failed worker journal, and leaves the replacement budget unchanged

#### Scenario: No automatic retry follows a worker routing stop
- **WHEN** a worker emits the terminal failed routing result
- **THEN** the system does not automatically retry, replace, or continue the worker in the same chat, and waits for the user-initiated clean dispatch
