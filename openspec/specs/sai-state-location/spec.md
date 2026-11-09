# sai-state-location Specification

## Purpose
TBD - created by archiving change shared-tool-resolution-rule. Update Purpose after archive.

## Requirements

### Requirement: Stage-machine CLI location

The system SHALL resolve the installed `bin/sai-state.js` copy per the shared tool-resolution rule (the fetch tool in path mode with the subpath `sai/bin/sai-state.js`, never a bare `bin/...` subpath and never a path composed from a root string; the first copy it returns wins and defines the version) and SHALL invoke `node <tool-path> <verb>` with the verb's own arguments, taking neither `--json` nor `--cwd`. A missing CLI SHALL name the paths the fetch tool tried and stop the coordinator per the step-machine contract, and a store failure SHALL stop `step_machine` coordinators.

#### Scenario: Run stage-machine verb

- **WHEN** a coordinator runs a `sai-state` verb
- **THEN** it uses the resolved CLI copy with the verb's own arguments
