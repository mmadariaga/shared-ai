# machine-registry-envelope Specification

## Purpose
TBD - created by archiving change state-machine-sidecar. Update Purpose after archive.
## Requirements
### Requirement: Uniform envelope

The platform SHALL expose one uniform request/response envelope for every hosted machine, carrying the target `machineId@version`, the event name, and the caller-supplied `eventId` on requests, and the current state, the conversation-carried snapshot, and the `next` pointer on responses.

#### Scenario: One envelope for every machine

- **WHEN** the caller emits an event to any registered `machineId@version`
- **THEN** the request and response shapes are identical regardless of which machine handles the event, and adding an eleventh machine introduces no new envelope

### Requirement: Code machine registry

The platform SHALL keep the machine registry in code where each entry defines `initialState`, `transition`, and `project`, and adding a machine SHALL require only a new module plus one registration line.

#### Scenario: New machine is a module plus one line

- **WHEN** a developer adds a machine following the registry contract
- **THEN** the machine is routable by its `machineId@version` with no envelope, transport, or discovery change

### Requirement: Version pinning and routing

The store CLI tool SHALL NOT pin one `machineId@version` for the session. Every `emit` and optional restore call SHALL name a `machineId`. An omitted or unparsable `machineId` SHALL be `INVALID_EVENT`. An unknown id SHALL be `UNKNOWN_MACHINE`. A known machine id with a non-registered version SHALL be `VERSION_MISMATCH`. The same session id SHALL accept emissions to `explore-idea@1` and then `explore-slice@1` without `VERSION_MISMATCH`. Retired `explore-stage@1` SHALL be `UNKNOWN_MACHINE` with no alias.

#### Scenario: Pinned version is stable for the session

- **WHEN** a session has already emitted to `explore-idea@1` and the caller later invokes `emit` to `explore-slice@1` in the same session id
- **THEN** the second emit is routed to `explore-slice@1` and is not rejected as `VERSION_MISMATCH` (unchanged from prior sidecar behavior, CLI-invoked)

#### Scenario: Omitted machineId is INVALID_EVENT

- **WHEN** the caller invokes `emit` or restore without a parsable `machineId`
- **THEN** the store returns `{error: "INVALID_EVENT", next: {follow, hint}}` and does not route to the first persisted machine (updated from prior HTTP POST to CLI invocation)

#### Scenario: Mistyped machineId is UNKNOWN_MACHINE

- **WHEN** the caller invokes `emit` with a machine id that is not registered
- **THEN** the store returns `{error: "UNKNOWN_MACHINE", next: {follow, hint}}` (unchanged from prior sidecar behavior, CLI-invoked)

### Requirement: Pointer-only next

Every successful transition SHALL return a pointer-only `next` value with exactly the fields `follow` and `hint` under a fixed minimal template with path interpolation, and the service SHALL never render instruction content.

#### Scenario: Transition hands back a fetch pointer

- **WHEN** a transition succeeds
- **THEN** the response carries a `next` value whose `follow` names the step file path and whose `hint` carries the short fetch cue, with `@`-path resolution left entirely to the caller per harness fetch rules

### Requirement: Idempotent emit

Emissions SHALL be idempotent by `eventId`: re-submitting the same `eventId` SHALL return the same outcome without applying the transition twice. Seen-`eventId` outcomes SHALL be retained in a bounded per-session ledger (`lastEventId`, `lastOutcome` per machine) persisted in the session file with oldest-first eviction when the in-memory session limit is reached, and the ledger SHALL clear on `close`.

#### Scenario: Retried emission applies once

- **WHEN** the caller re-invokes `emit` with an already-seen `eventId` after a process restart or transport doubt
- **THEN** the store returns the original outcome and the machine state advances exactly once for that `eventId` (updated from in-process seen-store to disk-persisted ledger)

#### Scenario: Retention is bounded per session

- **WHEN** a session accumulates outcomes from many distinct `eventId` values
- **THEN** the oldest outcomes are evicted first when a limit is reached and the store continues without growing unbounded (principle preserved, implementation in session file per-machine ledger)

### Requirement: Closed error vocabulary

The platform SHALL reject invalid emissions with a closed error vocabulary and every rejection SHALL return the current state's pointer so the caller always knows where to fetch next.

#### Scenario: Rejection still points forward

- **WHEN** an emission is rejected under the closed vocabulary
- **THEN** the response names the error and carries the current state's `next` pointer instead of leaving the caller without a fetch target

### Requirement: No cross-machine guards

The platform SHALL NOT enforce guards across machines in PoC scope; cross-machine composition stays out of scope and the caller orchestrates any multi-machine flow. The sidecar SHALL route each named-machine emission independently after the session pin is lifted.

#### Scenario: Machines compose only through the caller

- **WHEN** a flow needs two hosted machines in one session
- **THEN** the caller issues separate named-machine emissions to each machine and no sidecar-side guard couples or sequences them

