# shared-tool-resolution Specification

## Purpose
Keep SAI tool-copy selection deterministic across Claude Code and opencode while preserving each consuming gate's declared missing-tool behavior.
## Requirements
### Requirement: Shared tool resolution order

The system SHALL resolve every `sai/tools/*.js` copy by taking the first existing candidate per harness, copied verbatim and never composed from a root string, with the opencode XDG fallback only when neither verbatim candidate exists. The first existing copy wins and defines the version. If no candidate exists the system SHALL name the tried candidates and stop with no prose fallback, except when the consuming instruction explicitly declares its gate optional on a missing tool; then only that gate is skipped, without replacing the check in prose.

#### Scenario: Resolve tool copy

- **WHEN** a command needs `sai/tools/<name>`
- **THEN** it uses the first existing per-harness candidate verbatim and stops with named candidates when none exists, unless the consuming instruction explicitly declares the missing-tool exception for that gate

#### Scenario: Optional gate declares a missing-tool exception

- **WHEN** an instruction explicitly permits skipping its named gate if no tool candidate exists
- **THEN** it names the tried candidates, skips only that gate, and performs no prose replacement check

### Requirement: Byte-identical invocation after resolution

The system SHALL keep each tool's own accepted flag set unchanged after resolution and SHALL NOT change invocation semantics beyond path resolution, so one whitelist entry per root covers each form.

#### Scenario: Invoke resolved copy

- **WHEN** a resolved tool copy is invoked
- **THEN** the invocation is byte-identical apart from the resolved path
