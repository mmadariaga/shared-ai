# explore-instruction-numbering-cleanup Specification

## Purpose
TBD - created by archiving change explore-instructions-renumber-cleanup. Update Purpose after archive.
## Requirements
### Requirement: Continuous file-local numbering

The explore instructions file SHALL present items 1 through 11 continuously with item 2a renumbered to 3 and middle blocks numbered 4 through 9 with no gaps and no paragraph reorder.

#### Scenario: Renumbered file reads continuously

- **WHEN** the explore instructions file is read
- **THEN** items 1 through 11 appear in order with no 2a gap and no missing 10

### Requirement: Restored close summary pointer

The explore instructions file SHALL restore item 10 as a close summary that points to sai/commands/explore/steps/ for the full Plan - Unattended, Direct Build - Unattended and Manual contract while item 11 remains the Idea Progress List marker.

#### Scenario: Item 10 denotes the close

- **WHEN** the crystallization close is invoked
- **THEN** item 10 in the file and the externally cited item 10 denote the same close

### Requirement: Aligned ADR citation and preservation test

The ADR 0158a Context SHALL cite sai/commands/explore/steps/crystallization-protocol.md for items 5, 6 and 7 and item 10 of the instructions file for the Manual branch, and the contract-preservation test SHALL allow the 2a renumber prefix.

#### Scenario: Citations match restored numbering

- **WHEN** the ADR Context and preservation test are inspected
- **THEN** the ADR cites the steps protocol file and the test permits the renumber

