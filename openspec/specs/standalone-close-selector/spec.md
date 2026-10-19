# standalone-close-selector Specification

## Purpose
TBD - created by archiving change review-standalone-direct-build-close. Update Purpose after archive.

## Requirements

### Requirement: Meta-Review Zero-Audit Branch Is Terminal

After a successful review and a legible triage parse, the `/sai-deep-review` composition coordinator SHALL own the zero-audit close and SHALL apply the findings round of `sai/commands/deep-review/findings-selection.md` with only the freshly regenerated `review.md`. Open fixable findings and open Questions SHALL receive the round, with no fix started before the user chooses to fix. When no report qualifies for the round, the composition SHALL print its pinned zero-audit literal unchanged and retain any warning the run produced. Using the final adapter's `terminal_navigation` SHALL select its presentation only. A missing `review.md` or no legible triage value SHALL take the Error close defined in `sai/commands/deep-review/command-bootstrap.md`, never a correction choice.

#### Scenario: Zero audits recommended with findings still present

- **WHEN** a successful `/sai-deep-review` run has a legible triage parse, recommends zero audits, and the freshly regenerated `review.md` still carries an open fixable finding or an open Question
- **THEN** the composition coordinator asks the findings round with `review.md` only, runs no audit, and starts no fix segment before the user chooses to fix

#### Scenario: Missing review content takes the Error close

- **WHEN** the review segment completes and `review.md` is missing or none of its three triage values is legible
- **THEN** the composition reports the gap, shows the changed files, and ends without a correction choice or a findings round
