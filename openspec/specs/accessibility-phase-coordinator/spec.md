# accessibility-phase-coordinator Specification

## Purpose
TBD

## Requirements

### Requirement: Accessibility audits run through the shared audit coordinator

No per-audit accessibility coordinator SHALL exist: `sai/commands/accessibility/coordinator.md` and `sai/commands/accessibility/command-bootstrap.md` SHALL be absent and SHALL NOT be projected by the installer. The Claude Code and opencode `/sai-7-accessibility` entrypoints and the accessibility audit cycle of `/sai-deep-review` SHALL both run through the shared audit coordinator `sai/commands/audit/coordinator.md` with the audit `accessibility`, which creates `sai-7-accessibility-worker` through its binding.

#### Scenario: Direct accessibility run uses the shared coordinator

- **WHEN** `/sai-7-accessibility {name}` is invoked on Claude Code or opencode
- **THEN** the wrapper loads the shared audit coordinator with `command_name: accessibility`, and no per-audit accessibility coordinator or command bootstrap is fetched

#### Scenario: Deep-review accessibility audit uses the shared coordinator

- **WHEN** `/sai-deep-review` activates the accessibility audit
- **THEN** it runs one cycle of the shared audit coordinator for accessibility, and no per-audit accessibility coordinator is fetched
