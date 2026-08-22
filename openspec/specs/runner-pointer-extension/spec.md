# runner-pointer-extension Specification

## Purpose
TBD - created by archiving change spec-step-gated-instructions. Update Purpose after archive.
## Requirements
### Requirement: Opt-in static step_pointer_map adapter field

The shared command runner SHALL admit an optional static `step_pointer_map` adapter field alongside `progress_plan` and `recovery_policy` — fully known at dispatch and immutable for the active adapter segment under the same segment reading — and SHALL NOT require it: an adapter that declares no map keeps today's exact-literal single-line progress continuation, leaving every other phase observationally identical.

#### Scenario: undeclared map preserves today's behavior

- **WHEN** a phase adapter activates without declaring `step_pointer_map`
- **THEN** its progress continuations keep the exact-literal behavior, and no other surface of that phase changes

#### Scenario: declared map yields a two-line continuation payload

- **WHEN** an adapter declares `step_pointer_map` and a progress event changes the marked set
- **THEN** the coordinator renders the progress mark before resuming (render-before-resume ordering unchanged) and continues the same worker with exactly two payload lines: today's protocol continuation line, then the derived pointer line

### Requirement: Deterministic pointer derivation in the runner

When `step_pointer_map` is declared, the pointer line SHALL be derived deterministically from the declared plan and map: apply the just-processed event's marks and take the first declared step still unmarked in plan order; with every declared step marked, the second line reads exactly `Active step: none — complete remaining work and return your terminal result.` The pointer SHALL travel only in the continuation payload — the materialized binding literal is untouched, and no dispatch envelope or reconstruction field carries step paths. When the declaring adapter also requires replacement reconstruction, that reconstruction state SHALL additionally include the worker's `active_step_id`, and the replacement's first continuation SHALL carry the pointer line for that step.

#### Scenario: derivation is deterministic after each event

- **WHEN** the same progress event is processed twice against the same marked set, plan, and map
- **THEN** both derivations select the identical first unmarked declared step in plan order and emit the same pointer line

#### Scenario: binding literal stays byte-for-byte

- **WHEN** the two-line continuation is sent on a mapped phase
- **THEN** the first line remains today's exact protocol continuation literal and the materialized binding literal requires no edit

#### Scenario: replacement reconstruction restores the active step

- **WHEN** a replacement worker is reconstructed for an adapter whose map is declared
- **THEN** the reconstruction state includes the departing worker's `active_step_id`, and the replacement's first continuation carries the pointer line for that step

