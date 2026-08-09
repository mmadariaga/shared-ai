# fetch-existence-check-before-read Specification

## Purpose
TBD

## Requirements

### Requirement: Skills path resolution unchanged

`Fetch @skills/<name>/SKILL.md` SHALL continue to invoke the `skill` tool with skill name `<name>`. The existence-check-before-read behavior SHALL NOT apply to skills paths.

#### Scenario: skills path triggers skill tool
- **WHEN** `Fetch @skills/budget/SKILL.md` is encountered
- **THEN** the `skill` tool is invoked with name `budget`, no glob/LS check is performed
