# stage-machine-emit-delivery Specification

## Purpose
TBD - created by archiving change sai-state-emit-via-stdin. Update Purpose after archive.

## Requirements

### Requirement: Single canonical emit invocation form
`sai/policies/stage-machine.md` SHALL document exactly one event emit invocation form, `echo '<json>' | node <tool-path> emit <id> <machineId> -`, with the JSON in single quotes, plain double quotes inside, and nothing escaped. The only other documented emit form SHALL be the step-machine progress emit, `echo '<payload-json>' | node <tool-path> emit <id> <machineId> --progress [--with-overview true|false] -`, which carries a worker progress payload rather than event JSON. The policy SHALL state that this form is identical in bash, Windows PowerShell 5.1, and PowerShell 7 on both Claude Code and opencode. It SHALL NOT document `Legacy` argument passing, escaped doubles, or an argv event form. The policy SHALL state that the store strips a leading BOM and surrounding whitespace or line breaks from an event, and that non-ASCII characters degraded to `?` by Windows PowerShell 5.1 are accepted as received. The `sai-state` entries in `sai/policies/tool-execution-permissions.md` SHALL state that `emit` takes the event JSON on stdin in the same form, and that the same entries cover the progress emit form.

#### Scenario: Reader emits from any supported shell
- **WHEN** a reader follows the canonical example in bash, Windows PowerShell 5.1, or PowerShell 7
- **THEN** they use the same `echo '<json>' | node <tool-path> emit <id> <machineId> -` line with no escaping and no `Legacy` setting

#### Scenario: Permission policy names the stdin form
- **WHEN** a reader consults the `sai-state` entries of `sai/policies/tool-execution-permissions.md`
- **THEN** each entry states that `emit` takes the event JSON on stdin with the canonical form

### Requirement: Bounded corrective retry for delivery failures
The stage-machine policy SHALL let a caller retry an emit without asking the user when the emit answers `reason: "EVENT_UNPARSEABLE"` or an `emit` usage error (exit 2), up to 2 times. Each retry MUST change the delivery form by correcting it to the canonical example, and repeating the same command SHALL NOT count as a retry. When both retries fail, the caller SHALL stop and show the error. The retry counter SHALL belong to that one emit, not to the session. The rule SHALL apply to every emitter, including coordinators that declare a `step_machine`, and SHALL run before any store failure is declared, because a delivery failure is not a store failure. Every other emit error SHALL keep today's stop-and-wait or degraded-mode behavior without retry: a logic failure (`INVALID_EVENT` without `reason`), `UNKNOWN_MACHINE`, `VERSION_MISMATCH`, or an unreachable or degraded store.

#### Scenario: Delivery failure is corrected and retried without asking
- **WHEN** an emit answers `INVALID_EVENT` with `reason: "EVENT_UNPARSEABLE"`
- **THEN** the caller retries that emit in the canonical stdin form without asking the user, at most twice, and stops and shows the error if both retries fail

#### Scenario: Logic failure stops without retry
- **WHEN** an emit answers `INVALID_EVENT` without `reason`
- **THEN** the caller stops, shows the error, and waits for the user without retrying

#### Scenario: Step-machine coordinator retries before declaring a store failure
- **WHEN** a coordinator that declares a `step_machine` receives an emit usage error with exit 2
- **THEN** it runs the corrective retry before treating the result as a store failure

### Requirement: Recorded lists carry identifiers only
The stage-machine policy SHALL require that a `recordedList` event carries only list identifiers (such as `"E1"`, `"E2"`, `"I1"`, or Step ids) and never item text, because the machine uses the list only for its recorded or empty state. `explore-slice@1` is the sole exception: its `recordedList` and `pick` carry change names, which are kebab-case identifiers, because that machine tracks slices by name.

#### Scenario: Caller records an agreed edge-case list
- **WHEN** a caller records an agreed edge-case list through a `recordedList` emit
- **THEN** the payload carries identifiers such as `["E1","E2"]` and no item text
