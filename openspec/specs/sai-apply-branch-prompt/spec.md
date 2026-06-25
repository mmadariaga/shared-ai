## ADDED Requirements

### Requirement: Plan template Prerequisites section SHALL use a 3-option branch-selection prompt
The `## Prerequisites` block inside `<plan_template>` in `sai/instructions/implement.md` SHALL be replaced with a branch-selection prompt that presents exactly three options to the user. The hardcoded instruction "Ensure branch is not master or main" SHALL be removed. No branch name is prohibited — the user has complete opt-out.

#### Scenario: plan template contains 3-option prompt
- **WHEN** `sai/instructions/implement.md` is read and the `<plan_template>` section is inspected
- **THEN** the `## Prerequisites` block contains a 3-option branch-selection prompt
- **THEN** the `## Prerequisites` block does NOT contain the text "Ensure branch is not master or main"

#### Scenario: old 2-option rule is absent
- **WHEN** `sai/instructions/implement.md` is read
- **THEN** the `<plan_template>` section does NOT contain the original two-item numbered list (feature-name + custom branch name) as the sole branch-selection mechanism
- **THEN** the `<plan_template>` section does NOT contain any instruction that prohibits or warns against selecting `main`, `master`, or any other specific branch name

### Requirement: Prompt SHALL detect current git branch before presenting options
The branch-selection prompt in `<plan_template>` SHALL instruct the agent to detect the current git branch via `git rev-parse --abbrev-ref HEAD` (or equivalent) BEFORE presenting the three options. The detected branch name is substituted into option 2's label. If the command returns empty (detached HEAD), option 2 SHALL display the literal text `detached HEAD`.

#### Scenario: current branch is main — stay option IS presented
- **WHEN** the agent generates an `implementation.md` and the current git branch is `main`
- **THEN** the Prerequisites section in the generated plan includes a "stay on current branch" option referencing `main`
- **THEN** no warning or prohibition is shown for staying on `main`

#### Scenario: current branch is master — stay option IS presented
- **WHEN** the agent generates an `implementation.md` and the current git branch is `master`
- **THEN** the Prerequisites section in the generated plan includes a "stay on current branch" option referencing `master`
- **THEN** no warning or prohibition is shown for staying on `master`

#### Scenario: current branch is a feature branch — stay option presented
- **WHEN** the agent generates an `implementation.md` and the current git branch is `feature/JIRA-123`
- **THEN** the Prerequisites section in the generated plan includes a "stay on current branch" option referencing `feature/JIRA-123`

#### Scenario: current branch is detached HEAD
- **WHEN** the agent generates an `implementation.md` and `git rev-parse --abbrev-ref HEAD` returns empty (detached HEAD)
- **THEN** the Prerequisites section in the generated plan includes option 2 with the literal text `detached HEAD`
- **THEN** the user can select this option without warning

### Requirement: Option labels SHALL follow the user's input language
All option labels within the branch-selection prompt in `<plan_template>` SHALL be written in the same language the user writes in when invoking `/sai-3-implement`, with English as the fallback when the user's input language is unclear. The surrounding plan text (headings, instructions, verification checklists) SHALL remain in English.

#### Scenario: user writes in Spanish — labels in Spanish
- **WHEN** the user invokes `/sai-3-implement` writing in Spanish and an `implementation.md` is generated from the updated `<plan_template>`
- **THEN** the branch-selection option labels are in Spanish
- **THEN** all other plan text outside the option labels remains in English

#### Scenario: user writes in English — labels in English
- **WHEN** the user invokes `/sai-3-implement` writing in English and an `implementation.md` is generated from the updated `<plan_template>`
- **THEN** the branch-selection option labels are in English
- **THEN** all other plan text outside the option labels remains in English

#### Scenario: user input language unclear — English fallback
- **WHEN** the user's input language is unclear or mixed when invoking `/sai-3-implement`
- **THEN** the branch-selection option labels are in English
- **THEN** all other plan text outside the option labels remains in English

### Requirement: Three options in defined order with complete opt-out
The branch-selection prompt SHALL present these three options in this exact order:
1. Suggest a new branch name `{feature-name}` (derived from the change name) — always available, serves as default
2. Stay on the current branch `{current-branch}` — always available regardless of branch name; if detached HEAD, shows literal `detached HEAD`
3. Free text to enter a custom branch name — always available

No option is prohibited. The user has complete opt-out and bears responsibility for the choice.

#### Scenario: user selects stay-on-current-branch on main
- **WHEN** the current branch is `main` and the user selects the stay option
- **THEN** the Prerequisites section records `main` as the target branch
- **THEN** no branch creation instruction is included

#### Scenario: user selects stay-on-current-branch on feature branch
- **WHEN** the current branch is `feature/existing-work` and the user selects the stay option
- **THEN** the Prerequisites section records `feature/existing-work` as the target branch
- **THEN** no branch creation instruction is included

#### Scenario: user selects stay on detached HEAD
- **WHEN** the current state is detached HEAD and the user selects option 2
- **THEN** the Prerequisites section records `detached HEAD` as the target branch
- **THEN** no branch creation instruction is included

#### Scenario: user selects change-name-derived branch
- **WHEN** the user selects option 1 for change `add-validation`
- **THEN** the Prerequisites section records `add-validation` as the target branch

#### Scenario: user enters custom branch name
- **WHEN** the user enters `JIRA-456-add-validation` as a custom branch name via option 3
- **THEN** the Prerequisites section records `JIRA-456-add-validation` as the target branch

### Requirement: Branch creation instruction preserved
If the selected branch does not exist in the repository, the Prerequisites section SHALL instruct the agent to create it from `main` before proceeding with implementation.

#### Scenario: selected branch does not exist
- **WHEN** the user selects a branch name that does not exist in the repository
- **THEN** the Prerequisites section instructs the agent to create the branch from `main` before implementing

#### Scenario: user stays on existing branch — no creation needed
- **WHEN** the user selects the stay option and the current branch exists
- **THEN** no branch creation instruction is included in the Prerequisites section

### Requirement: Edit scope limited to plan_template Prerequisites
Only the `## Prerequisites` section inside `<plan_template>` in `sai/instructions/implement.md` SHALL be modified. No other section of `implement.md`, no other instruction file, and no existing `implementation.md` artifact SHALL be changed.

#### Scenario: only Prerequisites section modified
- **WHEN** the change is applied to `sai/instructions/implement.md`
- **THEN** the only diff is within the `## Prerequisites` block inside `<plan_template>`
- **THEN** all other sections of `implement.md` remain byte-identical

#### Scenario: existing implementation.md files untouched
- **WHEN** the change is applied
- **THEN** no existing `openspec/changes/*/implementation.md` file is modified or regenerated
