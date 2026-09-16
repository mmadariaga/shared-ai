# guard-remediation Specification

## Purpose
Define the scoped `Bash(git reset:*)` grant the planning and audit coordinators use for the mixed `git reset <guard_base>` remediation after a guard violation, and how that closed grant is recorded.

## Requirements

### Requirement: Scoped mixed reset remediation execution

The planning and audit coordinators SHALL be permitted the scoped Bash(git reset:*) grant for exactly git reset <guard_base> mixed after a guard violation, and SHALL never use --hard, --soft, --keep, checkout, or branch operations under that grant.

#### Scenario: violation remediated with mixed reset

- **WHEN** a guard verify reports a violation for the window
- **THEN** the coordinator runs exactly git reset <guard_base> mixed, prints one incident line, and continues the route

### Requirement: Closed scoped grant recording

The permissions policy SHALL record the remediation as exactly three node tools in both roots plus the one scoped remediation grant, and SHALL permit no other node invocation and no unscoped Bash on those wrappers.

#### Scenario: wrapper scope stays closed

- **WHEN** a planning or audit wrapper declares allowed-tools
- **THEN** it carries validator plus guard plus store node grants in both roots plus Bash(git reset:*) and no unscoped Bash grant
