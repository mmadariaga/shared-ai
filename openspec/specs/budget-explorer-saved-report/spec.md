# budget-explorer-saved-report Specification

## Purpose
TBD - created by archiving change sai-2-design-reuses-spec-research. Update Purpose after archive.

## Requirements

### Requirement: A budget-explorer task that carries --report-dir is answered with a saved report

The explorer contract `sai/policies/explore-agent.md` SHALL fetch `sai/policies/worker-report-transport.md` and follow its § Budget agents, agent side, for every task that carries a goal, whose first line is `--report-dir <path>`, optionally followed by a `--harness <name>` line. The explorer SHALL strip both lines before reading the goal, compose the complete response of the output contract (`ladder_discards`, `out_of_root_requests`, and `warming` included), write it unchanged to a draft file in that directory, and save it with `transfer.js put --dir <report-dir> --path <unique-name>.md --exclusive --input-file <draft>`, adding `--harness <value>` when the task carried that line. It SHALL reply with only the `{path, sha256}` that `put` printed and its `warming` line. The saved file SHALL be the explorer's verbatim response, and nothing SHALL rewrite it afterwards. The shell restriction SHALL admit the `transfer.js put` call of the saved report.

#### Scenario: the explorer replies with the reference only

- **WHEN** a budget-explorer receives a task whose first line is `--report-dir <dir>`
- **THEN** it saves its complete response in `<dir>` with `transfer.js put --exclusive` and replies with only the `{path, sha256}` reference and its `warming` line

#### Scenario: an existing name is never overwritten

- **WHEN** the `put` of a saved report fails because the name already exists
- **THEN** the earlier file stays unchanged and the explorer saves its response again under another name

#### Scenario: a twice-failed save falls back to text

- **WHEN** `put` fails twice for a saved report
- **THEN** the explorer replies with one text line that names the failure and the path of the draft already written in the report directory, and its response stays out of the message

### Requirement: Budget-explorer skills document the saved-report line on both harnesses

The Claude Code and opencode `budget-explorer` skills SHALL state that every spawn prompt opens with the line `--report-dir <dir>`, the helper report directory the dispatcher opened with `transfer.js open`, that the explorer saves its complete response there and replies with its `{path, sha256}` reference only, and that there is no text reply. The Claude Code skill SHALL add `--harness claude` as the second line when it dispatches an explorer routed to opencode, so the report lands in the SAI temp root of the main harness. Both skills SHALL point to `sai/policies/worker-report-transport.md` § Budget agents, dispatcher side, for creating the directory, accepting the reference, recovering an undelivered report, and closing the directory. The `budget-explorer` agent descriptions on both harnesses SHALL say that the explorer writes only the report that a `--report-dir` line names.

#### Scenario: an explorer routed to opencode saves under the Claude Code temp root

- **WHEN** a Claude Code dispatcher sends a `--report-dir` task to a budget-explorer whose agent file carries `harness: opencode`
- **THEN** the task carries `--harness claude` right after the `--report-dir` line and the report is saved in the Claude Code SAI temp root
