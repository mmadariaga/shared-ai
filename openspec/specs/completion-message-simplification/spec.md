# completion-message-simplification Specification

## Purpose
TBD - created by archiving change simplify-existing-implementation. Update Purpose after archive.

## Requirements

### Requirement: sai-5 through sai-8 completion stop messages SHALL NOT include a change path suffix

The completion message in `sai/commands/review/coordinator.md` and in the shared audit coordinator `sai/commands/audit/coordinator.md`, which serves the security, performance, and accessibility audits, SHALL end with the command result noun only (e.g., `"Review done."`, `"{Audit} audit done."`) and SHALL NOT append `in openspec/changes/{name}/` or any path reference.

#### Scenario: sai-5-review completion message
- **WHEN** the command catalog is read
- **THEN** no `/sai-5-review` command exists, and `/sai-4-review` prints exactly: `"Review done."` — no path suffix

#### Scenario: sai-6-security completion message
- **WHEN** the security audit completes standalone
- **THEN** the agent prints exactly: `"Security audit done."` — no path suffix

#### Scenario: sai-7-performance completion message
- **WHEN** the performance audit completes standalone
- **THEN** the agent prints exactly: `"Performance audit done."` — no path suffix

#### Scenario: sai-8-accessibility completion message
- **WHEN** the accessibility audit completes standalone
- **THEN** the agent prints exactly: `"Accessibility audit done."` — no path suffix
