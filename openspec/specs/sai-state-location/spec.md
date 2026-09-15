# sai-state-location Specification

## Purpose
TBD - created by archiving change shared-tool-resolution-rule. Update Purpose after archive.
## Requirements
### Requirement: Stage-machine CLI location

The system SHALL resolve `bin/sai-state.js` per the shared tool-resolution rule (first existing candidate per harness, copied verbatim, never composed from a root string, with the opencode XDG fallback only when neither verbatim candidate exists; first existing copy wins and defines the version) and SHALL invoke `node <tool-path> <verb>` with the verb's own arguments, taking neither `--json` nor `--cwd`. A missing CLI SHALL name the tried candidates and stop the coordinator per the step-machine contract, and a store failure SHALL stop `step_machine` coordinators.

#### Scenario: Run stage-machine verb

- **WHEN** a coordinator runs a `sai-state` verb
- **THEN** it uses the resolved CLI copy with the verb's own arguments

