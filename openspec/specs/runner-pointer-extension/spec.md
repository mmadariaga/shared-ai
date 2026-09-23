# runner-pointer-extension Specification

## Purpose
TBD - created by archiving change spec-step-gated-instructions. Update Purpose after archive.
## Requirements
### Requirement: Opt-in step_machine pointer routing

The shared command runner SHALL route just-in-time step pointers only through an optional static `step_machine` adapter field alongside `progress_plan` and `recovery_policy` — fully known at dispatch and immutable for the active adapter segment — and SHALL NOT require it: an adapter that declares no `step_machine` sends a progress continuation of exactly `continue_after_progress`, leaving every other phase observationally identical. The runner SHALL admit no static `step_pointer_map` adapter field.

#### Scenario: undeclared machine keeps the single-line continuation

- **WHEN** a phase adapter activates without declaring `step_machine`
- **THEN** its progress continuations are exactly `continue_after_progress`, and no other surface of that phase changes

#### Scenario: declared machine yields a two-line continuation payload

- **WHEN** an adapter declares `step_machine` and a progress event changes the marked set
- **THEN** the coordinator renders the progress mark before resuming and continues the same worker with exactly two payload lines: the protocol continuation line, then the pointer line taken from the machine's `next.follow`

### Requirement: Pointer delivery in the runner

The pointer line SHALL be taken from the declared step machine's `next.follow` per `@sai/policies/stage-machine.md` § Step machines; when the machine reports no remaining step, the second line reads exactly `Active step: none — complete remaining work and return your terminal result.` The pointer SHALL travel only in the continuation payload — the materialized binding literal is untouched, and no dispatch envelope or reconstruction field carries step paths. When the declaring adapter also requires replacement reconstruction, that reconstruction state SHALL additionally include the worker's `active_step_id`, and the replacement's first continuation SHALL carry the pointer line for that step.

#### Scenario: binding literal stays byte-for-byte

- **WHEN** the two-line continuation is sent on a machine-routed phase
- **THEN** the first line remains the exact protocol continuation literal and the materialized binding literal requires no edit

#### Scenario: replacement reconstruction restores the active step

- **WHEN** a replacement worker is reconstructed for an adapter whose step machine is declared
- **THEN** the reconstruction state includes the departing worker's `active_step_id`, and the replacement's first continuation carries the pointer line for that step
