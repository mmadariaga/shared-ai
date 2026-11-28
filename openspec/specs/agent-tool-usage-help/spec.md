# agent-tool-usage-help Specification

## Purpose

TBD - created by archiving change tool-usage-help. Update Purpose after archive.

## Requirements

### Requirement: Agent-facing tools declare their usage as data rendered by one shared module

Each of the 38 agent-facing deterministic tools (`commit`, `to-pr`, `to-backlog`, `from-backlog`, `from-next-backlog-item`, `file-manifest`, `check-delta-headers`, `scenario-coverage`, `test-select`, `validate-backfill-drafts`, `backfill-no-specs`, `worker-report-validator`, `risk-signals`, `change-document`, `issue-precheck`, `change-telemetry`, `decision-records`, `tool-access`, `prereqs`, `change-picker`, `transfer`, `temp-root`, `dispose-shells`, `project-settings`, `archive-plan`, `check-cited-paths`, `lint`, `merge`, `worktree`, `review-delta`, `slice-path-scope`, `no-commit-guard`, `status`, `opencode-dispatch`, `claude-dispatch`, `new-change-branch`, `retrospective`, and `bin/sai-state`) SHALL declare its usage once, as an exported data constant beside its parser: a map of each subcommand to its usage lines and at least one real example, or one general entry for a tool without subcommands. `sai/tools/usage.js` SHALL be the only renderer of that text, for both the usage error and `--help`; no tool SHALL format usage text on its own. Requiring a tool's file SHALL NOT run the tool.

#### Scenario: A tool's declaration is required without running it

- **WHEN** a test requires `sai/tools/commit.js` or `sai/tools/check-delta-headers.js`
- **THEN** the module exports its usage declaration and runs no command-line work

#### Scenario: A declaration without an example is rejected

- **WHEN** the shared module lints a declaration whose entry has no usage line, no example, or an example that the declaration itself rejects or that does not call its own subcommand
- **THEN** the lint reports that problem for the entry

### Requirement: Help requests print the scoped usage block without validating arguments

A tool SHALL answer `--help` (or `-h`) in any position of its arguments, including next to invalid arguments and in the value position of a flag, with exit 0, no argument validation, no file read, and no side effect. When the subcommand is recognized it SHALL print only that subcommand's usage lines and examples; otherwise it SHALL print the general block, which lists every subcommand.

#### Scenario: Subcommand help is scoped

- **WHEN** an agent runs `node sai/tools/merge.js resolution --help`
- **THEN** the tool exits 0 and prints the usage lines and examples of `resolution` only

#### Scenario: Help wins over invalid arguments

- **WHEN** an agent runs a tool with an unknown flag and `--help`, or with `--help` as the value of a flag such as `--message --help`
- **THEN** the tool exits 0, validates nothing, reads no file, and prints the help of the recognized subcommand or the general help

### Requirement: Wrong invocations exit 2 with the cause, the usage line, and an example

A tool SHALL detect an unknown flag, a missing value for a flag, a positional it does not accept, an invalid enum value, an unknown subcommand, and a missing subcommand before doing any work. It SHALL exit 2, create no directory, read no input file, and run no git command. The error SHALL name the offending argument and print the `Usage:` line and at least one example of the recognized subcommand, or the general block listing every subcommand when no subcommand is recognized. A wrong argument SHALL NOT end in an uncaught exception with a stack trace, and domain errors SHALL keep their current behavior.

#### Scenario: An error inside a recognized subcommand is scoped to it

- **WHEN** an agent runs a recognized subcommand with an unknown flag
- **THEN** the tool exits 2, names the flag, prints only that subcommand's usage and examples, and has no side effect

#### Scenario: A call with no arguments is a usage error

- **WHEN** an agent runs a tool that has subcommands with no arguments
- **THEN** the tool exits 2 and prints the general usage block on its error channel

#### Scenario: An unknown subcommand is named

- **WHEN** an agent runs a tool with a subcommand it does not declare
- **THEN** the tool exits 2, names the subcommand, and prints the general block that lists every subcommand

#### Scenario: A tool without subcommands rejects an extra positional

- **WHEN** an agent runs `check-delta-headers` or `dispose-shells` with a positional it does not accept
- **THEN** the tool exits 2 with its general usage block

### Requirement: The usage block keeps each tool's output channel and error shape

A tool whose usage error is text SHALL print the block to stderr on an error and to stdout on `--help`. A tool whose usage error is a JSON object on stdout SHALL keep every existing key and value of that object (such as `status`, `reason`, `ok`, and `error.code`) and add only `usage` (text) and `examples` (a list of texts), so stdout stays one parseable JSON object; its `--help` SHALL also be one JSON object that carries `usage` and `examples`, and `temp-root` and `transfer` SHALL keep their existing `--help` keys. Accepted flags, default values, success payloads, success exit codes, and domain-failure exit codes SHALL stay unchanged.

#### Scenario: A JSON usage error keeps its keys

- **WHEN** an agent runs a JSON tool such as `to-pr` with a wrong argument
- **THEN** stdout is one JSON object that keeps the tool's existing usage-error keys and values and adds `usage` and `examples`

#### Scenario: A text tool separates help and error channels

- **WHEN** an agent runs a text tool such as `change-picker` with `--help` and then with a wrong argument
- **THEN** the help block is printed to stdout and the error block to stderr

### Requirement: Usage errors are distinguishable from domain failures by exit code

`validate-backfill-drafts`, `backfill-no-specs`, and `new-change-branch` SHALL exit 2 on a usage error and keep exit 1 for their domain failures, so every agent-facing tool reports a wrong invocation with exit 2.

#### Scenario: An unknown subcommand of backfill-no-specs exits 2

- **WHEN** an agent runs `node sai/tools/backfill-no-specs.js unknown`
- **THEN** the tool exits 2

#### Scenario: A domain failure keeps exit 1

- **WHEN** `validate-backfill-drafts validate` runs on a well-formed call whose drafts fail validation
- **THEN** the tool exits 1

### Requirement: The stage-machine CLI renders its usage through the shared module

`bin/sai-state.js` SHALL load `usage.js` through the same two-location lookup it uses for its other helpers (repository `bin/` to `sai/tools/`, installed `sai/bin/` to `sai/tools/`) and SHALL exit 2 naming the tried paths when neither exists. Its verbs SHALL count as subcommands. A verb-parser usage error SHALL keep the parser's existing message and then print the usage block of that verb. The help of `emit` SHALL give each distinct invocation shape (flags, `--input-file`, `--progress` with a report reference, `--document-file`, `--amend`) its own usage line and at least one example.

#### Scenario: The help of emit lists every shape

- **WHEN** an agent runs `node bin/sai-state.js emit --help`
- **THEN** the output carries one usage line for each shape of `emit` and at least one example

#### Scenario: A verb-parser error keeps its message

- **WHEN** an agent runs `sai-state emit` without its required arguments
- **THEN** the tool exits 2 with the parser's existing message followed by the usage block of `emit`

### Requirement: A test guards the usage declaration of every agent-facing tool

The repository SHALL keep a test that walks the fixed list of the 38 agent-facing tools and fails when a tool has no usage declaration, when a subcommand its parser accepts has no declaration, or when an example uses a subcommand or flag its declaration does not list.

#### Scenario: A tool without a declaration fails the test

- **WHEN** an agent-facing tool in the list exports no usage declaration
- **THEN** `test/tool-usage.test.js` fails for that tool
