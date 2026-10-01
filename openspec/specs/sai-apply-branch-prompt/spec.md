## Purpose

Let the generated plan choose and create its working branch with a closed, localized prompt at apply time.

## Requirements

### Requirement: Plan template Prerequisites section SHALL use a 3-option branch-selection prompt
The branch-selection prompt SHALL live in `sai/commands/apply/steps/branch-selection.md` and SHALL present exactly three options to the user. The implementation plan template `sai/commands/implement/implementation-plan.template.md` SHALL carry no `## Prerequisites` block. The hardcoded instruction "Ensure branch is not master or main" SHALL be absent. No branch name is prohibited — the user has complete opt-out.

#### Scenario: plan template contains 3-option prompt
- **WHEN** `sai/commands/apply/steps/branch-selection.md` is read
- **THEN** it contains a 3-option branch-selection prompt
- **AND** it does NOT contain the text "Ensure branch is not master or main"
- **AND** `sai/commands/implement/implementation-plan.template.md` contains no `## Prerequisites` block

#### Scenario: old 2-option rule is absent
- **WHEN** `sai/commands/apply/steps/branch-selection.md` is read
- **THEN** it does NOT present the original two-item numbered list (feature-name + custom branch name) as the sole branch-selection mechanism
- **AND** it does NOT contain any instruction that prohibits or warns against selecting `main`, `master`, or any other specific branch name

### Requirement: Prompt SHALL detect current git branch before presenting options
The branch-selection prompt in `sai/commands/apply/steps/branch-selection.md` SHALL instruct the agent to detect the current git branch via `git rev-parse --abbrev-ref HEAD` (or equivalent) BEFORE presenting the three options. The detected branch name is substituted into option 2's label. If the command returns empty (detached HEAD), option 2 SHALL display the literal text `detached HEAD`.

#### Scenario: current branch is main — stay option IS presented
- **WHEN** apply presents the branch-selection prompt and the current git branch is `main`
- **THEN** the prompt includes a "stay on current branch" option referencing `main`
- **AND** no warning or prohibition is shown for staying on `main`

#### Scenario: current branch is master — stay option IS presented
- **WHEN** apply presents the branch-selection prompt and the current git branch is `master`
- **THEN** the prompt includes a "stay on current branch" option referencing `master`
- **AND** no warning or prohibition is shown for staying on `master`

#### Scenario: current branch is a feature branch — stay option presented
- **WHEN** apply presents the branch-selection prompt and the current git branch is `feature/JIRA-123`
- **THEN** the prompt includes a "stay on current branch" option referencing `feature/JIRA-123`

#### Scenario: current branch is detached HEAD
- **WHEN** apply presents the branch-selection prompt and `git rev-parse --abbrev-ref HEAD` returns empty (detached HEAD)
- **THEN** the prompt includes option 2 with the literal text `detached HEAD`
- **AND** the user can select this option without warning

### Requirement: Option labels SHALL follow the user's input language
All option labels within the branch-selection prompt SHALL be written in the same language the user writes in when invoking `/sai-4-apply`, with English as the fallback when the user's input language is unclear. The surrounding prompt text SHALL remain in English.

#### Scenario: user writes in Spanish — labels in Spanish
- **WHEN** the user invokes `/sai-4-apply` writing in Spanish and the branch-selection prompt is presented
- **THEN** the branch-selection option labels are in Spanish
- **AND** all other prompt text outside the option labels remains in English

#### Scenario: user writes in English — labels in English
- **WHEN** the user invokes `/sai-4-apply` writing in English and the branch-selection prompt is presented
- **THEN** the branch-selection option labels are in English
- **AND** all other prompt text outside the option labels remains in English

#### Scenario: user input language unclear — English fallback
- **WHEN** the user's input language is unclear or mixed when invoking `/sai-4-apply` and the branch-selection prompt is presented
- **THEN** the branch-selection option labels are in English
- **AND** all other prompt text outside the option labels remains in English

### Requirement: Three options in defined order with complete opt-out
The branch-selection prompt SHALL present these three options in this exact order:
1. Suggest a new branch name `{feature-name}` (derived from the change name) — always available, serves as default
2. Stay on the current branch `{current-branch}` — always available regardless of branch name; if detached HEAD, shows literal `detached HEAD`
3. Free text to enter a custom branch name — always available

No option is prohibited. The user has complete opt-out and bears responsibility for the choice.

#### Scenario: user selects stay-on-current-branch on main
- **WHEN** the current branch is `main` and the user selects the stay option
- **THEN** apply records `main` as the target branch
- **AND** no branch creation is performed

#### Scenario: user selects stay-on-current-branch on feature branch
- **WHEN** the current branch is `feature/existing-work` and the user selects the stay option
- **THEN** apply records `feature/existing-work` as the target branch
- **AND** no branch creation is performed

#### Scenario: user selects stay on detached HEAD
- **WHEN** the current state is detached HEAD and the user selects option 2
- **THEN** apply records `detached HEAD` as the target branch
- **AND** no branch creation is performed

#### Scenario: user selects change-name-derived branch
- **WHEN** the user selects option 1 for change `add-validation`
- **THEN** apply records `add-validation` as the target branch

#### Scenario: user enters custom branch name
- **WHEN** the user enters `JIRA-456-add-validation` as a custom branch name via option 3
- **THEN** apply records `JIRA-456-add-validation` as the target branch

### Requirement: Branch creation instruction preserved
If the selected branch does not exist in the repository, `sai/commands/apply/steps/branch-selection.md` SHALL instruct the agent to create it from the chosen base branch before proceeding with implementation. The base branch is the default branch (dynamically resolved `main`/`master`) or the current branch, as determined by the base prompt — or the default branch directly when the base prompt is skipped because the current branch already equals the default branch. The instruction SHALL NOT hardcode `main` as the base.

#### Scenario: selected branch does not exist — created from chosen base
- **WHEN** the user selects a branch name that does not exist in the repository and the base prompt resolves to the current branch `feature/parent`
- **THEN** apply creates the branch from `feature/parent` before implementing

#### Scenario: selected branch does not exist — default base on master repo
- **WHEN** the user selects a new branch that does not exist in a repository whose default branch is `master` and the base prompt resolves to the default branch
- **THEN** apply creates the branch from `master` before implementing

#### Scenario: user stays on existing branch — no creation needed
- **WHEN** the user selects the stay option and the current branch exists
- **THEN** no branch is created

### Requirement: Branch prompt lives only in the template Prerequisites
The branch-selection prompt SHALL live only in `sai/commands/apply/steps/branch-selection.md`. No other instruction file SHALL restate it (the apply coordinator only names and fetches that file), the implementation plan template SHALL NOT carry it, and no existing `implementation.md` artifact SHALL be rewritten to remove a prelude it already carries.

#### Scenario: single home for the branch prompt
- **WHEN** the implementation plan template, the implement step library, and the apply step library are read
- **THEN** the branch-selection prompt appears only in `sai/commands/apply/steps/branch-selection.md`

#### Scenario: existing implementation.md files untouched
- **WHEN** the change is applied
- **THEN** no existing `openspec/changes/*/implementation.md` file is modified or regenerated

### Requirement: Default branch SHALL be detected dynamically
`sai/commands/apply/steps/branch-selection.md` SHALL instruct the agent to resolve the repository's default branch dynamically rather than assuming `main`. Resolution SHALL prefer the remote head (for example `git symbolic-ref --quiet refs/remotes/origin/HEAD`, taking the trailing segment), falling back to whichever of `main` or `master` exists locally. The resolved name is referred to below as the default branch.

#### Scenario: repository default branch is main
- **WHEN** apply presents the branch-selection prompt in a repository whose default branch is `main`
- **THEN** the resolved default branch used by the base prompt and the branch-creation instruction is `main`

#### Scenario: repository default branch is master
- **WHEN** apply presents the branch-selection prompt in a repository whose default branch is `master`
- **THEN** the resolved default branch used by the base prompt and the branch-creation instruction is `master`
- **AND** no text in `branch-selection.md` hardcodes `main` as the base

### Requirement: New branch SHALL prompt for its base
When the user selects a branch that does NOT already exist in the repository — option 1 (suggested `{feature-name}`) or option 3 (manually entered name) — `sai/commands/apply/steps/branch-selection.md` SHALL instruct the agent to present a 2-option closed choice asking which branch the new branch is based on, before creating it. The two options, in this order, are:
1. Base on the default branch (the dynamically resolved `main`/`master`) — the default option.
2. Base on the current branch (`{current-branch}`); when the current state is detached HEAD, option 2's label SHALL show the literal text `detached HEAD`, mirroring option 2 of the three-option branch-selection prompt.

This requirement applies except where the base prompt is skipped per the skip-conditions requirement below. The prompt SHALL be presented through the harness's native option-picker per the closed-choice-prompt rule in `remember.md` (the `AskUserQuestion` tool on Claude Code), with a plain-text fallback where no picker exists. Option labels SHALL follow the user's input language with English fallback, consistent with the three-option branch-selection prompt; surrounding text remains in English. The chosen base is recorded and used by the branch-creation instruction.

#### Scenario: user picks suggested new branch, chooses default base
- **WHEN** the user selects option 1 for a new branch that does not exist, on current branch `feature/parent`, and picks the default-branch base from the 2-option base prompt
- **THEN** apply creates the new branch from the default branch
- **AND** the base prompt offered "base on default branch" as the default option and "base on current branch `feature/parent`" as the alternative

#### Scenario: user picks manual new branch, chooses current-branch base
- **WHEN** the user selects option 3, enters a new branch name that does not exist, on current branch `feature/parent`, and picks "base on current branch"
- **THEN** apply creates the new branch from `feature/parent`

#### Scenario: base prompt uses the harness option-picker
- **WHEN** the base prompt is presented on Claude Code
- **THEN** it is rendered through the `AskUserQuestion` option-picker with one option per base choice, not as an unstructured free-text question

#### Scenario: current state is detached HEAD
- **WHEN** the user selects a new branch via option 1 or 3 while in detached HEAD (and the base prompt is not skipped) and picks the current-branch base option
- **THEN** apply creates the new branch from the current detached commit
- **AND** the base prompt's "base on current branch" option label showed the literal text `detached HEAD`

### Requirement: Base prompt SHALL be skipped when there is no meaningful choice
`sai/commands/apply/steps/branch-selection.md` SHALL NOT present the base prompt when any of these hold:
1. The user selects option 2 (stay on the current branch) — no branch is created.
2. The selected target branch already exists in the repository — no branch is created.
3. The current branch already equals the resolved default branch — basing on current and basing on default are identical.

In case 3, the new branch SHALL be created from the default branch without prompting.

#### Scenario: stay-on-current skips the base prompt
- **WHEN** the user selects option 2 (stay on current branch)
- **THEN** no base prompt is presented and no branch is created

#### Scenario: existing target branch skips the base prompt
- **WHEN** the user selects a branch (via any option) that already exists in the repository
- **THEN** no base prompt is presented and no branch is created

#### Scenario: current branch equals default branch skips the base prompt
- **WHEN** the current branch is the resolved default branch (for example `main`) and the user selects a new branch via option 1 or 3
- **THEN** no base prompt is presented
- **AND** apply creates the new branch from the default branch

### Requirement: Apply fast-track may resolve the branch prompt at runtime
The apply coordinator SHALL identify the three-option branch-selection prompt of `sai/commands/apply/steps/branch-selection.md` as the apply-time trigger. Fast-track SHALL select option 2 only for a non-empty current branch, without loading `branch-selection.md`; detached HEAD SHALL load `branch-selection.md` and retain the interactive prompt and its existing branch-base rules.

#### Scenario: Option-two auto-selection skips branch-base handling
- **WHEN** fast-track selects stay on the current branch
- **THEN** no branch-base sub-prompt is presented because no new branch is created

#### Scenario: Detached HEAD uses the existing prompt
- **WHEN** fast-track reaches the branch-selection prompt with detached HEAD
- **THEN** the three options remain available and the existing branch-base behavior is unchanged
