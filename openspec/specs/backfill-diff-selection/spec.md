## ADDED Requirements

### Requirement: Diff source selected interactively at invocation
At the start of every `/sai-backfill` invocation, the command SHALL present the user with exactly three mutually exclusive options for selecting the diff to analyze, and SHALL NOT proceed to any subsequent step until the user selects one.

Options:
1. A specific commit SHA as the base — computes `<sha>..HEAD`
2. Currently staged changes — computes the staged diff
3. Currently unstaged/untracked changes — computes the unstaged/untracked diff

#### Scenario: User selects SHA-based diff
- **WHEN** the user selects option 1 and provides a valid commit SHA
- **THEN** the diff is computed as `<sha>..HEAD` and all subsequent steps operate on that diff

#### Scenario: User selects staged diff
- **WHEN** the user selects option 2
- **THEN** the staged diff is captured and all subsequent steps operate on it

#### Scenario: User selects unstaged/untracked diff
- **WHEN** the user selects option 3
- **THEN** both unstaged modifications and untracked files are captured and all subsequent steps operate on that diff

#### Scenario: No option selected — command does not proceed
- **WHEN** the user does not make a selection
- **THEN** the command waits for a valid selection before reading any diff or asking any question

### Requirement: Diff source selection precedes all other steps
The diff source MUST be selected before the diff is read, before interview questions are asked, and before any output is written.

#### Scenario: Interview does not start before diff source chosen
- **WHEN** the command starts
- **THEN** the first user interaction is the diff source selection, not an interview question
