# security-phase-coordinator Specification

## Purpose
TBD - created by syncing change sai-6-security-coordinator-worker-split. Update Purpose after archive.

## Requirements

### Requirement: Security audits run through the shared audit coordinator

No per-audit security coordinator SHALL exist: `sai/commands/security/coordinator.md` and `sai/commands/security/command-bootstrap.md` SHALL be absent and SHALL NOT be projected by the installer. The Claude Code and opencode `/sai-5-security` entrypoints and the security audit cycle of `/sai-deep-review` SHALL both run through the shared audit coordinator `sai/commands/audit/coordinator.md` with the audit `security`, which creates `sai-5-security-worker` through its binding.

#### Scenario: Direct security run uses the shared coordinator

- **WHEN** `/sai-5-security {name}` is invoked on Claude Code or opencode
- **THEN** the wrapper loads the shared audit coordinator with `command_name: security`, and no per-audit security coordinator or command bootstrap is fetched

#### Scenario: Deep-review security audit uses the shared coordinator

- **WHEN** `/sai-deep-review` activates the security audit
- **THEN** it runs one cycle of the shared audit coordinator for security, and no per-audit security coordinator is fetched
