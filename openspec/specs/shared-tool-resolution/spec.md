# shared-tool-resolution Specification

## Purpose
TBD - created by archiving change shared-tool-resolution-rule. Update Purpose after archive.
## Requirements
### Requirement: Shared tool resolution order

The system SHALL resolve every `sai/tools/*.js` copy by taking the first existing candidate per harness, copied verbatim and never composed from a root string, with the opencode XDG fallback only when neither verbatim candidate exists. The first existing copy wins and defines the version. If no candidate exists the system SHALL name the tried candidates and stop with no prose fallback.

#### Scenario: Resolve tool copy

- **WHEN** a command needs `sai/tools/<name>`
- **THEN** it uses the first existing per-harness candidate verbatim and stops with named candidates when none exists

### Requirement: Byte-identical invocation after resolution

The system SHALL keep each tool's own accepted flag set unchanged after resolution and SHALL NOT change invocation semantics beyond path resolution, so one whitelist entry per root covers each form.

#### Scenario: Invoke resolved copy

- **WHEN** a resolved tool copy is invoked
- **THEN** the invocation is byte-identical apart from the resolved path

