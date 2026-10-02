# stage-machine-emit-delivery Specification

## Purpose
TBD - created by archiving change sai-state-emit-via-stdin. Update Purpose after archive.

## Requirements

### Requirement: Single canonical emit invocation form
`sai/policies/stage-machine.md` SHALL document exactly one event emit invocation form, `echo '<json>' | node <tool-path> emit <id> <machineId> -`, with the JSON in single quotes, plain double quotes inside, and nothing escaped. It SHALL document only two other emit forms. The first SHALL be the step-machine progress emit, `echo '<payload-json>' | node <tool-path> emit <id> <machineId> --progress [--with-overview true|false] -`, which carries a worker progress payload rather than event JSON. The second SHALL be the explore block emit, `node <tool-path> emit <id> explore-slice@1 --ready-to-propose -`, which carries a `Ready to Propose` block set as literal text rather than event JSON. The policy SHALL state that the event form is identical in Bash and PowerShell 7 on both Claude Code and opencode. Windows PowerShell 5.1 SHALL be outside the supported-shell contract. The policy SHALL NOT document `Legacy` argument passing, escaped doubles, or an argv event form. The policy SHALL state that the store strips a leading BOM and surrounding whitespace or line breaks from an event, and that shell pipes may re-encode text and received characters are accepted as received. The `sai-state` entries in `sai/policies/tool-execution-permissions.md` SHALL state that `emit` takes the event JSON on stdin in the same form, and that the same entries cover the progress emit form.

#### Scenario: Reader emits from any supported shell
- **WHEN** a reader follows the canonical example in Bash or PowerShell 7
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
The stage-machine policy SHALL require that a recordedList event carries only list identifiers (such as E1, E2, I1, or Step ids) and never item text, because the machine uses the list only for its recorded or empty state. Explore-slice is the sole exception: its recordedList carries change names, which are kebab-case identifiers, because that machine tracks slices by name. Route events SHALL carry no slice name and no pick; the machine always chooses the first pending entry in that ordered inventory.

#### Scenario: Caller records an agreed edge-case list
- **WHEN** a caller records an agreed edge-case list through a recordedList emit
- **THEN** the payload carries identifiers such as E1,E2 and no item text

#### Scenario: Explore route emits carry no slice name
- **WHEN** a Plan or Direct Build route emits to explore-slice
- **THEN** the emit carries only route intent with no slice name and the first pending entry starts.

### Requirement: Block emit travels as literal text
The stage-machine policy SHALL document the block emit under § Event delivery as the one exception to single-quoted JSON delivery. The block set SHALL travel as literal text: a quoted heredoc in Bash and a single-quoted here-string in PowerShell, on both Claude Code and opencode. Nothing inside SHALL be expanded or escaped, the PowerShell closing `'@` SHALL start its own line, and the set SHALL be sent exactly as it will be displayed. The policy SHALL state that an empty or cut-off delivery returns `EVENT_UNPARSEABLE` and falls under the corrective retry. It SHALL also state that a validation failure does not fall under the corrective retry and follows the retry rule of the command that sends the block set.

#### Scenario: Reader sends a block set from either shell
- **WHEN** a reader follows the block emit example in Bash or PowerShell
- **THEN** they pass the block set through a quoted heredoc or a single-quoted here-string with no escaping

#### Scenario: Validation failure is not a delivery failure
- **WHEN** a block emit returns an invalid `validation` verdict with no `reason`
- **THEN** the corrective retry does not apply, and the sending command's own retry rule governs
