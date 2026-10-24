# concurrent-audit-dispatch Specification

## Purpose

Defines the concurrent dispatch and sequential Result Loop processing model for audit segments in the `/sai-review` composition, including isolation of `needs_input` pauses and failure containment.

## Requirements

### Requirement: Soft-parallel audit dispatch with sequential Result Loop processing

When one or more audits activate, `/sai-deep-review` SHALL create their workers in one harness-native batch (several `Agent` calls in one turn on Claude Code, several `task` calls on opencode), each creation carrying only the ready prompt, and SHALL drive one cycle of `sai/commands/audit/coordinator.md` per worker. The workers SHALL run in parallel, while the coordinator SHALL handle their results one at a time in the fixed order security → performance → accessibility among the results that are ready. Each audit SHALL write a disjoint report, so concurrency is safe.

#### Scenario: Audits dispatch concurrently and settle in fixed order
- **WHEN** all three audits activate in one invocation
- **THEN** the coordinator SHALL create the three workers in one batch and SHALL handle their results one at a time in security → performance → accessibility order

### Requirement: A needs_input pauses only its own segment

An audit worker `question` that nothing in the change, its artifacts, or the repository answers and whose answer would change the report SHALL reach the user through the native picker and SHALL pause only that audit's cycle; the other cycles SHALL keep running. Several pending questions SHALL be asked one at a time in the fixed order. A question that the change or repository answers, or whose answer would not change the report, SHALL be answered by the coordinator and kept as an assumption for the close.

#### Scenario: One audit's question does not block siblings
- **WHEN** the security worker asks a question that nothing answers and whose answer would change its report, while performance and accessibility are also activated
- **THEN** only the security cycle SHALL wait for the user's answer, and the performance and accessibility cycles SHALL keep running

### Requirement: Audit failure or cancellation never aborts siblings

An audit that returns `failed`, or whose obstacle budget of 3 attempts is exhausted, SHALL NOT close the run, SHALL NOT escalate, SHALL NOT abort sibling audits, and SHALL NOT re-run the review segment. The coordinator SHALL record it as `failed` with its summary or last obstacle, commit nothing for it, keep its findings out of the Assessment pass, and show each audit's status in the close. This rule SHALL be stated in the Audits section of `sai/commands/deep-review/coordinator.md` as a difference from the standalone audit coordinator, whose exhausted budget escalates.

#### Scenario: One failed audit does not cancel the others
- **WHEN** the performance audit returns `failed` while security and accessibility are activated
- **THEN** the security and accessibility cycles SHALL continue to completion and the close SHALL show a status line for each audit

### Requirement: Verified audit reports are committed one at a time

While the audit workers run in parallel, the coordinator SHALL issue every `sai-state` call and every commit itself, one at a time, in the fixed order security, performance, accessibility, among the results that are ready, and SHALL commit each verified report alone, with only its own path, under the Commit rule of `sai/commands/audit/coordinator.md`. Each cycle SHALL keep its own `sai-state` session, keyed `{audit}-{name}`, which SHALL be closed when that cycle ends.

#### Scenario: Two reports verified in the same turn
- **WHEN** the security and performance reports both pass verification while their workers ran in parallel
- **THEN** the coordinator commits the security report alone and then the performance report alone, with no shared commit
