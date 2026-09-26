# direct-build-terminal-format Specification

## Purpose
TBD - created by archiving change direct-build-report-spacing. Update Purpose after archive.

## Requirements

### Requirement: Inter-section blank-line separation
The system SHALL render the Direct Build terminal report with exactly one blank line between Outcome and Changes, between Changes and Verification, and between Verification and Incidents, with no double blank lines and no end-of-line spaces.

#### Scenario: Adjacent sections separated
- **WHEN** the terminal report presents Outcome, Changes, Verification, and Incidents
- **THEN** a single blank line separates each adjacent pair with no extra blank lines

#### Scenario: Separators carry no trailing spaces
- **WHEN** the separator blank lines are emitted
- **THEN** they contain no spaces or tabs

#### Scenario: Partial or failed closes keep spacing
- **WHEN** the close is partial or failed and Outcome describes completed versus remaining work
- **THEN** the same single blank-line separation applies

### Requirement: Single trailing newline
The system SHALL end the Direct Build terminal report block with a single trailing newline.

#### Scenario: Block ends cleanly
- **WHEN** the Incidents section completes
- **THEN** the block ends with one trailing newline
