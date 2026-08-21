# single-string-invocation-envelope Specification

## Purpose

Define the canonical two-key wrapper envelope and one-string worker dispatch used by the active SAI surfaces.

## Requirements

### Requirement: canonical wrapper envelope has one argument field

Every supported Claude Code and opencode wrapper SHALL retain its `command_name` card-selection field and SHALL carry the complete invocation request only in `arguments_value`. Its standalone `InvocationEnvelope:` block SHALL contain exactly those two keys, in that order, with `$ARGUMENTS` substituted only into `arguments_value`. No retired duplicate transport field SHALL appear in any active wrapper, adapter, or card envelope.

#### Scenario: both harnesses use the same two-key wrapper shape

- **WHEN** a routed or utility wrapper is read
- **THEN** its envelope contains `command_name` followed by `arguments_value`
- **AND** it contains no retired duplicate field, labelled argument line, or trailing envelope content

#### Scenario: empty arguments remain meaningful

- **WHEN** a wrapper is invoked without arguments
- **THEN** it forwards an empty `arguments_value` and the selected card may enter its existing picker or prompt path

### Requirement: worker dispatch carries one opaque argument string

Routed coordinators and apply Step-execution coordinators SHALL dispatch exactly the remaining `arguments_value` string through their active worker binding. Binding templates, same-worker continuations, and replacement reconstruction SHALL not add, reconstruct, or infer another request field. The worker retains ownership of parsing phase-specific flags and request grammar.

#### Scenario: initial and replacement dispatches preserve the argument

- **WHEN** a routed coordinator dispatches or reconstructs a worker
- **THEN** the worker receives the original complete `arguments_value` plus only the contract-defined reconstruction fields
- **AND** no additional request field or transcript-derived argument is supplied

#### Scenario: continuations remain answer-only

- **WHEN** a worker returns a nonterminal or input result
- **THEN** same-worker continuation forwards only the existing acknowledgement or selected answer
- **AND** it does not recreate an invocation envelope with an additional request field

### Requirement: semantics remain argument-owned

Boot adapters SHALL use `command_name` only for card selection and SHALL forward `arguments_value` byte-for-byte without parsing or cleaning it. Existing change-picker fallback behavior, command-local `--fast-track` parsing, supervised marker grammar, lifecycle payloads, progress plans, and terminal navigation SHALL remain unchanged except for the removed transport field. Progress ownership remains coordinator-owned invocation state and is never transported through the worker request.

#### Scenario: supervised requests remain inside arguments

- **WHEN** Explore dispatches a supervised spec or design worker
- **THEN** the marker and crystallized request remain in `arguments_value`
- **AND** no third envelope field is introduced

#### Scenario: progress state is not transported

- **WHEN** a phase adapter declares a progress plan
- **THEN** the plan remains coordinator-owned invocation state
- **AND** the worker request remains limited to `arguments_value`

### Requirement: active contract surfaces converge

Active instructions, policies, specifications, installer projections, and structural tests SHALL describe and enforce the two-key wrapper envelope and one-string worker dispatch. Historical ADRs and archived change artifacts SHALL remain byte-for-byte immutable and SHALL be referenced only as migration context.

#### Scenario: stale field assertions are removed

- **WHEN** the active contract and projection checks are run
- **THEN** they reject reintroduction of the retired duplicate transport field into the active envelope
- **AND** they continue to verify Claude Code and opencode parity
