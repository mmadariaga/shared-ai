# harness-universality Specification

## Purpose

Defines the harness parity rule for shared SAI behavior.

## Requirements

### Requirement: Harness-specific adapter carve-out
The mirror discipline SHALL apply to this cross-cutting envelope migration because the same behavior is meaningful in Claude Code and opencode. Removing `wrapper_echo_value` SHALL be implemented in both supported harness projections and their shared neutral contracts; it SHALL not be classified as a one-harness adapter exception.

#### Scenario: both supported harnesses are mirrored

- **WHEN** the envelope migration is applied
- **THEN** the Claude Code and opencode wrapper and adapter surfaces are updated together
- **AND** no harness-specific carve-out is claimed for this shared transport change
