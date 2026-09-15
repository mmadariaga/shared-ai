# explore-direct-build-no-specs Specification

## Purpose
TBD
## Requirements
### Requirement: Direct Build no-specs profile runs only viability steps

The Direct Build --no-specs profile SHALL be available only for the explicitly selected viability POC route. It SHALL run only the implementer and functional fix loop and SHALL return a viable or not-viable verdict to the uncertainty pause. It SHALL NOT run backfill, spec review, ADR or DDR processing, artifact archive, or other Steps 3 through 8 behavior. It SHALL NOT create or modify anything under openspec, create planning artifacts, or run mutating Git commands. The POC SHALL be a direct worker dispatch that emits nothing to explore-slice@1 and bypasses the slice machine entirely, so the NO_PENDING_SLICE rejection SHALL NOT apply to it. Dirty implementation code is acceptable, and minimal tests or human review provide the verdict authority.

#### Scenario: no-specs runs the implementer and fix loop

- **WHEN** the user selects Yes, create a POC before continuing
- **THEN** Direct Build runs only the implementer and functional fix loop and returns the resulting verdict to the uncertainty pause

#### Scenario: no-specs skips artifact and archive work

- **WHEN** the Direct Build --no-specs profile is active
- **THEN** it dispatches no backfill or archive worker and performs no OpenSpec artifact, spec, or archive operation

#### Scenario: no-specs preserves the OpenSpec boundary

- **WHEN** the implementer-only POC executes
- **THEN** it writes only the authorized code, tests, or required project configuration outside openspec and runs no mutating Git command

#### Scenario: POC changes are returned for verdict assessment

- **WHEN** the no-specs implementer and fix loop complete
- **THEN** their first-seen changed_files union is returned to the uncertainty pause and no mandatory automatic deletion occurs

#### Scenario: POC bypasses the slice machine

- **WHEN** the uncertainty pause dispatches the --no-specs viability POC
- **THEN** the POC runs implementer plus fix loop only with no slice-machine emit and no openspec writes and no archive

