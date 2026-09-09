## MODIFIED Requirements

### Requirement: Version pinning and routing

The sidecar SHALL NOT pin one `machineId@version` for the session. Every `/emit` and `/restore` SHALL name a `machineId`. An omitted or unparsable `machineId` SHALL be `INVALID_EVENT`. An unknown id SHALL be `UNKNOWN_MACHINE`. A known machine id with a non-registered version SHALL be `VERSION_MISMATCH`. The same chatId SHALL accept emits to `explore-idea@1` and then `explore-slice@1` without `VERSION_MISMATCH`. Retired `explore-stage@1` SHALL be `UNKNOWN_MACHINE` with no alias.

#### Scenario: Pinned version is stable for the session

- **WHEN** a session has already emitted to `explore-idea@1` and the caller later emits to `explore-slice@1` in the same chatId
- **THEN** the second emit is routed to `explore-slice@1` and is not rejected as `VERSION_MISMATCH`

#### Scenario: Omitted machineId is INVALID_EVENT

- **WHEN** the caller POSTs `/emit` or `/restore` without a parsable `machineId`
- **THEN** the sidecar returns `INVALID_EVENT` and does not route to the first persisted machine

#### Scenario: Mistyped machineId is UNKNOWN_MACHINE

- **WHEN** the caller POSTs `/emit` with a machine id that is not registered
- **THEN** the sidecar returns `UNKNOWN_MACHINE`

### Requirement: No cross-machine guards

The platform SHALL NOT enforce guards across machines in PoC scope; cross-machine composition stays out of scope and the caller orchestrates any multi-machine flow. The sidecar SHALL route each named-machine emission independently after the session pin is lifted.

#### Scenario: Machines compose only through the caller

- **WHEN** a flow needs two hosted machines in one session
- **THEN** the caller issues separate named-machine emissions to each machine and no sidecar-side guard couples or sequences them
