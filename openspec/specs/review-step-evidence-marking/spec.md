# Review Step Evidence Marking Specification

## Purpose

TBD — placeholder purpose. Define when the `review` progress step is marked and the evidence-marked carve-out it establishes for coordinator reconciliation.

## Requirements

### Requirement: progress-marks-are-monotonic

A progress mark, once made in an invocation, SHALL NOT be reverted, cleared, or re-opened for the remainder of that invocation. Progress events only add step ids to the marked set; no event, feedback turn, artifact edit, or later review round SHALL remove one. The spec and design plans contain no `review` step, so monotonicity applies to their remaining steps.

#### Scenario: a later feedback edit does not revert the review mark

- **WHEN** the user supplies feedback that changes an artifact after a step of the spec or design plan was already marked
- **THEN** that already-marked step SHALL remain marked, and no `review` step exists in either plan to be marked or reverted

#### Scenario: a later pass with High findings does not revert the review mark

- **WHEN** a later review round over the edited artifacts reports at least one `High` finding after a step was already marked
- **THEN** that already-marked step SHALL remain marked, because marks are monotonic within an invocation

#### Scenario: a consistency re-edit does not revert an earlier artifact step

- **WHEN** writing `specs/**` forces a consistency re-edit of `proposal.md` after the `proposal` step was marked
- **THEN** the `proposal` step SHALL remain marked and the path SHALL simply appear in the `specs` batch's `changed_files`
