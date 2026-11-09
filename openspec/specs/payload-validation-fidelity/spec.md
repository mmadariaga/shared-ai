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

### Requirement: The validator admits two payload kinds

`worker-report-validator.js validate` SHALL admit exactly two `--kind` values, `terminal` (`completed`, `needs_input`, `failed`, `cancelled`) and `progress`, in both input-file and report-file mode. The `notice` and `conflict_detected` kinds and their validators SHALL be removed; a missing or other `--kind` value SHALL be a usage error with exit code 2. `bin/sai-state.js emit --progress` SHALL keep validating `progress` payloads.

#### Scenario: A retired kind is a usage error

- **WHEN** `validate` is called with `--kind notice` or `--kind conflict_detected`
- **THEN** it exits 2 with a usage error naming the admitted kinds `terminal` and `progress`

#### Scenario: Progress validation keeps working

- **WHEN** `sai-state emit --progress` receives a valid progress payload after the retired kinds are removed
- **THEN** it validates the payload and advances the machine as before

### Requirement: A completed report carries only command-admitted outcomes

The validator SHALL accept a `--command <name>` option and SHALL be the single source of the `outcome` values each command admits, in its `COMMAND_OUTCOMES` table, where `review` admits `no-changes` and every other command admits none. A terminal report SHALL be invalid when it carries an `outcome` and its status is not `completed`, the outcome is not a string, no `--command` was given, or the outcome is not among the values the named command admits. An unknown `--command` value SHALL be a usage error with exit code 2.

#### Scenario: An admitted outcome is accepted

- **WHEN** a `completed` report carries `outcome: no-changes` and is validated with `--command review`
- **THEN** the validator accepts it

#### Scenario: An outcome the command does not admit is rejected

- **WHEN** a `completed` report carries `outcome: no-changes` and is validated with `--command implement`
- **THEN** the validator rejects it with an error that `implement` admits no such outcome

#### Scenario: An outcome without a command is rejected

- **WHEN** a `completed` report carries an `outcome` and no `--command` is given
- **THEN** the validator rejects it, stating that the outcome needs the command that admits it
