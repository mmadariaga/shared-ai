# review-round-summaries Specification

## Purpose
Give every `/sai-plan` review round file a fixed findings tally, so the found and pending counts of a segment can be read without parsing per-finding states.

## Requirements

### Requirement: Every plan review round file ends with a Summary line of its open findings

The segment cycle (`sai/commands/plan/cycle.md`) SHALL end every round file `reviews/{segment}-round-{k}.md` in the run directory with the line `Summary: High=<n> Medium=<n> Low=<n>`, the base form of the summary tally in `sai/policies/artifact-review-contract.md`. The counts SHALL be the findings whose state in that file is `open`; `fixed` findings and `scope` observations SHALL NOT be counted.

#### Scenario: a round with open and fixed findings
- **WHEN** a round file lists one `open` High finding, one `fixed` Medium finding, and one `scope` observation
- **THEN** the file ends with `Summary: High=1 Medium=0 Low=0`

#### Scenario: a round that leaves nothing open
- **WHEN** a review pass leaves no finding open
- **THEN** its round file ends with `Summary: High=0 Medium=0 Low=0`

### Requirement: Every Direct Build fix-loop round file ends with a Summary line of its open findings

Each Direct Build functional fix-loop round file `reviews/implement-round-{k}.md` in the slice's run directory SHALL end with the line `Summary: High=<n> Medium=<n> Low=<n>`, the base form of the summary tally in `sai/policies/artifact-review-contract.md`. The counts SHALL be the findings whose state in that file is `open`; `fixed` findings and `scope` observations SHALL NOT be counted.

#### Scenario: a Direct Build round with open and fixed findings
- **WHEN** a Direct Build round file lists one `open` High finding, one `fixed` Medium finding, and one `scope` observation
- **THEN** the file ends with `Summary: High=1 Medium=0 Low=0`

#### Scenario: a Direct Build round that leaves nothing open
- **WHEN** a Direct Build review pass leaves no finding open
- **THEN** its round file ends with `Summary: High=0 Medium=0 Low=0`
