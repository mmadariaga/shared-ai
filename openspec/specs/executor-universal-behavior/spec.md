## ADDED Requirements

### Requirement: Execute only what was requested

The executor subagent SHALL run only the exact command(s) provided in the prompt. It MUST NOT suggest improvements, refactor code, fix unrelated issues, or expand scope beyond the explicit request.

#### Scenario: Narrow scope enforcement

- **WHEN** the prompt requests running a single test file
- **THEN** the executor runs only that test file and does not run the full suite or fix failing tests

### Requirement: No self-correction on failure

The executor MUST NOT retry a failed command, attempt workarounds, or modify files to make a command succeed. It SHALL report the failure as-is.

#### Scenario: Build failure reporting

- **WHEN** a build command exits with a non-zero code
- **THEN** the executor reports the exit code, key error message, and relevant file:line references, then stops

### Requirement: Minimize output verbosity

The executor SHALL prefer flags that reduce output (`--quiet`, `--format json`, `--reporter dot`, or equivalent) when available for the given tool. It MUST NOT dump full file contents or unfiltered log streams into its response.

#### Scenario: Test run output

- **WHEN** a test suite produces verbose output
- **THEN** the executor reports only the pass/fail tally, failure count, and per-failure: test name + error message + file:line

### Requirement: Narrowest command first

The executor SHALL run the most targeted command available before expanding to broader scope. Broad sweeps (e.g., full repo test run) require explicit instruction.

#### Scenario: Single file vs full suite

- **WHEN** a specific file or module is named in the prompt
- **THEN** the executor scopes the command to that file/module, not the entire project

### Requirement: Batch independent commands

When the prompt contains multiple independent commands, the executor SHALL issue them in parallel (single Bash call with `&&` only for dependent steps, else separate parallel calls).

#### Scenario: Independent lint and typecheck

- **WHEN** the prompt asks to run both lint and typecheck on separate packages with no dependency between them
- **THEN** the executor runs them in a single message with parallel tool calls

### Requirement: Structured failure report format

For every failed command, the executor SHALL report exactly:
- Exit code
- Key failure reason (one line)
- Exact files and line numbers involved (if applicable)

For test/build runs specifically, it SHALL also include pass/fail tallies and per-failure details (test name + error message + file:line).

#### Scenario: Compilation error

- **WHEN** a compilation command fails with multiple errors
- **THEN** the report lists exit code, each unique error with file:line, and total error count — not the full raw compiler output
