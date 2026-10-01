# payload-validation-fidelity Specification

## Purpose
TBD - created by archiving change generalize-unattended-recovery. Update Purpose after archive.

## Requirements

### Requirement: Worker payloads are validated exactly as received

The command runner SHALL pass every worker payload to the validator exactly as received and SHALL NOT rewrite, re-serialize, or repair it first.

#### Scenario: A YAML payload is validated unchanged

- **WHEN** a worker returns a YAML payload
- **THEN** the runner passes that text to the validator without converting it to another format

### Requirement: A malformed payload is a failure under the resilience rule

In an unattended lane, a malformed worker payload SHALL be treated as a failure under the resilience rule, and the coordinator SHALL request a fresh result from the same worker. An invalid payload SHALL supply no accepted status, progress, or changed-files report, and the fresh result SHALL be validated exactly as received before the coordinator acts on it.

#### Scenario: The validator rejects a payload

- **WHEN** the validator rejects a payload returned in an unattended lane
- **THEN** the coordinator asks the same worker for a fresh result and does not repair the rejected payload itself

### Requirement: The validator accepts JSON or closed-subset YAML mappings

The worker-report validator SHALL parse a payload as JSON or as a closed subset of YAML (block mappings, block lists, flow lists and maps, block scalars, and quoted and plain scalars) through one shared `parsePayloadText`. It SHALL reject unsupported YAML constructs with a clear error and SHALL require the payload to be a mapping.

#### Scenario: A YAML mapping payload is accepted for validation

- **WHEN** the validator receives a payload written as a YAML mapping
- **THEN** it parses the payload and validates it with the same rules as a JSON payload

#### Scenario: An unsupported YAML construct is rejected

- **WHEN** the payload uses an unsupported YAML construct such as an anchor or alias
- **THEN** the validator reports a clear parse error and the payload is invalid

### Requirement: Progress emit uses the same payload parser

`bin/sai-state.js emit --progress` SHALL parse its progress payload with the validator's shared `parsePayloadText`, so a progress payload is read the same way whether it arrives as JSON or as YAML.

#### Scenario: A YAML progress payload is emitted

- **WHEN** `emit --progress` receives a `step_machine` progress payload written as YAML
- **THEN** it validates the payload and advances the machine in one call
