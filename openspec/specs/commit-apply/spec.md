# commit-apply Specification

## Purpose
TBD - created by archiving change commit-deterministic-extraction. Update Purpose after archive.
## Requirements
### Requirement: apply subcommand validates and executes commits

The `sai/tools/commit.js apply` subcommand SHALL read a commit message from stdin, validate it against commit-message rules, block on detected sensitive files, and execute `git commit` with the validated message.

#### Scenario: apply validates and commits a message
- **WHEN** `node sai/tools/commit.js apply --json --cwd <repo>` is invoked with a valid message on stdin
- **THEN** it exits with code 0, returns JSON with `{"success": true, "message": "<git-output>"}` where message contains git's commit output, and the commit exists in git history

#### Scenario: apply blocks on validation failure
- **WHEN** a commit message violates rules (subject too long, invalid format, etc.)
- **THEN** apply exits with code 1, returns `{"success": false, "violations": [...]}` where each violation is an object with `file`, `line`, `problem` and `detail` fields, and executes no commit

#### Scenario: apply blocks on detected sensitive files
- **WHEN** staged files match sensitive patterns (`.env`, `*credentials*`, etc.) and `--acknowledge-secrets` is not provided
- **THEN** apply exits with code 1, returns `{"success": false, "detected_sensitive_files": [...]}` with exact file paths, and executes no commit

#### Scenario: apply accepts acknowledged sensitive files
- **WHEN** `node sai/tools/commit.js apply --acknowledge-secrets file1.env,file2.key --json --cwd <repo>` is called with the exact list matching detected files
- **THEN** apply proceeds past the sensitive-file block, validates the message, and commits on success

#### Scenario: apply refuses mismatched acknowledgement
- **WHEN** `--acknowledge-secrets` list differs from detected files (missing one or containing one not detected)
- **THEN** apply exits with code 1, returns the mismatch error, and executes no commit

### Requirement: apply reads message from stdin

The commit message SHALL be passed to `apply` over stdin using a heredoc, never through a temporary file or command-line argument.

#### Scenario: apply consumes stdin message
- **WHEN** `node sai/tools/commit.js apply --json --cwd <repo> <<'EOF' {message} EOF` is called
- **THEN** the message is read from stdin, validated, and used for the commit

#### Scenario: stdin message is not written to a temporary file
- **WHEN** apply executes
- **THEN** no temporary message file is created and no orphaned file exists on failure

### Requirement: apply validates by importing lint functions

The `apply` subcommand SHALL import `checkCommitRules` from `sai/tools/lint.js` and call it to validate the message, never spawning a separate process.

#### Scenario: validation runs in-process
- **WHEN** `node sai/tools/commit.js apply` validates a message
- **THEN** it imports and calls the lint function directly, with no spawned subprocess and no shell invocation of the linter

### Requirement: apply is stateless and returns violations on every call

The `apply` subcommand SHALL not keep a retry counter or remember previous failures. Every invocation performs the same validation checks independently.

#### Scenario: repeated apply calls detect the same violations
- **WHEN** `node sai/tools/commit.js apply` is called multiple times with the same invalid message
- **THEN** each call independently detects and reports the same violations

### Requirement: apply accepts --cwd for working directory

The `apply` subcommand SHALL accept `--cwd <directory>` to execute git operations in a non-default working directory.

#### Scenario: apply uses specified working directory
- **WHEN** `node sai/tools/commit.js apply --json --cwd /path/to/repo` is called
- **THEN** all git commands execute in the specified directory

### Requirement: apply never uses --no-verify and respects pre-commit hooks

The `apply` subcommand SHALL execute `git commit` without `--no-verify`, allowing pre-commit hooks to run.

#### Scenario: pre-commit hook failures block the commit
- **WHEN** a pre-commit hook fails during `git commit`
- **THEN** apply exits with the hook's exit code, reports the error, and executes no commit

### Requirement: apply --amend amends the previous commit's message

The `apply` subcommand SHALL accept `--amend` to amend the previous commit's message without creating an additional commit. When invoked with `--amend`, apply SHALL run `git commit --amend -F -` with the message on stdin, replacing the previous commit's message while preserving everything else about the commit.

#### Scenario: apply --amend replaces message without creating additional commit
- **WHEN** `node sai/tools/commit.js apply --json --amend` is invoked with a message on stdin
- **THEN** it exits with code 0, returns success JSON, and executes `git commit --amend -F -`; the repository contains no additional commit and the previous commit's message is replaced

#### Scenario: apply --amend message round-trips byte-for-byte
- **WHEN** a commit message containing special characters ($VAR, quotes, backticks) is passed to `apply --amend` on stdin
- **THEN** the message is transmitted byte-for-byte to git, with no escaping or interpretation

#### Scenario: apply --amend validation and sensitive-file blocking unchanged
- **WHEN** `node sai/tools/commit.js apply --amend` validates a message or detects sensitive files
- **THEN** validation rules, sensitive-file detection, blocking, and exact-match `--acknowledge-secrets` behave identically to the non-amend path

