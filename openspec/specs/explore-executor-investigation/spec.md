# explore-executor-investigation Specification

## Purpose
TBD - created by archiving change batch-explore-executor-investigation. Update Purpose after archive.

## Requirements

### Requirement: Explore loads the investigation batch rule before its first executor dispatch

Pre-crystallization Explore SHALL fetch and follow `sai/policies/investigation-batch.md` before its first executor dispatch, through a directive in the Behaviors section of `sai/commands/explore/body.md`. The rule SHALL live in shared sources only, so Claude Code and opencode receive the same behavior.

#### Scenario: First executor dispatch of pre-crystallization Explore

- **WHEN** pre-crystallization Explore is about to send its first executor dispatch
- **THEN** it has fetched `sai/policies/investigation-batch.md` and follows it for that dispatch and every later executor dispatch of the investigation

### Requirement: Independent commands travel in one investigation batch

For each investigation question, Explore SHALL name the question, list every command it needs, and send every independent command in one investigation batch. Explore MUST NOT chain independent reads one per dispatch.

#### Scenario: Question needing several independent reads

- **WHEN** an investigation question needs several reads that do not depend on each other
- **THEN** Explore sends all of them in a single executor dispatch

### Requirement: Fallbacks are pre-planned as single conditional commands

For each command that can plausibly fail, Explore SHALL plan its fallback inside the same investigation batch as a single shell command with its own condition (`primary || fallback`). The executor SHALL run exactly the commands it is given and SHALL add no retries beyond those written in the batch; a failed fallback command SHALL be reported like any other failure.

#### Scenario: Primary command fails and its fallback runs

- **WHEN** the primary part of a `primary || fallback` command in a batch fails
- **THEN** the fallback runs within that same command and dispatch, with no executor-initiated retry

#### Scenario: Fallback command also fails

- **WHEN** both the primary and the fallback of a batch command fail
- **THEN** the executor reports that failure like any other failure and adds no further retry

### Requirement: Investigation batches use only known access data

An investigation batch SHALL use only known access data. When a credential, tenant, or base URL is unknown, Explore SHALL obtain it from project configuration or seed data through a command in the batch, or ask the user for it, and MUST NOT guess a value.

#### Scenario: Unknown base URL

- **WHEN** an investigation question needs a base URL that Explore does not know
- **THEN** the batch reads it from project configuration or seed data, or Explore asks the user, and no guessed value is used

### Requirement: Executor dispatches per investigation question are capped

The dispatch cap SHALL be 2 executor dispatches per investigation question. A dispatch that needs the result of an earlier dispatch SHALL be allowed and SHALL count toward the cap. A retry of an identical prompt after a transport failure under `sai/policies/bounded-dispatch-retry.md` SHALL NOT count toward the cap.

#### Scenario: Dependent second dispatch

- **WHEN** a second dispatch needs the result of the first dispatch for the same question
- **THEN** Explore may send it, and it counts as the second of the 2 allowed dispatches

#### Scenario: Transport retry

- **WHEN** an executor dispatch fails in transport and Explore retries the identical prompt
- **THEN** the retry does not count toward the dispatch cap

### Requirement: Explore closes a question as soon as a result settles it

When a result settles the investigation question, Explore SHALL report the answer in its next reply and MUST NOT send any further dispatch for that question.

#### Scenario: First batch settles the question

- **WHEN** the result of an investigation batch answers the investigation question
- **THEN** Explore reports the answer in its next reply and sends no further executor dispatch for that question

### Requirement: Reaching the cap without an answer stops dispatching

When the dispatch cap is reached without a settled answer, Explore SHALL stop dispatching, report what is established and what is missing, and ask through the native picker, following `sai/policies/question-context.md`, whether to continue. When the user approves continuing, the continuation SHALL start with a fresh dispatch cap.

#### Scenario: Cap reached with the question still open

- **WHEN** the second executor dispatch for a question returns without settling it
- **THEN** Explore sends no further dispatch, reports what is established and what is missing, and asks through the native picker whether to continue

#### Scenario: User approves continuing

- **WHEN** the user approves continuing after the dispatch cap was reached
- **THEN** the continuation starts with a fresh cap of 2 executor dispatches

### Requirement: Executor use outside pre-crystallization Explore is unchanged

The investigation batch rule SHALL apply only to executor dispatches that settle an investigation question before crystallization. Executor dispatches of Direct Build gates, the POC lane, and other commands SHALL keep their behavior, and the executor contract in `sai/policies/executor-agent.md` SHALL remain unchanged.

#### Scenario: Direct Build gate dispatch

- **WHEN** a Direct Build gate dispatches an executor
- **THEN** no investigation batch planning or dispatch cap applies to that dispatch
