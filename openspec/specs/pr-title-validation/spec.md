# pr-title-validation Specification

## Purpose
TBD - created by archiving change pr-deterministic-extraction. Update Purpose after archive.
## Requirements
### Requirement: pr-title-validation enforces pull request title format rules

The pr-title-validation check SHALL enforce four rules on pull request title text: length MUST NOT exceed 70 characters, a Conventional Commits type/scope prefix MUST be present, emoji characters MUST NOT appear, and a trailing period MUST NOT be present. The check SHALL be callable as the `pr-title-rules` subcommand of `sai/tools/lint.js` and exported as the `checkPrTitleRules` function for programmatic use.

#### Scenario: validates via CLI subcommand
- **WHEN** the pr-title-rules check is invoked as `lint.js pr-title-rules <title-text>` 
- **THEN** it validates the title against all four format rules and exits 0 on conformance, exit 1 with findings when violations are detected
- **AND** findings are reported line-by-line on stdout

#### Scenario: validates via exported function
- **WHEN** `checkPrTitleRules(titleString)` is called as an imported function
- **THEN** it validates the title and returns an array of violation objects (empty array if no violations)
- **AND** each violation object contains file (the string "pull request"), line, problem (violation code such as "TITLE_TOO_LONG", "INVALID_FORMAT", "CONTAINS_EMOJI", "TRAILING_PERIOD"), and detail (human-readable description)

#### Scenario: detects all four violation types
- **WHEN** pr-title-validation checks a malformed title
- **THEN** it reports all applicable violations: length > 70 characters, absence of type prefix, presence of emoji, or trailing period
- **AND** exit 0 if compliant, exit 1 if any violation is found

#### Scenario: respects Conventional Commits prefix requirement
- **WHEN** a title lacks a Conventional Commits type/scope (type: scope or type: format)
- **THEN** it reports INVALID_FORMAT violation
- **AND** the check rejects the title

