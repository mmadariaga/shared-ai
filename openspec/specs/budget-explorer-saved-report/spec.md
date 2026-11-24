# budget-explorer-saved-report Specification

## Purpose
TBD - created by archiving change sai-2-design-reuses-spec-research. Update Purpose after archive.

## Requirements

### Requirement: A budget-explorer task that carries --report-dir is answered with a saved report

The explorer contract `sai/policies/explore-agent.md` SHALL treat a task whose first line is `--report-dir <path>`, optionally followed by a `--harness <name>` line, as a request for a saved report. The explorer SHALL strip both lines before reading the goal, compose the complete response of the output contract (`ladder_discards`, `out_of_root_requests`, and `warming` included), write it unchanged to a draft file in that directory, and save it with `transfer.js put --dir <report-dir> --path <unique-name>.md --exclusive --input-file <draft>`, adding `--harness <value>` when the task carried that line. It SHALL reply with only the `{path, sha256}` that `put` printed and its `warming` line. The saved file SHALL be the explorer's verbatim response, and nothing SHALL rewrite it afterwards. The shell restriction SHALL admit the `transfer.js put` call only for a task that carries `--report-dir`.

#### Scenario: the explorer replies with the reference only

- **WHEN** a budget-explorer receives a task whose first line is `--report-dir <dir>`
- **THEN** it saves its complete response in `<dir>` with `transfer.js put --exclusive` and replies with only the `{path, sha256}` reference and its `warming` line

#### Scenario: an existing name is never overwritten

- **WHEN** the `put` of a saved report fails because the name already exists
- **THEN** the earlier file stays unchanged and the explorer saves its response again under another name

#### Scenario: a twice-failed save falls back to text

- **WHEN** `put` fails twice for a saved report
- **THEN** the explorer replies with its response in text and names the failure on the first line

### Requirement: A budget-explorer task without --report-dir is answered in text

A task that does not open with the `--report-dir` line SHALL be answered in text, as the output contract says, and the explorer SHALL write no file for it.

#### Scenario: an ordinary task keeps the text return

- **WHEN** `/sai-explore`, a design explorer, standalone `/sai-1-spec`, or any other command dispatches a budget-explorer without `--report-dir`
- **THEN** the explorer returns its result as text and saves no report

### Requirement: Budget-explorer skills document the saved-report line on both harnesses

The Claude Code and opencode `budget-explorer` skills SHALL tell a caller that wants the report as a file to start the spawn prompt with `--report-dir <dir>`, a directory it opened with `transfer.js open`. The Claude Code skill SHALL add `--harness claude` right after that line when it dispatches an explorer routed to opencode, so the report lands in the SAI temp root of the main harness. The `budget-explorer` agent descriptions on both harnesses SHALL say that the explorer writes only the report that a `--report-dir` line names.

#### Scenario: an explorer routed to opencode saves under the Claude Code temp root

- **WHEN** a Claude Code dispatcher sends a `--report-dir` task to a budget-explorer whose agent file carries `harness: opencode`
- **THEN** the task carries `--harness claude` right after the `--report-dir` line and the report is saved in the Claude Code SAI temp root
