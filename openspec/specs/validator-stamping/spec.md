# validator-stamping Specification

## Purpose
TBD - created by archiving change replace-emitted-on-with-validated-at. Update Purpose after archive.

## Requirements

### Requirement: Verdicts are timeless
`validateText(text, kind)` in `sai/tools/worker-report-validator.js` SHALL be a pure function that returns exactly `{ok, action, kind, errors}` for valid and invalid results of every kind, with no time field. The payload SHALL never be rewritten, and exit codes and `ok`/`errors` semantics SHALL be unchanged.

#### Scenario: A valid payload yields a timeless verdict
- **WHEN** `validateText` validates a valid payload of kind terminal, notice, progress or conflict_detected
- **THEN** it returns `{ok: true, action: "validate", kind, errors: []}` with no `received_at` or `validated_at` field

#### Scenario: An invalid payload yields a timeless verdict
- **WHEN** `validateText` validates an invalid payload
- **THEN** it returns `ok: false` with `errors` and no time field

### Requirement: The validate response carries received_at as its first key
`worker-report-validator.js validate --json` SHALL read the time once per invocation and write `{received_at, ok, action, kind, errors}` with `received_at` as the first key, for valid and invalid verdicts and for all four kinds. In text mode the valid line SHALL read `valid (<kind>) received_at <ts>` and the invalid line SHALL be unchanged and carry no time. Usage errors, IO errors and exceptions SHALL go to stderr with exit 2 and carry no time. `validated_at` SHALL NOT appear anywhere, with no alias and no dual emission.

#### Scenario: JSON response puts received_at first
- **WHEN** a payload of any kind, valid or invalid, is piped to `validate --kind <kind> --json`
- **THEN** the stdout object's first key is `received_at` followed by `ok`, `action`, `kind` and `errors`, and the exit code is unchanged

#### Scenario: Text mode keeps the invalid line unchanged
- **WHEN** a valid payload is validated in text mode
- **THEN** the line reads `valid (<kind>) received_at <ts>`, while an invalid payload still prints `invalid (<kind>): <errors>` with no time

### Requirement: One exported generator is the single clock of both CLIs
The validator module SHALL export `generateReceivedAt` as the only time source for `worker-report-validator.js` and `bin/sai-state.js`. It SHALL return local wall-clock time with its numeric UTC offset in `YYYY-MM-DDTHH:MM:SS±HH:MM` form, never the `Z` designator (a machine on UTC writes `+00:00`).

#### Scenario: The generator format is stable
- **WHEN** `generateReceivedAt()` is called
- **THEN** the value matches `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$`
