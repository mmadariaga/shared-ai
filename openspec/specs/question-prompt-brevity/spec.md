# question-prompt-brevity Specification

## Purpose
TBD - created by archiving change question-prompt-brevity-rule. Update Purpose after archive.
## Requirements
### Requirement: Mandatory split of decision context from picker call
The picker implementation SHALL place everything except options in preceding plain text and SHALL hold only the ultra-synthesized summary question plus options in the question tool.
#### Scenario: Split presentation keeps tool minimal
- **WHEN** a closed-choice prompt is emitted
- **THEN** preceding plain text carries full context and the tool carries only the summary question plus options

### Requirement: Operational limits for summary question and options
The summary question SHALL stay within about 200 characters and each option SHALL stay within about 100 characters measured on rendered text without markup, and any excess SHALL move to preceding plain text.
#### Scenario: Excess context moves to plain text
- **WHEN** a summary question or option would exceed its operational limit
- **THEN** the excess is placed in preceding plain text and the tool stays within limits

### Requirement: Self-sufficient preceding plain text
Preceding plain text SHALL give all necessary context to understand the question and options with no inference from the tool.
#### Scenario: Reader decides from preceding text alone
- **WHEN** a user reads only the preceding plain text
- **THEN** the user can understand the question and options without opening the picker

### Requirement: Universal application with no exemptions
The concise-format rule SHALL apply to every user-facing decision prompt including long and pinned prompts, which SHALL be rewritten to comply in the same change with no grace period.
#### Scenario: Pinned prompt complies without exemption
- **WHEN** a long or pinned prompt is inspected
- **THEN** it follows the split and limits with no exemption registry entry

### Requirement: Literal preservation under operational limits
Identifiers, paths, kebab change names, and literals SHALL stay verbatim with visual wrap allowed, and limits SHALL never justify truncation, abbreviation, or translation while option order and machine values stay unchanged.
#### Scenario: Limits preserve literals by wrapping
- **WHEN** a literal would strain an operational limit
- **THEN** the surface wraps the literal and preserves order and values unchanged

### Requirement: No-picker fallback preserves split semantics
Without a picker the surface SHALL render the same split in plain text with context first, then the summary question, then numbered options, with identical semantics.
#### Scenario: Plain-text fallback matches picker semantics
- **WHEN** no native picker is available
- **THEN** context, summary question, and numbered options render in plain text with identical meaning

### Requirement: Manual review verification without deterministic validator
The implementation SHALL be verified by manual review against the limits in this change with no new deterministic validator and lint left as future work.
#### Scenario: Reviewer checks limits by hand
- **WHEN** a rewritten prompt is reviewed
- **THEN** the reviewer confirms the summary and option limits by inspection without running a validator

