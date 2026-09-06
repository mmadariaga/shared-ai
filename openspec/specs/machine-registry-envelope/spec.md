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

The caller SHALL pin one `machineId@version` at session start and the sidecar SHALL route every later emission of that session to the pinned version.

#### Scenario: Pinned version is stable for the session

- **WHEN** a session starts pinned to `explore-stage@1` and a newer machine version registers later
- **THEN** the session keeps routing to `explore-stage@1` until it closes, and no emission silently upgrades versions mid-session

### Requirement: Pointer-only next

Every successful transition SHALL return a pointer-only `next` value with exactly the fields `follow` and `hint` under a fixed minimal template with path interpolation, and the service SHALL never render instruction content.

#### Scenario: Transition hands back a fetch pointer

- **WHEN** a transition succeeds
- **THEN** the response carries a `next` value whose `follow` names the step file path and whose `hint` carries the short fetch cue, with `@`-path resolution left entirely to the caller per harness fetch rules

### Requirement: Idempotent emit

Emissions SHALL be idempotent by `eventId`: resubmitting the same `eventId` SHALL return the same outcome without applying the transition twice. Seen-`eventId` outcomes SHALL be retained in a bounded per-session store of at most 1000 entries with oldest-first eviction, and the store SHALL clear on `close`.

#### Scenario: Retried emission applies once

- **WHEN** the caller resubmits an emission with an already-seen `eventId` after a transport doubt
- **THEN** the sidecar returns the original outcome and the machine state advances exactly once for that `eventId`

#### Scenario: Retention is bounded per session

- **WHEN** a session accumulates more than 1000 seen `eventId` outcomes
- **THEN** the oldest outcomes are evicted first and the store is empty again after `close`

### Requirement: Closed error vocabulary

The platform SHALL reject invalid emissions with a closed error vocabulary and every rejection SHALL return the current state's pointer so the caller always knows where to fetch next.

#### Scenario: Rejection still points forward

- **WHEN** an emission is rejected under the closed vocabulary
- **THEN** the response names the error and carries the current state's `next` pointer instead of leaving the caller without a fetch target

### Requirement: No cross-machine guards

The platform SHALL NOT enforce guards across machines in PoC scope; cross-machine composition stays out of scope and the caller orchestrates any multi-machine flow.

#### Scenario: Machines compose only through the caller

- **WHEN** a flow needs two hosted machines in one session
- **THEN** the caller issues separate pinned emissions to each machine and no sidecar-side guard couples or sequences them

