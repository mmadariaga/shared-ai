# review-direct-build-close Specification

## Purpose
TBD - created by archiving change review-direct-build-option. Update Purpose after archive.

## Requirements

### Requirement: Review Direct Build Close Selector
The sai-review close SHALL offer a Direct Build lane only when review.md or an activated audit reports remaining findings, and SHALL close with the normal terminal when clean.
#### Scenario: Findings remain
- **WHEN** review or an activated audit reports a remaining finding
- **THEN** the close presents Direct Build versus running sai-build manually and dispatches only on explicit selection

### Requirement: Findings-Scoped Fix Input
The Direct Build input SHALL consist of review.md plus security, performance, and accessibility findings only when each audit was activated and regenerated in the same run.
#### Scenario: Non-recommended audit excluded
- **WHEN** an audit was not recommended in the same run
- **THEN** its findings are never touched nor regenerated as fix input

### Requirement: Single-Commit Local Close
The close SHALL stage only fix-union paths and perform exactly one pre-authorized local commit without push, amend, or unrelated paths.
#### Scenario: Path-scoped commit
- **WHEN** the fix converges within the round cap
- **THEN** only touched build paths are staged and one local commit is created
