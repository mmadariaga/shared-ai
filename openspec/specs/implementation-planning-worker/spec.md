# implementation-planning-worker — Spec

## Purpose

TBD - this spec was authored as a change delta and never merged into the main tree, so its requirements were invisible to validate, list, and archive. Summarize the capability here.

## Requirements

### Requirement: Implementation phase policy isolation

Implementation-only planning rules SHALL remain in the implementation step library, worker card, and caller-neutral planning policies, separate from design-specific behavior. The coordinator SHALL own change resolution, common analysis, documentation, authorization, rerun handling, audit ingestion, ADR/DDR work, integration, and final verification. Category workers SHALL apply the common baseline and plan-generation Step rules to all assigned Steps in one complete task, including RED -> GREEN, STOP & COMMIT, interface conformance, and preservation rules. They SHALL write only their assigned temporary part and SHALL not run mutating git commands or emit progress events.

#### Scenario: Implementation-only rule changes

- **WHEN** a maintainer changes an implementation planning rule
- **THEN** the rule remains in the implementation library, worker card, or neutral planning policy without transferring implementation-specific execution rules to the shared worker lifecycle or design worker.

#### Scenario: Worker returns phase progress

- **WHEN** a category worker needs input or reaches a terminal outcome
- **THEN** it returns closed lifecycle metadata only, emits no progress event, and leaves complete technical content in its assigned temporary part rather than implementation.md or its payload.

#### Scenario: Replacement worker reconstructs planning state

- **WHEN** a replacement receives the original complete task, resolved name, exact input history, assignment, run identity, and durable reconstruction instruction
- **THEN** it independently verifies run.json, current inputs, and its assigned part, replays only recorded decisions, and starts an empty journal without inheriting the coordinator's changed-file union or an active-step pointer.
