# direct-build-terminal-format Specification

## Purpose
TBD - created by archiving change direct-build-report-spacing. Update Purpose after archive.

## Requirements

### Requirement: Inter-section blank-line separation

The system SHALL render the full Direct Build terminal report using the shared implementation closing structure with exactly one blank line between adjacent report sections, with no double blank lines and no end-of-line spaces. The common section order SHALL replace the former Outcome, Changes, Verification, and Incidents top-level sequence; existing spacing discipline SHALL remain unchanged.

#### Scenario: Adjacent sections separated

- **WHEN** the full Direct Build terminal report presents the shared closing sections
- **THEN** a single blank line separates each adjacent pair with no extra blank lines

#### Scenario: Separators carry no trailing spaces

- **WHEN** the separator blank lines are emitted
- **THEN** they contain no spaces or tabs

#### Scenario: Partial or failed closes keep spacing

- **WHEN** the close is partial or failed and What you need to know describes completed versus remaining work
- **THEN** the same single blank-line separation applies

### Requirement: Single trailing newline

The system SHALL end the full Direct Build terminal report block with a single trailing newline after its final Execution details section. A separate existing stop-options decision SHALL remain outside that report block.

#### Scenario: Block ends cleanly

- **WHEN** the Execution details section completes
- **THEN** the block ends with one trailing newline
