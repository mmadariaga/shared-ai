# validator-tool-paths Specification

## Purpose
TBD - created by archiving change shared-tool-resolution-rule. Update Purpose after archive.
## Requirements
### Requirement: Validator tool path resolution

The system SHALL resolve `worker-report-validator.js` per the shared tool-resolution rule on every Result Loop turn (first existing candidate per harness, copied verbatim, with the opencode XDG fallback only when neither verbatim candidate exists) and SHALL invoke `node <tool-path> validate --kind <kind>` with the payload on stdin. A missing validator SHALL never skip validation: the system SHALL name the tried candidates and stop.

#### Scenario: Validate every turn

- **WHEN** the Result Loop processes a terminal, notice, progress, or extension payload
- **THEN** it resolves and invokes the validator copy without skipping validation

