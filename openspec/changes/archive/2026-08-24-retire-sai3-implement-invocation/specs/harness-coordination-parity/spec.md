## MODIFIED Requirements

### Requirement: Grouped routed command surfaces

Routed coordinator and worker cards SHALL be grouped under `sai/commands/{name}/`, and a retained invocation body SHALL be present only when that routed phase uses a separate invocation card. The implementation phase SHALL use its coordinator-worker-step route without `sai/commands/implement/invocation.md`.

#### Scenario: Harness projections retain the active implementation boundary

- **WHEN** Claude Code and opencode implementation projections are inspected
- **THEN** both harnesses expose the same active coordinator-worker route and omit the retired implementation invocation projection.
