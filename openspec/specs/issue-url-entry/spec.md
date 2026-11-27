# issue-url-entry Specification

## Purpose

TBD - created by archiving change sai-explore-issue-url-invocation. Update Purpose after archive.

## Requirements

### Requirement: A whole-argument issue URL is imported after the load

`/sai-explore` SHALL import an issue through the from-backlog skill, in the same session, when the cleaned argument (`arguments_value` after the `--fast-track` strip and the trim) is exactly one `https://` URL that `from-backlog.js detect` classifies with `verdict: issue`. The import SHALL run only on an invocation turn, after the prerequisite check, the instruction loads, `sai-state spawn`, the invocation resets, and the chat-language read; a recovery load SHALL NOT run it. Explore SHALL announce the import in one line, SHALL decide only from the `detect` verdict and never from its own reading of the URL, and SHALL ask the `work`/`context` question of the issue intake in place of the skill's own continuation question. For a mature issue (`change-document.js sections` reports `ready_to_propose_form: true`) Explore SHALL skip the skill's §3 full presentation and §4 project assessment, SHALL present the issue as the summary and run the deterministic precheck of the issue intake, and SHALL ask the `work`/`context` question and the drift check in one round of `sai/policies/question-rounds.md`; every other issue SHALL keep the skill's §3 and §4 and ask the `work`/`context` question once the import and the project assessment are complete. The import SHALL be read-only: it writes no repository file, changes nothing at the provider, assigns nothing, and starts no route. Claude Code and opencode SHALL behave the same, through the shared `body.md`.

#### Scenario: Issue URL as the whole argument

- **WHEN** the user runs `/sai-explore https://github.com/owner/repo/issues/123`
- **THEN** Explore announces the import in one line, follows the from-backlog skill with that URL after the load, and closes the turn with the `work`/`context` question

#### Scenario: Fast-track token does not block the import

- **WHEN** the invocation carries `--fast-track` and the cleaned argument is exactly one issue URL
- **THEN** the import runs as without the token

#### Scenario: Recovery load never repeats the import

- **WHEN** Explore reloads after a compaction or a missing load receipt
- **THEN** no `detect` call and no import run

#### Scenario: No load receipt, no import

- **WHEN** the prerequisite check or `sai-state spawn` fails
- **THEN** nothing is imported

#### Scenario: A mature issue skips the presentation and the assessment

- **WHEN** the imported issue is `Ready to propose`
- **THEN** Explore shows its summary, runs the precheck, and asks the work question and the drift check in one round, without the skill's §3 full presentation and §4 project assessment

#### Scenario: An issue that is not mature keeps the skill's flow

- **WHEN** the imported issue is not `Ready to propose`
- **THEN** the skill presents it and assesses it against the project before Explore asks the `work`/`context` question

### Requirement: Arguments that are not a single issue URL keep the ordinary entry

`/sai-explore` SHALL run no `detect` call and SHALL enter the argument as ordinary idea content when the cleaned argument holds other text beside a URL, several URLs, a `#N` reference, or a path-only reference. A single `https://` URL whose `detect` verdict is `none` SHALL also enter as ordinary idea content.

#### Scenario: URL with other text

- **WHEN** the cleaned argument holds an issue URL plus other words
- **THEN** nothing is imported and the whole argument enters as ordinary idea content

#### Scenario: URL without an issue shape

- **WHEN** the cleaned argument is a single pull request, repository, or documentation URL
- **THEN** `detect` returns `verdict: none` and an ordinary exploration starts with the URL as content

### Requirement: Import and detection failures offer recovery options

When the from-backlog `resolve` or `read` fails, the issue is missing, or the load is incomplete, `/sai-explore` SHALL show the tool's concrete message through the native picker with the options `retry` and `stop`; on `stop` the exploration SHALL stay active with no candidate idea and SHALL NOT use the URL as content. When `detect` cannot run or prints unreadable output, Explore SHALL show the failure through the native picker with the options `retry` and `continue without import`, and `continue without import` SHALL enter the URL as ordinary idea content.

#### Scenario: Issue cannot be read

- **WHEN** an issue URL is detected but from-backlog cannot resolve or read it
- **THEN** Explore shows the concrete failure with `retry` and `stop`, and `stop` leaves the exploration active with no candidate idea

#### Scenario: Detector cannot run

- **WHEN** the `detect` call fails or prints unreadable output
- **THEN** Explore offers `retry` and `continue without import`, never deciding on its own whether the URL is an issue
