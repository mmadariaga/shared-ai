# test-execution Specification

## Purpose

TBD - created by archiving change unify-test-execution-policy. Update Purpose after archive.

## Requirements

### Requirement: One shared test-execution policy

The SAI commands that run project tests (`/sai-3-implement`, and through it `/sai-build` and `/sai-deep-review`, Direct Build on the explore route and `/sai-direct-build`, and `/sai-merge`) SHALL load `sai/policies/test-execution.md` and follow it for every run and classification of project tests, keeping in their own cards only the scope of each run and their fix loop. `/sai-4-review`, the security, performance, and accessibility audits, `/sai-commit`, `/sai-archive`, `/sai-backfill`, `/to-pr`, and the `--no-specs` POC lane SHALL keep running no project tests under this policy. No SAI command SHALL run an end-to-end suite or gate on a CI result.

#### Scenario: A test-running command loads the policy

- **WHEN** the implement coordinator, the Direct Build coordinator, or the merge coordinator starts a run
- **THEN** it fetches `sai/policies/test-execution.md` and runs and classifies project tests only as that policy says

#### Scenario: A command outside the policy runs no project tests

- **WHEN** `/sai-4-review`, an audit, `/sai-commit`, `/sai-archive`, `/sai-backfill`, `/to-pr`, or the POC lane runs
- **THEN** it runs no project tests under the test-execution policy and its test behavior is unchanged

### Requirement: Shared test-command resolver

`sai/tools/test-select.js` SHALL provide a `command` subcommand that resolves the project's test command and its scoping idiom and prints `verdict` (`found`, `none`, or `ambiguous`), `command`, `scoping_idiom`, `source`, and `candidates` when the verdict is `ambiguous`. It SHALL read the sources in this order: the `**Test Command**` of `## Implementation Context` in the change's `tasks.md` (when `--change` names a change that has one), the `## Test Command` of `SAI_LEARNINGS.md`, `AGENTS.md`, `README.md`, and then the project markers. A source level that names several different commands, none of which is clearly the general one, SHALL yield `ambiguous`. The sentinel `None — no test runner in this project`, or no source and no marker, SHALL yield `none`. A `null` scoping idiom SHALL mean the command takes no list of test files. The coordinators SHALL resolve the command once at the start of the run and reuse the answer for every run of the tests.

#### Scenario: The command comes from the first source that names one

- **WHEN** `tasks.md` has no `**Test Command**` and `AGENTS.md` names one test command
- **THEN** `command` prints `verdict` `found`, that command, its scoping idiom, and `AGENTS.md` as the source

#### Scenario: Several commands at one level are ambiguous

- **WHEN** one source level names two different test commands and neither is a prefix of the other
- **THEN** `command` prints `verdict` `ambiguous` with both in `candidates`

#### Scenario: A project with no test runner

- **WHEN** no source names a test command and no project marker exists
- **THEN** `command` prints `verdict` `none`

### Requirement: Project markers belong to the shared resolver

The marker detection that `merge.js` used to run SHALL live in `test-select.js command`, as its last source. It SHALL keep recognizing .NET projects: every `*.sln` file at the project root or one level below it, outside dot-directories, and, only when no such solution exists, every `*.csproj` file at the project root. Exactly one .NET candidate SHALL resolve to `dotnet test <candidate>`; several candidates SHALL yield `ambiguous` with the candidates listed.

#### Scenario: Single solution resolves to dotnet test

- **WHEN** no document source names a test command and the only marker is one `*.sln` file at the root
- **THEN** `command` prints `verdict` `found` with `dotnet test` and that solution's path

#### Scenario: Several solutions are ambiguous

- **WHEN** no document source names a test command and two `*.sln` candidates exist
- **THEN** `command` prints `verdict` `ambiguous` with both `dotnet test` candidates

### Requirement: Indicated and related tests per run

Each run of the tests SHALL execute the indicated tests of the run plus the tests that `test-select.js select` reports for the files changed in that run's scope, and the run SHALL be handed over as an exact command line built from the resolved command, its scoping idiom, and the test files, never as a generic goal such as "run the project's full test suite". When `select` answers `full`, that run SHALL execute the full suite (unit and integration) once and record the reason; the next run SHALL compute the selection again. When the resolved command takes no list of files, every run SHALL be the full suite with the reason `no scoping idiom`. When the selection is `selected` with an empty list and the run has no indicated tests, no test SHALL run, and the closing report SHALL state that no test is related to the changes, without an obstacle.

#### Scenario: A trustworthy selection runs only the selected tests

- **WHEN** `select` answers `selected` with two test files for a run with one indicated test file
- **THEN** the run executes one command line over those three test files

#### Scenario: An untrusted selection falls back to the full suite once

- **WHEN** `select` answers `full` with reason `stale-index`
- **THEN** that run executes the full suite once, records `full stale-index`, and the next run selects again

#### Scenario: Nothing related and nothing indicated

- **WHEN** a run has no indicated tests and `select` answers `selected` with an empty list
- **THEN** no test runs and the closing report says that no test is related to the changes

### Requirement: Selection ignores file types outside the graph

`test-select.js select` SHALL derive the indexed file types from the extensions present in `codegraph files --json`. A changed file whose extension is not an indexed type (documentation, configuration, assets) SHALL stay out of the selection and SHALL NOT cause `unindexed-file`; only a changed file of an indexed type that the listing lacks SHALL cause `full` with reason `unindexed-file`.

#### Scenario: A documentation file does not force the full suite

- **WHEN** a run changed only a Markdown file and the index holds no Markdown file
- **THEN** `select` answers `selected` with an empty list, not `full`

#### Scenario: An unindexed source file forces the full suite

- **WHEN** a run changed a `.js` file that `codegraph files --json` does not list while other `.js` files are listed
- **THEN** `select` answers `full` with reason `unindexed-file`

### Requirement: Lazy classification of failing tests

A failing test SHALL be classified lazily: first rerun once at the current state, where a pass makes it flaky (reported, never blocking); then, if it still fails, run at the classification base through `test-select.js swap` and `restore`, reading the verdict of `restore` before anything else happens. A test that also fails at the base SHALL be pre-existing (reported, never blocking). A test that passes at the base, does not exist there, or cannot run there SHALL be new and SHALL enter the fix loop of its command. When `swap` answers `refused` or a tool error, the failures SHALL count as new. When `restore` answers `failed`, the run SHALL block: nothing is edited, staged, or committed while base files are in the working tree. Each command SHALL record its dirty git state (`git status --porcelain`) before it starts, so `swap` never touches work outside the run.

#### Scenario: A flaky test never blocks

- **WHEN** a failing test passes on its rerun at the current state
- **THEN** it is reported as flaky and does not enter the fix loop

#### Scenario: A pre-existing failure never blocks

- **WHEN** a test fails again and also fails after `swap` to the classification base
- **THEN** it is reported as pre-existing and does not enter the fix loop

#### Scenario: A failed restore blocks the run

- **WHEN** `restore` answers `failed`
- **THEN** the run edits, stages, and commits nothing and recovers under its obstacle rules

### Requirement: Swap against an explicit base

`test-select.js swap` SHALL accept `--base <sha>` as the classification base, exclusive with `--parent-branch`, and `--paths-file <path>` (a JSON list of the uncommitted repository paths the run changed), which requires `--base`. With `--paths-file`, `swap` SHALL copy those paths aside and `restore` SHALL write the copies back. A path of the dirty git state that overlaps the run's paths SHALL make `swap` answer `refused`.

#### Scenario: Both base options are a usage error

- **WHEN** `swap` receives both `--parent-branch` and `--base`
- **THEN** it exits with a usage error and changes nothing

#### Scenario: Uncommitted run files are restored from their copies

- **WHEN** `swap --base <sha> --paths-file <file>` swapped uncommitted paths and `restore` runs
- **THEN** `restore` writes the saved copies back and answers `restored`

### Requirement: Test-command obstacle

An ambiguous test command and a runner that fails before running any test SHALL be one obstacle, `test-command`, under `sai/policies/obstacle-escalation.md`, with a budget of 3 attempts, each a different approach, and then escalation. A run that cannot run a test SHALL NOT close as if it had run one. A project with no test suite SHALL be reported and the run SHALL continue.

#### Scenario: A broken runner escalates after three attempts

- **WHEN** the test runner fails before running any test on three attempts with different approaches
- **THEN** the command escalates the `test-command` obstacle with stop options

#### Scenario: No test suite is not an obstacle

- **WHEN** the resolver answers `none`
- **THEN** the command reports that the project has no test suite and continues

### Requirement: Test runs in the closing report

The closing report of each test-running command SHALL list every test run with its selection result (`selected N` or `full <reason>`), the flaky tests, the pre-existing failures, and a statement that the routine full-suite run belongs to CI.

#### Scenario: The report names each run's selection

- **WHEN** a run closes after one selected run and one full-suite fallback
- **THEN** its closing report lists `selected N` and `full <reason>` for those runs and states that the routine full-suite run belongs to CI
