# relative-report-references Specification

## Purpose
TBD - created by archiving change detect-silent-workers. Update Purpose after archive.

## Requirements

### Requirement: Report references SHALL accept a path relative to the report directory

`sai/tools/transfer.js accept` (with or without `--check`) and `sai/tools/worker-report-validator.js validate --report-dir --report-file --report-hash` SHALL resolve a relative report path against the report directory before their checks. The containment and sha256 checks MUST be the same as for an absolute path, so a relative path that escapes the report directory MUST be refused. An absolute path MUST be used unchanged.

#### Scenario: Relative path is accepted
- **WHEN** `transfer.js accept` runs with `--dir <report-dir>` and `--path report.json` naming a report file inside that directory with its correct sha256
- **THEN** the reference resolves to `<report-dir>/report.json`, is verified, and is recorded in the ledger under its absolute path

#### Scenario: Relative report file validates
- **WHEN** the validator runs with `--report-dir <report-dir>` and a relative `--report-file` naming a valid report inside that directory with its correct hash
- **THEN** the validator reads the resolved file once and returns `outcome: accepted`

#### Scenario: Escaping path is refused
- **WHEN** a relative report path such as `../other/report.json` resolves outside the report directory
- **THEN** `accept` fails and the validator returns `outcome: delivery-failed`, and nothing is recorded

#### Scenario: Wrong hash is refused
- **WHEN** a relative report path names a file inside the report directory but the given sha256 does not match its bytes
- **THEN** the reference is refused exactly as an absolute path with the same mismatch would be
