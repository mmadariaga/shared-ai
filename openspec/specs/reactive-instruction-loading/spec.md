# reactive-instruction-loading Specification

## Purpose
TBD - created by archiving change spec-standalone-state-machine. Update Purpose after archive.
## Requirements
### Requirement: Per-state follow mapping

The machine SHALL map `prereqs-and-change` to `follow: none` with a no-fetch hint, each of `research`, `proposal`, `specs`, `validation`, `review` to its step file under the spec steps directory, and `done` to `follow: none` with an all-complete hint. Next SHALL stay pointer-only with no state or snapshot fields.

#### Scenario: Startup and done carry follow none

- **WHEN** the caller projects the initial state and the terminal done stage
- **THEN** both carry follow none with the no-fetch and all-complete hints respectively

### Requirement: Standalone-only per-event consult with byte-identical wire

Standalone runs SHALL consult the sidecar per progress event and wrap next follow in the unchanged two-line continuation with the step id and path, and with every step marked emit the exact Active step none literal. The shared command-runner contract SHALL stay untouched. The supervised adapter SHALL keep its routing-only map and SHALL never consult this machine. No shared sessions or state SHALL exist.

#### Scenario: Happy-path walk ends with the none literal

- **WHEN** the caller marks the six steps in order through the sidecar
- **THEN** each step points at its successor file and marking review returns done with follow none

### Requirement: No-whitelist follow-load with stop-on-failure

After each emit the coordinator SHALL fetch whatever next follow names with no file whitelist. A machine-named unknown file or a path outside the steps directory SHALL stop with an error and fetch nothing. A follow-load failure or emit failure SHALL stop, show the error, and wait with nothing guessed and never routed through Bounded Recovery.

#### Scenario: Unknown follow target stops without fetching

- **WHEN** the machine names an unknown file or a path outside the steps directory
- **THEN** the run stops with an error and no file is fetched

### Requirement: Loaded-set skip with hint wording

An already-loaded follow path SHALL not be re-fetched. The hint SHALL carry the loaded-set skip wording so the coordinator skips fetching when the path is already loaded.

#### Scenario: Already-loaded path is skipped

- **WHEN** the next follow path is already in the chat loaded set
- **THEN** the coordinator skips the re-fetch per the hint wording

### Requirement: Session lifecycle with parked machine and clean close

Every standalone run SHALL open a fresh sidecar session and SHALL never reuse prior marks. Needs input, failed, and cancelled outcomes SHALL park the machine with no pointer on feedback and recovery continuations until the next progress event. The session SHALL close when the run closes with no machine auto-retry. The initial dispatch SHALL bear no Active step line with the first delivered pointer targeting research.

#### Scenario: Parked machine holds pointer across feedback

- **WHEN** the caller emits an empty signal while parked at research
- **THEN** the state and pointer stay unchanged with no rejection

