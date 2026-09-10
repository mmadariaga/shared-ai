# archive-content-recovery Specification

## Purpose
TBD - created by archiving change fix-backfill-delta-headers. Update Purpose after archive.
## Requirements
### Requirement: Archive classifies failures before any reroute
The archive coordinator SHALL classify every CLI archive failure before any other action, using an initialized single-attempt flag. A content failure with a cited header qualifies only when the error carries a delta-content signal naming a spec-update failure, an already-existing requirement, or a missing or unknown requirement, AND cites at least one concrete Requirement header. Every other failure, including archive-directory collision, empty index, infrastructure errors, invalid JSON, any failure on a skip-specs run, or a content signal with no cited header, SHALL never reroute to backfill and SHALL be reported with the exact error and no manual fallback, staging, retry, or commit.

#### Scenario: Cited content failure qualifies for the fix path
- **WHEN** archive fails with a spec-update signal and cites a concrete Requirement header on a first attempt
- **THEN** the coordinator takes the single classified fix path

#### Scenario: Collision never reroutes
- **WHEN** archive fails with an archive-directory collision
- **THEN** the coordinator reports the exact error and stops without reroute, retry, or commit

### Requirement: Same-worker bounded header-only fix on classified content failure
On a qualifying first content failure the coordinator SHALL dispatch exactly one backfill worker with a fix envelope carrying the verbatim CLI error plus the cited headers. The worker SHALL reclassify only the cited requirements per the per-requirement existence rule, moving each complete requirement block with its scenarios between the delta sections of the same capability file, removing a delta section header left empty by the move, and SHALL never invent, delete, or reword a requirement. Requirements outside the cited set SHALL stay byte-identical, and the worker SHALL return corrected spec content without writing any file.

#### Scenario: Narrow header move fixes the cited requirement
- **WHEN** the fix worker receives a cited header that belongs under a different delta section
- **THEN** the worker moves that complete requirement block with scenarios and returns the corrected content without file writes

### Requirement: Fixed specs revalidated and archive retried exactly once
The coordinator SHALL validate returned fix content against the delta format, verify it by staging the corrected specs to OS-temp and running the deterministic header script exactly like the backfill preflight, write the corrected specs only on pass, and retry the CLI archive exactly once. Any second failure from the retry, the validation, or the fix continuation itself SHALL stop with the literal error and no further retry, and the coordinator SHALL never replace the worker and never send a second fix.

#### Scenario: Verified fix retries archive once
- **WHEN** corrected specs pass format validation and the header preflight
- **THEN** the coordinator writes them and retries the archive CLI exactly once

#### Scenario: Retry budget exhausted stops without further retry
- **WHEN** the single archive retry or its fix validation fails again
- **THEN** the coordinator stops with the literal error and sends no further fix

### Requirement: Late races and one-shot safety preserved

A main-spec race after a passing preflight SHALL go through the classified resilience path with no tight revalidate loop. The Direct Build execute continuation SHALL keep the classified content-fix loop ordinary-route only and SHALL route backfill-artifact errors to same-worker backfill correction with archive relaunch instead of single-use close.

#### Scenario: Post-preflight race uses the resilience path

- **WHEN** the main spec changes after a passing preflight so archive later fails on content
- **THEN** the run SHALL resolve through the single classified fix path without a revalidate loop

#### Scenario: Direct Build backfill-artifact error uses backfill correction

- **WHEN** a Direct Build archive failure is evaluated as a backfill-artifact error
- **THEN** the run SHALL route the verbatim error to same-worker backfill correction with archive relaunch and keep the classified loop ordinary-route only

