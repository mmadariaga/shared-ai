# commit-auth-prompt-split Specification

## Purpose
TBD - created by archiving change sai-commit-auth-prompt-split. Update Purpose after archive.
## Requirements
### Requirement: Short authorization question
The commit authorization gate SHALL ask the short decision "Run `git commit` on the staged changes above?" with ordered options `yes (Recommended)` / `no` / `Allow on this session`, keeping the picker question to that one short line with no Totals and no option explanations inside the question, using identical short wording on Claude Code and opencode with no harness fork.
#### Scenario: Short picker asks the commit decision
- **WHEN** the commit authorization gate is presented with staged changes
- **THEN** the picker shows the one-line short decision with the three ordered options and no Totals inside the question

### Requirement: Accompanying context blocks as ordinary text
The commit flow SHALL render the staged file inventory with Totals plus the proposed subject and body as ordinary text above the picker, unaltered and in fixed order inventory then message, and the short question plus those visible blocks together SHALL carry the essential state context for the decision.
#### Scenario: Inventory and message stay visible above the picker
- **WHEN** the authorization ask is presented
- **THEN** the inventory with Totals and the subject/body appear as ordinary text above the picker in fixed order while the picker holds only the short line

### Requirement: Preserved full-context gates and re-presentation
The commit flow SHALL keep the secret-file confirmation and the already-pushed amend warning with full context excluded from shortening, SHALL forward the exact selected answer value through same-worker continuation, and SHALL re-present the same short ask unchanged on an off-option reply or silence with no execution.
#### Scenario: Invalid reply re-presents the same short ask
- **WHEN** the authorization ask receives an off-option reply or silence
- **THEN** the same short ask is re-presented unchanged and nothing is executed

### Requirement: Concise-format reference for commit authorization
The commit authorization prompt SHALL reference the concise-format rule, SHALL keep the short literal question, SHALL render the staged inventory with Totals plus the proposed message as preceding ordinary text, and SHALL carry secret-file and already-pushed amend context in preceding plain text.
#### Scenario: Commit gate shows context before short question
- **WHEN** the commit authorization ask is presented
- **THEN** inventory with Totals and message appear as ordinary text above a one-line picker question

