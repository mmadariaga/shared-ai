# remove-caveman-from-instructions Specification

## Purpose

TBD - this spec was authored as a change delta and never merged into the main tree, so its requirements were invisible to validate, list, and archive. Summarize the capability here.

## Requirements
### Requirement: remember.md contains no caveman intensity bullet
`sai/policies/remember.md` SHALL NOT contain a bullet specifying caveman intensity or the `--full-caveman` flag behavior.

The line to remove is:
    - **Caveman intensity: lite** by default — override only when user explicitly passes `--full-caveman` or requests a higher level.

#### Scenario: remember.md read
- **WHEN** `sai/policies/remember.md` is read
- **THEN** no line contains "Caveman intensity"
- **THEN** no line contains "--full-caveman"

### Requirement: explore.md contains no caveman suspension block
`sai/commands/explore/instructions.md` SHALL NOT contain the caveman suspension behavior paragraph.

The block to remove is the sentence starting with "**Caveman suspension during crystallization output**" on line 21 (a single multi-sentence instruction block embedded in the crystallization rules).

#### Scenario: explore.md read
- **WHEN** `sai/commands/explore/instructions.md` is read
- **THEN** no line contains "Caveman suspension during crystallization output"
- **THEN** no line contains "--full-caveman" or "caveman mode" in the context of the crystallization output block
