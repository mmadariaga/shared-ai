# ladder-discard-logging Specification

## Purpose

Makes the explorer's research-ladder decisions observable: every skipped ladder level is reported with a plain-English reason in the `ladder_discards` field of the structured response.

## Requirements

### Requirement: Explorer emits ladder_discards field for audit trail

The explorer SHALL emit per-segment ladder_discards even when the caller's output contract omits it. This field SHALL remain the sole research-availability signal to the principal, without a principal probe. Each entry SHALL include level, reason, and unavailable, excluded, inapplicable, or instruction-error classification. An unavailable entry SHALL additionally identify tool, granted true, applicable true, and concrete remediation. Permission rejection SHALL be an access or instruction incompatibility rather than environmental absence. Consumers SHALL retain all entries internally and present only eligible environmental absences under the shared notice rule.

#### Scenario: Codegraph MCP tool not available
- **WHEN** granted applicable CodeGraph MCP is absent from the explorer session
- **THEN** a classified unavailable entry with enabling guidance is the sole detection signal and may produce an eligible consumer notice without a principal probe

#### Scenario: Codegraph CLI binary not available
- **WHEN** granted applicable shell access exists but the CodeGraph binary is absent from PATH
- **THEN** a classified unavailable entry supplies installation and PATH guidance without a principal probe

#### Scenario: Shell unavailable, affects both codegraph CLI and level 2
- **WHEN** granted applicable shell support is absent
- **THEN** affected levels emit classified absence entries with shell-enabling guidance without a principal probe

#### Scenario: Git not on PATH despite shell available
- **WHEN** granted applicable shell is available but Git is absent from PATH
- **THEN** a classified absence entry supplies Git installation and PATH guidance without a principal probe

#### Scenario: Not a git repository
- **WHEN** shell and Git are available but the working directory is not a Git repository
- **THEN** an inapplicable entry records that state without presenting it as missing Git or running a principal probe

#### Scenario: Caller prescribed a tool despite the ladder
- **WHEN** a caller names a research tool contrary to the ladder
- **THEN** the ladder governs and the prescribed-tool instruction-error diagnostic remains internal without a principal probe

#### Scenario: Shell operation other than git grep or codegraph is requested
- **WHEN** a caller requests another shell purpose
- **THEN** the explorer refuses execution and emits an internal instruction-error diagnostic without a principal probe

#### Scenario: Discard logging emitted per execution segment
- **WHEN** the explorer continues into another segment under its forty-call ceiling
- **THEN** that segment emits its own ladder_discards as the sole availability signal without a principal probe

#### Scenario: Field emitted even when output contract omits it
- **WHEN** the caller's output contract omits ladder_discards
- **THEN** the explorer still emits it and consumers apply the same eligible-notice filter without a principal probe

### Requirement: Consumers filter missing-tool notices deterministically

Explore and Design SHALL present once per result only unavailable entries with granted and applicable true values and non-empty remediation. Presentation SHALL use the shared notice rule and deterministic tool-access helper. Other diagnostics SHALL remain internal. Legacy reason-only entries SHALL NOT be inferred to describe environmental absence.

#### Scenario: Mixed diagnostics produce only eligible notices
- **WHEN** a result contains eligible absences, exclusions, inapplicable levels, instruction errors, and legacy entries
- **THEN** only eligible absences appear as Research tool unavailable notices with remediation in input order
