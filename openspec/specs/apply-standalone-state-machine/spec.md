# apply-standalone-state-machine Specification

## Purpose
TBD - created by archiving change apply-standalone-state-machine. Update Purpose after archive.
## Requirements
### Requirement: apply-standalone machine owns the Step cursor

The apply coordinator SHALL spawn the `apply-standalone@1` machine once per run at the harness-session-derived stable key. The machine SHALL hold the Step inventory, the completed Steps, the active Step, that Step's routing mode, and its stage within that routing. The machine SHALL be re-seeded at every spawn from `implementation.md`; it SHALL NOT persist a cursor across runs, and where machine state and file disagree the file SHALL win.

#### Scenario: machine is spawned once per apply run
- **WHEN** `/sai-4-apply` starts on a change
- **THEN** the coordinator spawns `apply-standalone@1` at the stable session key and seeds it from the parsed `#### Step N:` headings and per-Step checkbox state

#### Scenario: file remains the authority across re-runs
- **WHEN** a re-run re-spawns and re-seeds the machine
- **THEN** the cursor derives from the current `implementation.md` state, and any divergence from a previous run resolves in the file's favour

### Requirement: Machine derivation implements the Step cursor rule

The machine's `transition()` SHALL implement the derivation formerly stated as prose in `coordinator.md`: a Step whose checkboxes are fully marked `[x]` is `done`, the first not-fully-marked Step in plan order is `active`, and the remainder are `pending`. That derivation SHALL exist in exactly one place; the coordinator SHALL NOT restate it.

#### Scenario: fully-marked Step is done
- **WHEN** the machine is seeded and a Step's checkboxes are all marked `[x]`
- **THEN** the machine classifies that Step as done

#### Scenario: first not-fully-marked Step is active
- **WHEN** the machine is seeded
- **THEN** the first not-fully-marked Step in plan order becomes active and the remainder are pending

### Requirement: Machine provides routing file pointers via self-gating

The coordinator SHALL determine the active Step's routing mode against the five conditions in `runner.md` § Step Routing Tree and emit that mode to the machine. The machine SHALL accept exactly one of `split-flow`, `green-direct`, `green-exception-test-only`, `green-exception-no-production`, or `stop-missing-contract`, and SHALL return a `next.follow` pointer to that mode's file under `sai/commands/apply/steps/`. The coordinator SHALL fetch only the named file and SHALL NOT load the whole routing tree. An unrecognized mode SHALL be rejected without advancing state.

#### Scenario: machine returns a routing file pointer
- **WHEN** the machine receives a valid routing mode
- **THEN** it returns `next.follow` naming that mode's routing file, and the coordinator fetches only that file

#### Scenario: machine rejects an invalid mode
- **WHEN** the machine receives an unrecognized mode
- **THEN** it returns a rejected outcome and does not advance state

#### Scenario: all Steps done routes to the terminal file
- **WHEN** every Step is done and no Step is active
- **THEN** the machine returns `next.follow` naming `sai/commands/apply/steps/terminal-lifecycle.md`

### Requirement: Machine is a pure function with no file I/O

The machine SHALL perform no file I/O. The coordinator SHALL read `implementation.md`, parse the `#### Step N:` headings in plan order, collect per-Step checkbox state, and pass both in the seeding signal as `recordedList` and `recordedDone`. The machine SHALL derive its cursor from that seeded state and the emitted routing mode alone.

#### Scenario: coordinator parses and passes the Step inventory
- **WHEN** the coordinator seeds the machine
- **THEN** it passes the parsed heading list and the completed-Step set in the seeding signal

#### Scenario: machine derives from seeded state only
- **WHEN** the machine is seeded
- **THEN** it derives the cursor without reading any file

### Requirement: Partially-completed Steps re-enter at their entry stage

A partially-marked Step SHALL re-seed as `active` with its stage reset to the Step's entry stage. The machine SHALL NOT restore an inner red, green, or checklist position, because checkbox granularity carries no inner-stage information.

#### Scenario: partially-marked Step re-enters at entry
- **WHEN** a re-run re-seeds a Step whose checkboxes are partly marked
- **THEN** that Step is active and its stage is the entry stage, so routing begins at that Step's entry file

### Requirement: No progress protocol is introduced

This machine SHALL NOT introduce a `progress_plan` declaration, a `step_pointer_map` declaration, a progress event, or a progress payload for the Step loop, and SHALL NOT change the worker lifecycle. Routing through `next.follow` SHALL NOT constitute progress reporting, and the coordinator-derived step list projection SHALL remain unstamped.

#### Scenario: no progress events from the machine
- **WHEN** an apply run advances its cursor
- **THEN** no progress event, `progress_plan`, or `step_pointer_map` is emitted for the Step loop

#### Scenario: routing is distinct from progress
- **WHEN** the coordinator fetches a routing file named by `next.follow`
- **THEN** that fetch is a routing act and produces no progress payload or milestone stamp

### Requirement: Degraded store never halts apply

When the machine store is unreachable or returns a malformed result, the coordinator SHALL NOT halt the run. It SHALL record the failure, load the routing instructions without the machine, derive the cursor inline from `implementation.md` by the same rule, and complete the run at full context cost. Only the context saving SHALL be lost.

#### Scenario: store failure falls back instead of halting
- **WHEN** the coordinator cannot reach the store or receives a malformed result
- **THEN** it records the failure, derives the cursor inline from `implementation.md`, and completes the run

### Requirement: Chained apply segments share one machine id and re-seed per segment

An apply segment running inside a larger composition SHALL address apply state under the single fixed machine id `apply-standalone@1` in that session's machine map, alongside any other machine live in the session. A segment SHALL NOT allocate a machine id of its own. Segment independence SHALL come from re-seeding: activating a segment re-seeds the machine from that segment's own `implementation.md`, replacing the previous segment's inventory, active Step, and completed set rather than inheriting them.

#### Scenario: chained segment re-seeds rather than inherits
- **WHEN** an apply segment activates in a session where a previous apply segment already ran
- **THEN** it re-seeds `apply-standalone@1` from its own `implementation.md`, and the previous segment's cursor does not carry over

#### Scenario: sibling machines are unaffected
- **WHEN** the apply segment emits to `apply-standalone@1`
- **THEN** other machines live in the same session under their own ids keep their state unchanged

