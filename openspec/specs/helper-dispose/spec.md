# helper-dispose Specification

## Purpose
TBD - created by archiving change subagent-cache-warming-core. Update Purpose after archive.

## Requirements

### Requirement: Helpers are disposed after their result

A one-shot helper's task message SHALL carry no warming switch. The budget executor SHALL never receive the switch and SHALL never arm. A one-shot helper (`budget-subagent`, `budget-executor`) SHALL be disposed by its dispatcher after its result, under `sai/policies/worker-lifecycle.md`, whatever its latest `warming` diagnostic. A `budget-subagent` that a card continues with further messages SHALL receive the warming switch of `sai/policies/cache-warming.md` at the end of each message. The executor policy (`sai/policies/executor-agent.md`) SHALL carry `warming: false` beside the reference of every saved report, and the task subagent policy (`sai/policies/budget-agent.md`) SHALL carry `warming: true` or `warming: false` beside the reference of every final message, `true` only when the subagent received the switch and armed its wait. The budget executor and budget subagent skills on both harnesses SHALL fetch `@sai/policies/cache-warming.md` and `@sai/policies/worker-lifecycle.md` and state that the coordinator disposes the helper after its result.

#### Scenario: Executor result read
- **WHEN** a coordinator reads an executor's result
- **THEN** the result declares `warming: false` and the coordinator disposes the executor after reading it

#### Scenario: Helper of a worker
- **WHEN** a worker that cannot dispose dispatches its own helper
- **THEN** it sends no warming switch, so the helper never arms

#### Scenario: Task subagent disposed without a warm-up
- **WHEN** a coordinator reads the result of a one-shot `budget-subagent`
- **THEN** the coordinator disposes the subagent after its result, and no `warm-up` order exists to send
