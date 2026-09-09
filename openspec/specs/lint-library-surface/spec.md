# lint-library-surface Specification

## Purpose
TBD - created by archiving change commit-deterministic-extraction. Update Purpose after archive.
## Requirements
### Requirement: lint.js exports checkCommitRules function

The `sai/tools/lint.js` module SHALL export a `checkCommitRules(content)` function that validates a commit message string and returns validation results.

#### Scenario: exported function accepts message content
- **WHEN** `const { checkCommitRules } = require('./sai/tools/lint.js')` is used in another module
- **THEN** `checkCommitRules(messageString)` is callable and accepts the commit message as its only parameter

#### Scenario: function returns violations array
- **WHEN** a commit message violates commit rules
- **THEN** `checkCommitRules` returns an array of violation objects, each with `file` (always "commit message"), `line` (line number where violation occurs), `problem` (violation code like "SUBJECT_TOO_LONG"), and `detail` (human-readable description of the violation)

#### Scenario: function returns empty array on success
- **WHEN** a commit message passes all validation rules
- **THEN** `checkCommitRules` returns an empty array `[]`

#### Scenario: function takes a string, not a file path
- **WHEN** `checkCommitRules(messageContent)` is called with a string
- **THEN** no file read or I/O operation occurs; validation runs in-process on the string directly

### Requirement: lint.js signature is unchanged

The `checkCommitRules(content)` function signature SHALL NOT change; it already accepted a string parameter before export.

#### Scenario: no signature migration required
- **WHEN** the lint function is exported
- **THEN** callers importing it need no wrapper or translation; the existing signature works as-is

### Requirement: apply imports lint for in-process validation

The `sai/tools/commit.js apply` subcommand SHALL import and call `checkCommitRules` directly, never spawning lint as a separate process.

#### Scenario: apply uses lint as a library
- **WHEN** apply validates a commit message
- **THEN** it imports the lint module and calls the function directly, with no subprocess spawning

### Requirement: lint.js exports are configured in module.exports

The exported functions SHALL be declared in `module.exports` so they are accessible to require().

#### Scenario: imports can access exported functions
- **WHEN** a module `require('./sai/tools/lint.js')`
- **THEN** exported functions are accessible via destructuring or property access

