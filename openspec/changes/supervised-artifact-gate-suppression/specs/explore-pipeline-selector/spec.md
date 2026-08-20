## MODIFIED Requirements

### Requirement: Active supervision rejects duplicate starts

An active supervised run SHALL begin when the user confirms a picker selection, or when explore identifies the sole uncompleted change immediately before dispatch. It SHALL remain active through spec-worker execution and continuation, the in-session review rounds, machine-feedback processing, the supervised gate application point (shared gate with `mode = supervised`, which auto-executes next-action without a user-facing picker), the phase transition, and — when the spec phase converges or ends by cap exhaustion — the chained design phase including its worker execution and continuation, its in-session review rounds, machine-feedback processing, the supervised design gate application point (same shared gate with `mode = supervised`), and post-gate overview generation. The interval SHALL end only when the chained design phase terminates, or, when a failed or cancelled spec worker stops the run before design, when that spec attempt completes, fails, or is cancelled. While that interval is active, another `Auto` selection SHALL receive an explicit already-running acknowledgement and SHALL NOT create a concurrent or queued duplicate run.

#### Scenario: Auto is selected during an active run

- **WHEN** the user selects `Auto` while supervision is already active
- **THEN** explore reports that the pipeline is already running
- **AND** it creates no additional dispatch or queue entry

#### Scenario: Auto is selected during the chained design phase

- **WHEN** the user selects `Auto` while the chained design phase of an active run is executing
- **THEN** explore reports that the pipeline is already running
- **AND** it creates no additional dispatch or queue entry

#### Scenario: interval ends after the design phase terminates

- **WHEN** the spec phase converged or ended by cap exhaustion and the chained design phase reaches its terminal outcome
- **THEN** the active-supervision interval ends
- **AND** a later `Auto` selection is eligible to begin a new run

#### Scenario: active interval includes supervised gate application, not a user-facing picker

- **WHEN** a supervised spec or design review round resolves the deferred-gate condition while a run is active
- **THEN** the active-supervision interval remains active across the supervised gate application point
- **AND** no user-facing artifact feedback picker is presented
