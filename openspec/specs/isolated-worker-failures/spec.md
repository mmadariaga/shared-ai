# isolated-worker-failures Specification

## Purpose
Keep category-planning failures isolated so valid concurrent work survives and incomplete results cannot replace the final plan.

## Requirements

### Requirement: Independent concurrent result collection

The coordinator SHALL retain a separate handle, status, input history, and recovery ledger for each worker. A failed, cancelled, input-paused, or transport-lost worker SHALL not cancel siblings. The coordinator SHALL collect sibling terminal results and retain valid parts before reporting unresolved missing work.

#### Scenario: One worker fails

- **WHEN** one category worker fails while siblings are running
- **THEN** siblings continue and their valid results are retained, while final publication remains blocked.

#### Scenario: One worker requests input

- **WHEN** a worker returns needs_input
- **THEN** only that worker pauses and its answer is forwarded unchanged through its captured continuation.

### Requirement: Assignment-bounded recovery

Existing bounded recovery and at-most-one replacement rules SHALL apply independently to each worker. Recovery SHALL use the original complete task, resolved name, exact input history, current run identity, assignment, and durable reconstruction instruction. Its write surface SHALL be only the worker's assigned part. Recovery SHALL not reroute work, substitute a model, or grant new budgets through replacement.

#### Scenario: Same-worker continuation is lost

- **WHEN** a captured worker cannot resume and complete reconstruction evidence is available
- **THEN** bounded replacement reconstructs the same assignment and run without receiving artifact contents or another worker's journal.

#### Scenario: Failure remains unresolved

- **WHEN** collection and eligible recovery leave failed, cancelled, missing, or invalid parts
- **THEN** the coordinator reports the agent, missing Steps, blocker, and retained paths without changing the previous final plan, claiming completion, or activating apply.
