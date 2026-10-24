# standalone-close-selector Specification

## Purpose
TBD - created by archiving change review-standalone-direct-build-close. Update Purpose after archive.

## Requirements

### Requirement: Zero-audit run takes review.md alone into the Assessment pass

After a completed review and a legible triage parse that activates no audit, the `/sai-deep-review` coordinator SHALL own the zero-audit close: it SHALL run no audit, SHALL run the Assessment pass and the fix segment over `review.md` alone when it holds a fixable finding, and SHALL ask no findings round. A missing `review.md` or no legible triage value SHALL take the Error close defined in `sai/commands/deep-review/coordinator.md`, with no Assessment pass and no fix segment.

#### Scenario: Zero audits recommended with findings still present

- **WHEN** a `/sai-deep-review` run has a legible triage parse, recommends zero audits, and the regenerated `review.md` carries an open fixable finding
- **THEN** the coordinator runs no audit, runs the Assessment pass over `review.md` only, and asks the user no selection question

#### Scenario: Missing review content takes the Error close

- **WHEN** the review segment completes and `review.md` is missing or none of its three triage values is legible
- **THEN** the coordinator prints the gap and ends without an Assessment pass, a fix segment, or a closing line
