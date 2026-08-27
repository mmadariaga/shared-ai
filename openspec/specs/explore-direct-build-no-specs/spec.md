# explore-direct-build-no-specs Specification

## Purpose
TBD

## Requirements

### Requirement: Direct Build no-specs profile runs only viability steps

The Direct Build `--no-specs` profile SHALL be available only for the explicitly selected viability POC route. It SHALL run only the implementer and functional fix-loop steps, corresponding to Steps 1 and 2 of the ordinary eight-step Direct Build flow. It SHALL return a viable or not-viable verdict to the uncertainty-pause machinery.

The profile SHALL not run backfill, spec review, ADR/DDR processing, artifact archive, or any other Steps 3–8 behavior. It SHALL not create or modify anything under `openspec/`, create planning artifacts, or run mutating Git commands. Dirty implementation code is acceptable, and minimal tests or human review provide the verdict authority.

#### Scenario: no-specs runs the implementer and fix loop

- **WHEN** the user selects `Yes, create a POC before continuing`
- **THEN** Direct Build runs only the implementer and functional fix loop and returns the resulting verdict to the uncertainty pause

#### Scenario: no-specs skips artifact and archive work

- **WHEN** the Direct Build `--no-specs` profile is active
- **THEN** it dispatches no backfill or archive worker and performs no OpenSpec artifact, spec, or archive operation

#### Scenario: no-specs preserves the OpenSpec boundary

- **WHEN** the implementer-only POC executes
- **THEN** it writes only the authorized code, tests, or required project configuration outside `openspec/` and runs no mutating Git command

#### Scenario: POC changes are returned for verdict assessment

- **WHEN** the no-specs implementer and fix loop complete
- **THEN** their first-seen `changed_files` union is returned to the uncertainty pause and no mandatory automatic deletion occurs
