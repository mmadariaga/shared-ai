# test-suite-hermeticity Specification

## Purpose
TBD - created by archiving change hermetic-windows-test-suite. Update Purpose after archive.

## Requirements

### Requirement: Backlog tests SHALL run against an isolated temporary project

The `from-next-backlog-item`, `from-backlog`, and `to-backlog` tests SHALL pass an isolated temporary project as the project root of the tool under test, through the `io.cwd` given to `select` or the `cwd` of the spawned CLI process, so that their results do not depend on the developer checkout's `.sai/` settings or Git remotes.

#### Scenario: Checkout settings do not change a backlog test result
- **WHEN** a backlog test runs in a checkout whose `.sai/settings.jsonc` or `.sai/settings.local.jsonc` sets `backlog.provider` or other values
- **THEN** the test produces the same result as in a checkout without those files, because the tool reads the settings of the isolated project instead

#### Scenario: Faked remotes are the only remotes a test sees
- **WHEN** a test fakes `git remote -v` through `io.run`
- **THEN** `select` sees only the faked remotes, whatever remotes the developer checkout has

#### Scenario: Spawned CLI runs do not inherit the repository root as project root
- **WHEN** a `from-backlog` or `to-backlog` test spawns a script that runs the tool's `main`
- **THEN** the script loads each tool by absolute path under the repository root and the process runs with its `cwd` set to an isolated temporary project

### Requirement: The isolated temporary project SHALL be empty and removed when its test ends

`isolatedProject(t)` SHALL create an empty directory under the real path of `os.tmpdir()`, with no `.sai/` directory and no enclosing Git repository, register its removal with `t.after`, and return its path.

#### Scenario: The project is removed whatever the outcome
- **WHEN** a test that called `isolatedProject(t)` ends, passing or failing
- **THEN** the directory it returned no longer exists

### Requirement: Directory-link tests SHALL create junctions

Tests that need a directory link SHALL create it with `linkDirectory(target, link)`, which creates a `'junction'` link that needs no symlink privilege on Windows and is a normal directory symlink on other platforms.

#### Scenario: A linked skill directory is checked without symlink privilege
- **WHEN** the writing-for-agents probe test runs on Windows without symlink privilege
- **THEN** it still creates the link and asserts both outcomes: a linked skill directory counts as present and a dangling link counts as absent

### Requirement: File-link tests SHALL skip visibly only when link creation lacks privilege

Tests that need a file link SHALL create it with `linkFile(t, target, link)`. When creating the link fails with `EPERM` or `EACCES`, the test SHALL be skipped with a reason that names the error code; any other error while creating the link SHALL fail the test. Each file-link case SHALL run as its own subtest, so that its skip does not skip the other cases of the same test.

#### Scenario: Missing privilege skips the file-link case with its error code
- **WHEN** creating a file link fails with `EPERM` or `EACCES`
- **THEN** that case is skipped with a reason naming the error code, and the remaining cases of the parent test still run

#### Scenario: Another link error fails the test
- **WHEN** creating a file link fails with an error code other than `EPERM` or `EACCES`
- **THEN** the error is rethrown and the test fails

#### Scenario: With privilege every link case runs in full
- **WHEN** the suite runs on Windows with symlink privilege, or on Linux or macOS
- **THEN** every file-link and directory-link case runs with no skip
