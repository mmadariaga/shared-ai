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
If the selected branch does not exist in the repository, the Prerequisites section SHALL instruct the agent to create it from the chosen base branch before proceeding with implementation. The base branch is the default branch (dynamically resolved `main`/`master`) or the current branch, as determined by the base prompt — or the default branch directly when the base prompt is skipped because the current branch already equals the default branch. The instruction SHALL NOT hardcode `main` as the base.

#### Scenario: selected branch does not exist — created from chosen base
- **WHEN** the user selects a branch name that does not exist in the repository and the base prompt resolves to the current branch `feature/parent`
- **THEN** the Prerequisites section instructs the agent to create the branch from `feature/parent` before implementing

#### Scenario: selected branch does not exist — default base on master repo
- **WHEN** the user selects a new branch that does not exist in a repository whose default branch is `master` and the base prompt resolves to the default branch
- **THEN** the Prerequisites section instructs the agent to create the branch from `master` before implementing

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

### Requirement: Default branch SHALL be detected dynamically
The `## Prerequisites` block inside `<plan_template>` in `sai/instructions/implement.md` SHALL instruct the agent to resolve the repository's default branch dynamically rather than assuming `main`. Resolution SHALL prefer the remote head (for example `git symbolic-ref --quiet refs/remotes/origin/HEAD`, taking the trailing segment), falling back to whichever of `main` or `master` exists locally. The resolved name is referred to below as the default branch.

#### Scenario: repository default branch is main
- **WHEN** the agent generates an `implementation.md` in a repository whose default branch is `main`
- **THEN** the resolved default branch used by the base prompt and the branch-creation instruction is `main`

#### Scenario: repository default branch is master
- **WHEN** the agent generates an `implementation.md` in a repository whose default branch is `master`
- **THEN** the resolved default branch used by the base prompt and the branch-creation instruction is `master`
- **THEN** no text in the Prerequisites block hardcodes `main` as the base

### Requirement: New branch SHALL prompt for its base
When the user selects a branch that does NOT already exist in the repository — option 1 (suggested `{feature-name}`) or option 3 (manually entered name) — the `<plan_template>` Prerequisites block SHALL instruct the agent to present a 2-option closed choice asking which branch the new branch is based on, before creating it. The two options, in this order, are:
1. Base on the default branch (the dynamically resolved `main`/`master`) — the default option.
2. Base on the current branch (`{current-branch}`); when the current state is detached HEAD, option 2's label SHALL show the literal text `detached HEAD`, mirroring option 2 of the three-option branch-selection prompt.

This requirement applies except where the base prompt is skipped per the skip-conditions requirement below. The prompt SHALL be presented through the harness's native option-picker per the closed-choice-prompt rule in `remember.md` (the `AskUserQuestion` tool on Claude Code), with a plain-text fallback where no picker exists. Option labels SHALL follow the user's input language with English fallback, consistent with the three-option branch-selection prompt; surrounding plan text remains in English. The chosen base is recorded and used by the branch-creation instruction.

#### Scenario: user picks suggested new branch, chooses default base
- **WHEN** the user selects option 1 for a new branch that does not exist, on current branch `feature/parent`
- **THEN** a 2-option base prompt is presented with "base on default branch" as the default option and "base on current branch `feature/parent`" as the alternative
- **WHEN** the user picks the default-branch base
- **THEN** the Prerequisites section instructs the agent to create the new branch from the default branch

#### Scenario: user picks manual new branch, chooses current-branch base
- **WHEN** the user selects option 3 and enters a new branch name that does not exist, on current branch `feature/parent`
- **WHEN** the user picks "base on current branch"
- **THEN** the Prerequisites section instructs the agent to create the new branch from `feature/parent`

#### Scenario: base prompt uses the harness option-picker
- **WHEN** the base prompt is presented on Claude Code
- **THEN** it is rendered through the `AskUserQuestion` option-picker with one option per base choice, not as an unstructured free-text question

#### Scenario: current state is detached HEAD
- **WHEN** the user selects a new branch via option 1 or 3 while in detached HEAD (and the base prompt is not skipped)
- **THEN** the base prompt's "base on current branch" option label shows the literal text `detached HEAD`
- **WHEN** the user picks that option
- **THEN** the Prerequisites section instructs the agent to create the new branch from the current detached commit

### Requirement: Base prompt SHALL be skipped when there is no meaningful choice
The `<plan_template>` Prerequisites block SHALL NOT present the base prompt when any of these hold:
1. The user selects option 2 (stay on the current branch) — no branch is created.
2. The selected target branch already exists in the repository — no branch is created.
3. The current branch already equals the resolved default branch — basing on current and basing on default are identical.

In case 3, the new branch SHALL be created from the default branch without prompting.

#### Scenario: stay-on-current skips the base prompt
- **WHEN** the user selects option 2 (stay on current branch)
- **THEN** no base prompt is presented and no branch-creation instruction is included

#### Scenario: existing target branch skips the base prompt
- **WHEN** the user selects a branch (via any option) that already exists in the repository
- **THEN** no base prompt is presented and no branch-creation instruction is included

#### Scenario: current branch equals default branch skips the base prompt
- **WHEN** the current branch is the resolved default branch (for example `main`) and the user selects a new branch via option 1 or 3
- **THEN** no base prompt is presented
- **THEN** the Prerequisites section instructs the agent to create the new branch from the default branch
