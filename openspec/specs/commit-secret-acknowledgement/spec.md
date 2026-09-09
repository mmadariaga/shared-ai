# commit-secret-acknowledgement Specification

## Purpose
TBD - created by archiving change commit-deterministic-extraction. Update Purpose after archive.
## Requirements
### Requirement: sensitive-file acknowledgement via exact file list

When `apply` detects sensitive-looking files and blocks, the coordinator SHALL present the exact list to the user for confirmation, then re-invoke `apply` with `--acknowledge-secrets <comma-separated-list>` carrying the exact detected filenames.

#### Scenario: coordinator presents detected files to user
- **WHEN** apply returns `{"success": false, "detected_sensitive_files": [...]}` with exit code 1
- **THEN** the coordinator presents the exact list to the user and asks for confirmation before proceeding

#### Scenario: re-invocation with exact list proceeds past block
- **WHEN** the user confirms and the coordinator re-invokes apply with `--acknowledge-secrets file1.env,file2.key` matching the exact detected list
- **THEN** apply skips the sensitive-file block, validates the message, and commits on success

#### Scenario: mismatched list is refused
- **WHEN** `--acknowledge-secrets` contains a file not detected or omits a detected file
- **THEN** apply exits with code 1 and refuses the commit with a mismatch error

### Requirement: acknowledgement is exact and auditable

The `--acknowledge-secrets` list SHALL name exact file paths (no patterns or wildcards) and match the detected list precisely.

#### Scenario: acknowledgement path must be exact
- **WHEN** detected files are `[".env", ".env.local"]`
- **THEN** any acknowledgement list that is not exactly `--acknowledge-secrets .env,.env.local` is rejected

#### Scenario: the named files are the only override path
- **WHEN** a staged file triggers sensitive-file detection
- **THEN** the only way to proceed is explicit `--acknowledge-secrets` with the exact detected filenames; no blanket approval flag exists

### Requirement: staged set changes reset the acknowledgement

When the staged set changes between detection and acknowledgement, the previously acknowledged list SHALL no longer be valid.

#### Scenario: staged changes invalidate prior acknowledgement
- **WHEN** a user stages additional sensitive files after the first apply call detected a set
- **THEN** the coordinator must call collect again; the new detection includes additional files and prior acknowledgement is not valid for the new set

