# explore-direct-build-no-specs Specification

## Purpose
TBD

## Requirements

### Requirement: Direct Build no-specs profile runs only viability steps

The Direct Build `--no-specs` profile SHALL be dispatched only from inside the POC lane, the conditional stage between `Explore change` and `Review edge cases`. It SHALL run only the implementer and functional fix loop (Steps 1 and 2) and SHALL return to the lane, which forms the verdict naming the winning agreed candidate or none. It SHALL NOT run backfill, spec review, ADR or DDR processing, artifact archive, or other Steps 3 through 8 behavior. It SHALL NOT create or modify anything under `openspec/`, create planning artifacts, or run mutating Git commands. The POC SHALL be a direct worker dispatch that emits nothing to `explore-slice@1` and bypasses the slice machine entirely, so the NO_PENDING_SLICE rejection SHALL NOT apply to it. Dirty implementation code is acceptable, and minimal tests or human observation provide the verdict authority. The implementer's `changed_files` union SHALL be returned to the lane for verdict assessment.

The profile SHALL be pinned: it SHALL NOT be offered by the crystallization-close route selector, SHALL NOT be reachable as the Plan or the Manual route, and SHALL NOT be altered by `--fast-track`, which SHALL neither add back a skipped step, nor remove one of Steps 1 and 2, nor auto-approve any of the lane's three stops. The POC's writes SHALL be confined to the lane's reversible isolation and SHALL be discarded when that isolation is abandoned.

#### Scenario: no-specs runs the implementer and fix loop

- **WHEN** the user accepts the go/no-go and the agreed candidate list is recorded
- **THEN** Direct Build runs only the implementer and functional fix loop and returns its result to the POC lane

#### Scenario: no-specs skips artifact and archive work

- **WHEN** the Direct Build `--no-specs` profile is active
- **THEN** it dispatches no backfill or archive worker and performs no OpenSpec artifact, spec, or archive operation

#### Scenario: no-specs preserves the OpenSpec boundary

- **WHEN** the implementer-only POC executes
- **THEN** it writes only the authorized code, tests, or required project configuration outside `openspec/` and runs no mutating Git command

#### Scenario: POC changes are returned for verdict assessment

- **WHEN** the no-specs implementer and fix loop complete
- **THEN** their first-seen `changed_files` union is returned to the POC lane, which forms the `<Cn> wins` or `none` verdict

#### Scenario: POC bypasses the slice machine

- **WHEN** the POC lane dispatches the `--no-specs` POC
- **THEN** the POC runs implementer plus fix loop only, with no slice-machine emit, no openspec writes, and no archive

#### Scenario: the profile is never a route option

- **WHEN** the crystallization-close route selector is presented
- **THEN** it offers exactly its three routes and never offers the `--no-specs` profile as Plan, as Manual, or as a fourth option

#### Scenario: fast-track cannot alter the profile

- **WHEN** `--fast-track` is active while the POC lane dispatches the profile
- **THEN** Steps 1 and 2 run unchanged, no skipped step returns, and none of the lane's three stops is auto-approved
