# validator-tool-paths Specification

## Purpose
TBD - created by archiving change shared-tool-resolution-rule. Update Purpose after archive.

## Requirements

### Requirement: Validator tool path resolution

The system SHALL resolve `worker-report-validator.js` per the shared tool-resolution rule on every Result Loop turn that runs a separate `validate` call (first existing candidate per harness, copied verbatim, with the opencode XDG fallback only when neither verbatim candidate exists). It SHALL invoke `node <tool-path> validate --kind <kind>` with the payload on stdin except for full Direct Build, which SHALL instead pass `--report-dir <authorized-dir> --report-file <path> --report-hash <sha256> --json` without copying report contents. On a `step_machine` progress turn, the `sai-state` progress emit SHALL load the validator module itself, relative to the resolved `sai-state.js`, so no separate validator resolution is needed. A missing validator SHALL never skip validation. The system SHALL name the tried candidates and stop. When the progress emit cannot load the module, it exits 2 naming the tried paths and the coordinator stops the same way.

#### Scenario: Validate every turn
- **WHEN** the Result Loop processes a terminal, notice, progress, or extension payload
- **THEN** it validates the payload without skipping validation, through the resolved validator copy or, for a `step_machine` progress payload, through the progress emit's own validator load

#### Scenario: Full Direct Build invokes file mode
- **WHEN** a full Direct Build worker returns its private report reference after ready
- **THEN** the coordinator invokes the resolved validator with the authorized directory, file, and hash arguments rather than submitting report text on stdin
