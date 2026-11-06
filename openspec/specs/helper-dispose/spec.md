# helper-dispose Specification

## Purpose
TBD - created by archiving change subagent-cache-warming-core. Update Purpose after archive.

## Requirements

### Requirement: Helpers are disposed after their result

A helper's task message or continuation SHALL carry no warming line, and its result SHALL be final and declare `warming: false`. The budget executor SHALL never arm. A one-shot helper (`budget-subagent`, `budget-executor`) SHALL be disposed by its dispatcher after its result, under `sai/policies/worker-lifecycle.md`, whatever its latest `warming` declaration. The executor policy (`sai/policies/executor-agent.md`) and the task subagent policy (`sai/policies/budget-agent.md`) SHALL end every report with `warming: false`. The budget executor and budget subagent skills on both harnesses SHALL fetch `@sai/policies/cache-warming.md` and `@sai/policies/worker-lifecycle.md` and state that the coordinator disposes the helper after its result.

#### Scenario: Executor result read
- **WHEN** a coordinator reads an executor's result
- **THEN** the result declares `warming: false` and the coordinator disposes the executor after reading it

#### Scenario: Helper of a worker
- **WHEN** a worker that cannot dispose dispatches its own helper
- **THEN** it sends no warming line, so the helper never arms

#### Scenario: Task subagent disposed without a warm-up
- **WHEN** a coordinator reads the result of a `budget-subagent` that never received a `warm-up`
- **THEN** the coordinator disposes the subagent after its result

### Requirement: Warm-up before helper reuse

A dispatcher that will reuse a finished `budget-explorer` or `budget-subagent` SHALL be able to send it the message `warm-up` followed by the warming line, only when that helper's latest declared value is `warming: false` and its resolved timings are not `off`. The dispatcher SHALL NOT send `warm-up` to a `budget-executor` or to a worker. On `warm-up`, the helper SHALL arm, do no other work, and reply with the declaration line alone: `warming: true`, or `warming: false` when arming failed. The `budget-explorer` and `budget-subagent` skills on Claude Code and opencode SHALL describe the `warm-up` before reuse, and `sai/policies/explore-agent.md` SHALL recognize a `warm-up` message as that order rather than a ready probe.

#### Scenario: Warm-up of a reused explorer
- **WHEN** a coordinator with active warming will reuse an explorer whose latest result declared `warming: false`
- **THEN** it sends `warm-up` with the warming line and the explorer arms and replies only `warming: true`

#### Scenario: Warming setting off
- **WHEN** the resolved timings are `off`
- **THEN** the dispatcher sends no `warm-up` to any helper

#### Scenario: Executor is never warmed
- **WHEN** a coordinator will reuse a `budget-executor`
- **THEN** it sends no `warm-up` to it
