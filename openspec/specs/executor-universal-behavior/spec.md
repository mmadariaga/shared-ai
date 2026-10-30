# executor-universal-behavior Specification

## Purpose

Define the harness-neutral behavior of the execute-only executor subagent, single-sourced in `sai/policies/executor-agent.md` and fetched by the executor agent files and budget-executor skills of both supported harnesses.

## Requirements

### Requirement: Execute-only role

The policy SHALL open by addressing the executor subagent as an execute-only command runner, so a caller session that loads it reads the rules as the subagent's contract rather than its own. The executor SHALL run only the commands the task asks for. The workspace SHALL change only through what those commands themselves do; fixes, refactors, and suggestions stay with the caller.

#### Scenario: Caller session loads the policy

- **WHEN** a budget-executor skill loads the policy into a main session
- **THEN** the policy's first line identifies the executor subagent as its subject

#### Scenario: Narrow scope enforcement

- **WHEN** the task requests running a single test file
- **THEN** the executor runs only that test file and does not run the full suite or fix failing tests

### Requirement: Command choice

When the task gives an exact command, the executor SHALL run it verbatim, flags included. When the task gives only a goal, the executor SHALL pick the narrowest command that meets it, with low-output flags (`--quiet`, `--format json`, `--reporter dot`, or equivalent) when the tool has them, and SHALL run a broad sweep only when the task asks for one.

#### Scenario: Exact command given

- **WHEN** the task says to run `npm test -- --verbose`
- **THEN** the executor runs exactly that command without adding or removing flags

#### Scenario: Goal given

- **WHEN** the task asks to run the tests for one module without naming a command
- **THEN** the executor scopes the command to that module, not the entire project

### Requirement: Independent commands run in parallel

The executor SHALL run independent commands in parallel in a single message, and SHALL run a command that depends on an earlier one after it, in the task's order.

#### Scenario: Independent lint and typecheck

- **WHEN** the task asks to run lint and typecheck on separate packages with no dependency between them
- **THEN** the executor runs them in a single message with parallel tool calls

### Requirement: Failure is a result

A failed command SHALL be reported as it is, with no retry, workaround, or file edit. Every command that depends on the failed one SHALL be reported as skipped, and independent commands SHALL still run.

#### Scenario: Build fails before tests

- **WHEN** the task asks to build and then test, and the build exits non-zero
- **THEN** the executor reports the build failure, reports the test command as skipped, and runs no fix

### Requirement: Per-command report

The report SHALL be the executor's only delivery for a task message: one report per task message, holding one entry per requested command, in the task's order. `pending`, `running`, or a promise of later results SHALL NOT be an entry, and nothing SHALL follow the report. The run is done when every command has an entry:

- Succeeded: exit code `0`, plus the output the task asked for, or one confirming line when it asked for none.
- Failed: exit code, the key failure reason in one line, and the files and line numbers involved, when there are any.
- Skipped: the failed command it depended on.

Test and build runs SHALL add the pass/fail tallies and, per failure, the test or target name, the error message, and `file:line`.

#### Scenario: Compilation error

- **WHEN** a compilation command fails with multiple errors
- **THEN** the entry lists the exit code, each unique error with `file:line`, and the total error count

#### Scenario: No pending entry

- **WHEN** a requested command has not yet exited at the point the executor would report
- **THEN** the executor does not report yet, and its single report carries a Succeeded, Failed, or Skipped entry with an exit code for every requested command

### Requirement: Raw-output boundary

The report SHALL stay low-output: it returns verbatim the output the task asked for and the relevant error or compiler messages, and summarizes everything else. Full file contents and unfiltered log streams SHALL stay out of the report. This boundary applies identically in both supported harnesses.

#### Scenario: Verbose test output

- **WHEN** a test suite produces verbose output the task did not ask for
- **THEN** the report carries the tallies and per-failure details, not the raw log stream

### Requirement: Single final report after every command exits

The executor SHALL report once per task message, only after every requested command has exited, whatever the command's duration; a report SHALL NOT be a progress update. A command that finishes within the shell's timeout SHALL run in the foreground with the longest timeout the active harness's shell allows. A command expected to outlast that timeout SHALL run in the background with its output going to a log file, and the executor SHALL wait for it to exit through the harness's own wait mechanism before reporting; it SHALL NOT report while a requested command is still running. A command the executor cannot bring to completion, because no wait mechanism is available or the shell kills it at its timeout, SHALL be reported as Failed with that reason and the path of its output log. The rule SHALL name harness mechanisms only as examples, so a changed timeout limit does not invalidate it, and it applies identically in both supported harnesses.

#### Scenario: Command within the shell timeout

- **WHEN** a requested command finishes within the longest foreground timeout the active harness's shell allows
- **THEN** the executor runs it in the foreground with that timeout and reports only after it exits

#### Scenario: Command that outlasts the shell timeout

- **WHEN** a requested test suite is expected to run longer than the longest foreground timeout
- **THEN** the executor runs it in the background with its output in a log file, waits for it to exit through the harness's wait mechanism, and only then reports its exit code and tallies

#### Scenario: Command that cannot be completed

- **WHEN** no wait mechanism is available for a background command, or the shell kills the command at its timeout
- **THEN** the executor reports that command as Failed with the reason and the path of its output log, never as pending
