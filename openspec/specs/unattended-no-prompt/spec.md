# unattended-no-prompt Specification

## Purpose
TBD - created by archiving change shared-tool-execution-permissions. Update Purpose after archive.
## Requirements
### Requirement: No Interactive Prompt Dependency

No unattended route SHALL depend on an interactive permission prompt.

#### Scenario: Unattended run without prompts
- **WHEN** a Direct Build unattended route runs on either harness
- **THEN** it completes its tool invocations without blocking on an interactive prompt

### Requirement: Unresolvable Tool Stop

An unresolvable tool or store/guard failure SHALL stop the phase naming the tried candidates, and validation SHALL never be skipped nor continued as a prose fallback.

#### Scenario: Missing tool stops loudly
- **WHEN** no tool candidate exists
- **THEN** the phase stops naming the tried candidates instead of continuing as if checks passed

