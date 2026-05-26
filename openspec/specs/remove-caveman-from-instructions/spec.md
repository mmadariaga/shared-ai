## ADDED Requirements

### Requirement: remember.md contains no caveman intensity bullet
`sai/instructions/remember.md` SHALL NOT contain a bullet specifying caveman intensity or the `--full-caveman` flag behavior.

The line to remove is:
    - **Caveman intensity: lite** by default — override only when user explicitly passes `--full-caveman` or requests a higher level.

#### Scenario: remember.md read
- **WHEN** `sai/instructions/remember.md` is read
- **THEN** no line contains "Caveman intensity"
- **THEN** no line contains "--full-caveman"

### Requirement: explore.md contains no caveman suspension block
`sai/instructions/explore.md` SHALL NOT contain the caveman suspension behavior paragraph.

The block to remove is the sentence starting with "**Caveman suspension during crystallization output**" on line 21 (a single multi-sentence instruction block embedded in the crystallization rules).

#### Scenario: explore.md read
- **WHEN** `sai/instructions/explore.md` is read
- **THEN** no line contains "Caveman suspension during crystallization output"
- **THEN** no line contains "--full-caveman" or "caveman mode" in the context of the crystallization output block
