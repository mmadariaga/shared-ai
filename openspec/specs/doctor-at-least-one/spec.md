# doctor-at-least-one Specification

## Purpose
TBD - created by archiving change dual-subagent-depth-v1-v2. Update Purpose after archive.
## Requirements
### Requirement: Doctor validates depth with at-least-one present and minimum 2
Doctor SHALL validate the winning config file read-only without creating, modifying, or deleting any file, requiring at least one of top-level `subagent_depth` or `experimental.subagent_depth` present with a numeric value at least 2. Any present value below 2, any non-numeric or wrong-type value, a non-object `experimental` container, or both keys missing SHALL produce an error, while unreadable, unparsable, non-object-root, or missing-parser states SHALL warn or skip without content validation.
#### Scenario: Single valid key passes
- **WHEN** doctor checks a winning file with only top-level 2 or only experimental 2 present and valid
- **THEN** the depth check passes with ok severity
#### Scenario: Both valid including divergent passes
- **WHEN** doctor checks a winning file with both keys present and each at least 2 including divergent values
- **THEN** the depth check passes with ok severity
#### Scenario: Missing keys errors
- **WHEN** doctor checks a winning file with neither depth key present
- **THEN** the depth check errors requesting re-run of the installer to backfill at 2
#### Scenario: Below-minimum or wrong-type errors even when other key valid
- **WHEN** doctor checks a winning file with any present depth below 2 or non-numeric or with a non-object experimental container
- **THEN** the depth check errors naming the invalid key and its minimum-2 expectation
#### Scenario: Unreadable or unparsable warns read-only without validation
- **WHEN** doctor cannot read the winning file or cannot parse it as a JSONC object or the parser is unavailable
- **THEN** the depth check warns or skips without content validation and writes nothing

