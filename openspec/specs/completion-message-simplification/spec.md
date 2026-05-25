# completion-message-simplification Specification

## Purpose
TBD - created by archiving change simplify-existing-implementation. Update Purpose after archive.
## Requirements
### Requirement: sai-5 through sai-8 completion stop messages SHALL NOT include a change path suffix

The MANDATORY STOP completion message in `sai/commands/sai-5-review.md`, `sai/commands/sai-6-security.md`, `sai/commands/sai-7-performance.md`, and `sai/commands/sai-8-accessibility.md` SHALL end with the command result noun only (e.g., `"Review done."`) and SHALL NOT append `in openspec/changes/{name}/` or any path reference.

#### Scenario: sai-5-review completion message
- **WHEN** `/sai-5-review` completes
- **THEN** the agent prints exactly: `"Review done."` — no path suffix

#### Scenario: sai-6-security completion message
- **WHEN** `/sai-6-security` completes
- **THEN** the agent prints exactly: `"Security audit done."` — no path suffix

#### Scenario: sai-7-performance completion message
- **WHEN** `/sai-7-performance` completes
- **THEN** the agent prints exactly: `"Performance audit done."` — no path suffix

#### Scenario: sai-8-accessibility completion message
- **WHEN** `/sai-8-accessibility` completes
- **THEN** the agent prints exactly: `"Accessibility audit done."` — no path suffix

