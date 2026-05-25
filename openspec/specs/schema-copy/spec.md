## ADDED Requirements

### Requirement: template-copy
As the final setup step, `bin/setup.js` SHALL copy all files from `{package}/openspec/schemas/sai-workflow/` to `{project}/openspec/schemas/sai-workflow/`, always overwriting existing files.

`{package}` MUST be resolved as the directory containing `bin/setup.js` (i.e., `path.join(__dirname, '..')`) — not `process.cwd()`.

#### Scenario: copy success
- **WHEN** all files are copied successfully
- **THEN** `{project}/openspec/schemas/sai-workflow/` contains an up-to-date copy of every file from the package source; prints a confirmation listing the number of files copied

#### Scenario: destination dir creation
- **WHEN** `{project}/openspec/schemas/sai-workflow/` does not yet exist
- **THEN** it is created (recursively) before copying begins

#### Scenario: always overwrite
- **WHEN** a file already exists at the destination
- **THEN** it is overwritten without prompting

### Requirement: copy-scope
Only files directly inside `{package}/openspec/schemas/sai-workflow/` SHALL be copied. Subdirectories MUST be copied recursively. No files outside that directory SHALL be touched.

#### Scenario: recursive copy
- **WHEN** the source directory contains subdirectories
- **THEN** the full subtree is mirrored at the destination

#### Scenario: scope boundary
- **WHEN** copy completes
- **THEN** no files outside `{project}/openspec/schemas/sai-workflow/` have been created or modified by this step

## MODIFIED Requirements

## REMOVED Requirements
