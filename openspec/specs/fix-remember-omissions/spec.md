## ADDED Requirements

### Requirement: opencode-sai-5-remember-fetch
`commands/opencode/sai-5-review.md` SHALL contain a `Fetch @~/.config/opencode/sai/instructions/remember.md` line.

#### Scenario: remember.md line present
- **WHEN** `commands/opencode/sai-5-review.md` is read
- **THEN** it contains exactly one line: `Fetch @~/.config/opencode/sai/instructions/remember.md`

### Requirement: opencode-sai-6-remember-fetch
`commands/opencode/sai-6-security.md` SHALL contain a `Fetch @~/.config/opencode/sai/instructions/remember.md` line.

#### Scenario: remember.md line present
- **WHEN** `commands/opencode/sai-6-security.md` is read
- **THEN** it contains exactly one line: `Fetch @~/.config/opencode/sai/instructions/remember.md`

### Requirement: opencode-sai-7-remember-fetch
`commands/opencode/sai-7-performance.md` SHALL contain a `Fetch @~/.config/opencode/sai/instructions/remember.md` line.

#### Scenario: remember.md line present
- **WHEN** `commands/opencode/sai-7-performance.md` is read
- **THEN** it contains exactly one line: `Fetch @~/.config/opencode/sai/instructions/remember.md`

### Requirement: opencode-sai-8-remember-fetch
`commands/opencode/sai-8-accessibility.md` SHALL contain a `Fetch @~/.config/opencode/sai/instructions/remember.md` line.

#### Scenario: remember.md line present
- **WHEN** `commands/opencode/sai-8-accessibility.md` is read
- **THEN** it contains exactly one line: `Fetch @~/.config/opencode/sai/instructions/remember.md`

### Requirement: remember-position-parity
In each of the four restored files, the `remember.md` fetch SHALL appear as the last substantive line of the file, matching the position in the corresponding claude wrapper.

#### Scenario: position parity for sai-5
- **WHEN** `commands/opencode/sai-5-review.md` is read
- **THEN** `Fetch @~/.config/opencode/sai/instructions/remember.md` is the last line, mirroring the position in `claude/commands/sai-5-review.md`

#### Scenario: position parity for sai-6
- **WHEN** `commands/opencode/sai-6-security.md` is read
- **THEN** `Fetch @~/.config/opencode/sai/instructions/remember.md` is the last line

#### Scenario: position parity for sai-7
- **WHEN** `commands/opencode/sai-7-performance.md` is read
- **THEN** `Fetch @~/.config/opencode/sai/instructions/remember.md` is the last line

#### Scenario: position parity for sai-8
- **WHEN** `commands/opencode/sai-8-accessibility.md` is read
- **THEN** `Fetch @~/.config/opencode/sai/instructions/remember.md` is the last line

### Requirement: no-other-opencode-remember-regressions
All other opencode numbered wrappers (sai-1 through sai-4) that already fetch remember.md SHALL continue to do so after this change.

#### Scenario: sai-1 through sai-4 unchanged
- **WHEN** `commands/opencode/sai-{1..4}-*.md` are read
- **THEN** each still contains `Fetch @~/.config/opencode/sai/instructions/remember.md`
