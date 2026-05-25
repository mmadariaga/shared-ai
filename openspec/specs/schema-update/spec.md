## ADDED Requirements

### Requirement: config-read
After `openspec-init-guard` passes, `bin/setup.js` SHALL read `{projectPath}/openspec/config.yaml` as a UTF-8 text file.

#### Scenario: config exists
- **WHEN** `{projectPath}/openspec/config.yaml` exists
- **THEN** its contents are read into memory for inspection

#### Scenario: config missing
- **WHEN** `{projectPath}/openspec/config.yaml` does not exist
- **THEN** prints to stderr: `"openspec/config.yaml not found. Run 'openspec init' first."` and exits with code 1

### Requirement: schema-line-check
`bin/setup.js` SHALL check whether `{projectPath}/openspec/config.yaml` contains a line matching the pattern `^schema:\s*sai-workflow\s*$` (case-sensitive).

#### Scenario: schema already correct
- **WHEN** the file contains `schema: sai-workflow` on its own line
- **THEN** no modification is made; setup continues to `schema-copy`

#### Scenario: schema wrong or absent, user authorizes patch
- **WHEN** the schema line is missing or has a different value, and the user confirms `"Set schema: sai-workflow in openspec/config.yaml? (Y/n)"` with `Y`/Enter
- **THEN** the file is patched: the existing `schema:` line is replaced with `schema: sai-workflow`, or the line is prepended to the file if absent; the rest of the file is preserved verbatim

#### Scenario: schema wrong or absent, user declines
- **WHEN** the schema line is missing or has a different value and the user inputs `n`/`N`
- **THEN** prints `"Aborted."` and exits 0

### Requirement: minimal-patch
The patch operation SHALL only modify the `schema:` line. All other lines in `config.yaml` MUST be preserved verbatim (no reformatting, no whitespace normalization).

#### Scenario: patch scope
- **WHEN** the config file is patched
- **THEN** a diff of the file before and after shows only the `schema:` line changed

## MODIFIED Requirements

## REMOVED Requirements
