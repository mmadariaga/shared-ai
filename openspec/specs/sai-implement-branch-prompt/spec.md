# sai-implement-branch-prompt Specification

## Purpose
TBD - created by archiving change branch-name-prompt-on-implement. Update Purpose after archive.
## Requirements
### Requirement: sai-3-implement prompts for branch name before generating implementation.md
During `/sai-3-implement`, the agent SHALL present a branch-name question to the user using the AskUserQuestion tool BEFORE executing the plan.md instructions that generate `implementation.md`.

The prompt SHALL:
- Offer the change-name (kebab-case) as the default option with a description indicating it is the default
- Offer "reuse `<current-branch>`" as an additional option ONLY when the agent detects the current git branch is not `main` or `master` (via `git branch --show-current` or equivalent)
- Accept free-text input for any custom branch name
- NOT inspect `git branch -a` or validate the input against any naming pattern
- NOT be placed in `/sai-1-spec` or `/sai-2-design` — branch naming is a code-time concern

The resolved branch name SHALL be substituted into the `## Prerequisites` section of the generated `implementation.md` in place of the generic `{feature-name}` placeholder from the plan template.

#### Scenario: user on main, accepts default
- **WHEN** the user runs `/sai-3-implement my-change` while on branch `main`
- **THEN** the prompt offers `my-change` as the default option and a free-text override; the "reuse current branch" option is NOT shown
- **WHEN** the user accepts the default
- **THEN** `implementation.md` Prerequisites section contains the branch name `my-change`

#### Scenario: user on main, enters custom name
- **WHEN** the user runs `/sai-3-implement my-change` while on branch `main`
- **WHEN** the user types `feature/JIRA-123-my-change` as a free-text override
- **THEN** `implementation.md` Prerequisites section contains the branch name `feature/JIRA-123-my-change`

#### Scenario: user on non-main branch, offered reuse option
- **WHEN** the user runs `/sai-3-implement my-change` while on branch `feature/JIRA-123`
- **THEN** the prompt offers at minimum: `my-change` (default) and `feature/JIRA-123` (reuse current branch) as distinct options, plus free-text
- **WHEN** the user selects the reuse option
- **THEN** `implementation.md` Prerequisites section contains the branch name `feature/JIRA-123`

#### Scenario: branch prompt is absent from sai-1-spec
- **WHEN** `~/.claude/commands/sai-1-spec.md` is read
- **THEN** the body does NOT contain an AskUserQuestion call related to branch naming
- **THEN** the body does NOT contain the text "branch name" as an interactive prompt instruction

#### Scenario: branch prompt is absent from sai-2-design
- **WHEN** `~/.claude/commands/sai-2-design.md` is read
- **THEN** the body does NOT contain an AskUserQuestion call related to branch naming

#### Scenario: sai-4-apply git-authorization gate is unchanged
- **WHEN** `~/.claude/instructions/sai/implement.md` lines 59–68 are read
- **THEN** the git-authorization gate text is identical to the pre-change version — branch-name substitution logic is NOT added there

## MODIFIED Requirements

### Requirement: Branch selection prompt MUST offer custom backlog-linked name as explicit option
The branch selection prompt in `sai/instructions/implement.md` SHALL present three options:
1. `{feature-name}` (derived from the change name)
2. Custom branch name (free input — e.g., backlog-linked name like `JIRA-123-feature-name`)
3. Create the selected branch from the chosen base branch — the dynamically resolved default branch (`main`/`master`) or the current branch, per the base prompt defined in `sai-apply-branch-prompt` — if it does not already exist. The base SHALL NOT be hardcoded to `main`.

#### Scenario: user selects custom branch name
- **WHEN** the user runs `/sai-3-implement my-change`
- **WHEN** the user enters `JIRA-456-add-validation` as a custom branch name
- **THEN** the Prerequisites section uses `JIRA-456-add-validation` as the branch name

#### Scenario: selected branch does not exist
- **WHEN** the user selects a branch name that does not exist in the repository
- **THEN** the agent creates the branch from the chosen base branch (per the base prompt), never hardcoded to `main`, before proceeding with implementation

