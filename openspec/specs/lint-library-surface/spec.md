# lint-library-surface Specification

## Purpose
TBD - created by archiving change commit-deterministic-extraction. Update Purpose after archive.

## Requirements

### Requirement: lint.js exports checkCommitRules function

The `sai/tools/lint.js` module SHALL export a `checkCommitRules(content, { allowAttribution = false } = {})` function that validates a commit message string and returns validation results.

#### Scenario: exported function accepts message content
- **WHEN** `const { checkCommitRules } = require('./sai/tools/lint.js')` is used in another module
- **THEN** `checkCommitRules(messageString)` is callable and accepts the commit message without requiring an options argument

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

The `checkCommitRules` function SHALL preserve existing one-string calls while accepting an optional options object. Only allowAttribution === true SHALL suppress AI-attribution violations; other checks SHALL remain active.

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

### Requirement: lint.js exports the AI attribution detector

The lint module SHALL export checkAiAttribution(content, file = 'text') as an in-process, read-only function returning an array of line-numbered violations or an empty array. checkCommitRules SHALL use it with file set to commit message unless its explicit boolean exception is enabled.

#### Scenario: Library caller uses the detector
- **WHEN** a module imports checkAiAttribution and validates a string with an AI credit on line 3
- **THEN** the returned violation names line 3 and AI_ATTRIBUTION without reading or writing a file.

#### Scenario: String true does not enable exception
- **WHEN** checkCommitRules receives allowAttribution: "true" and a recognized AI credit
- **THEN** it returns the AI-attribution violation.
