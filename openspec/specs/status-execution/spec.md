# status-execution Specification

## Purpose
Define the node-scoped execution surface the `sai-status` wrapper permits — `status.js` panel and bulk plus change-picker resolution in both roots — alongside its existing scoped `Bash(openspec:*)` grant.

## Requirements

### Requirement: Status panel and bulk execution

The status wrapper SHALL permit node-scoped status.js panel and bulk execution in both roots with --json --cwd, SHALL retain the existing scoped Bash(openspec:*) grant, and SHALL present the returned panel or table.

#### Scenario: status runs its decider

- **WHEN** the status flow resolves to panel or bulk mode
- **THEN** the wrapper runs status.js panel <change> or bulk with --json --cwd and presents the returned panel or table

### Requirement: Change picker resolution execution

The status wrapper SHALL permit node-scoped change-picker.js resolve execution in both roots with --bulk-option --json --cwd for change resolution.

#### Scenario: status resolves its change

- **WHEN** the status flow needs change resolution
- **THEN** the wrapper runs change-picker.js resolve with --bulk-option --json --cwd and uses the resolved name
