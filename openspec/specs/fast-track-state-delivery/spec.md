# fast-track-state-delivery Specification

## Purpose
TBD - created by archiving change coordinator-owned-fast-track-gates. Update Purpose after archive.

## Requirements

### Requirement: Coordinators Deliver an Explicit Fast-Track Boolean Separate From the Envelope

The implementation and apply coordinators SHALL declare `fast_track_active` as an explicit true or false alongside the envelope (never as an envelope key and never written to any file), SHALL deliver the boolean in the post-ready task disclosure and again in replacement reconstruction including supervisor-injected build state, and SHALL never send the raw `--fast-track` token to the worker.

#### Scenario: Worker receives an explicit boolean after ready

- **WHEN** the implementation worker returns `event: ready` on a build or standalone run
- **THEN** the coordinator discloses the task with the explicit fast-track boolean separate from `arguments_value` and repeats it on replacement reconstruction

### Requirement: Workers Preserve Fast-Track State Across Continuations for Defined Branches

The implementation worker SHALL keep the delivered boolean across progress, input, and recovery continuations and SHALL honor it only for its other defined fast-track branches, never inferring bounded lookup authorization from it.

#### Scenario: Continuation retains state without widening authorization

- **WHEN** the worker continues after progress or input with fast-track state delivered
- **THEN** the worker retains the boolean for its defined branches while lookup approval still awaits the coordinator's explicit typed decisions

### Requirement: Standalone Absence Sets an Explicit False Signal

The apply standalone fast-track parse SHALL set the fast-track session signal explicitly false when the token is absent and use `arguments_value` verbatim, as the sole authority detecting and removing `--fast-track` on that path.

#### Scenario: Ordinary apply records explicit inactive state

- **WHEN** standalone apply is invoked without `--fast-track`
- **THEN** the invocation sets the signal explicitly false so later commit activation and branch behavior read a known state
