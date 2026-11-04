# doctor-at-least-one Specification

## Purpose
TBD - created by archiving change dual-subagent-depth-v1-v2. Update Purpose after archive.

## Requirements

### Requirement: Doctor validates experimental.subagent_depth with minimum 2
Doctor SHALL validate the winning config file read-only without creating, modifying, or deleting any file, requiring `experimental.subagent_depth` present with a numeric value at least 2. A top-level `subagent_depth` SHALL be ignored: it SHALL neither satisfy nor fail the check. A missing `experimental.subagent_depth`, a value below 2, a non-numeric or wrong-type value, or a non-object `experimental` container SHALL produce an error, while unreadable, unparsable, non-object-root, or missing-parser states SHALL warn or skip without content validation.

#### Scenario: Valid experimental depth passes
- **WHEN** doctor checks a winning file whose `experimental.subagent_depth` is 2 or higher
- **THEN** the depth check passes with ok severity

#### Scenario: Top-level depth does not affect a valid experimental depth
- **WHEN** doctor checks a winning file with `experimental.subagent_depth` at least 2 and a top-level `subagent_depth` of any value, including below 2
- **THEN** the depth check passes with ok severity

#### Scenario: Missing experimental depth errors even with a valid top-level key
- **WHEN** doctor checks a winning file with no `experimental.subagent_depth` and a top-level `subagent_depth` of at least 2
- **THEN** the depth check errors stating that opencode v2 does not read a top-level `subagent_depth` and requesting re-run of the installer to backfill `experimental.subagent_depth` at 2

#### Scenario: Below-minimum or wrong-type experimental depth errors
- **WHEN** doctor checks a winning file whose `experimental.subagent_depth` is below 2 or non-numeric, or whose `experimental` container is not an object
- **THEN** the depth check errors naming the invalid key and its minimum-2 expectation

#### Scenario: Unreadable or unparsable warns read-only without validation
- **WHEN** doctor cannot read the winning file or cannot parse it as a JSONC object or the parser is unavailable
- **THEN** the depth check warns or skips without content validation and writes nothing
