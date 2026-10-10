# new-change-branch Specification

## Purpose
Provide an explicitly requested, provider-neutral workflow that derives branch naming from relevant conversation context and safely creates and switches to a local branch from a user-selected base in Claude Code and opencode.

## Requirements

### Requirement: Explicit conversation-aware invocation

The `/new-change-branch` skill MUST run only after an explicit user request for the skill or its workflow. It SHALL reuse relevant conversation context without starting in isolation and SHALL require no OpenSpec dependency.

#### Scenario: Explicit workflow request

- **WHEN** the user explicitly requests `/new-change-branch` or its workflow
- **THEN** the skill uses relevant discussion and imported work-item context to resolve branch naming information.

### Requirement: Resolve only missing or ambiguous naming data

The skill SHALL resolve a type, a name, and an optional actual provider-neutral work-item identifier from relevant context. It SHALL ask only for missing or ambiguous information, offer `feat`, `fix`, `docs`, and `chore` for type selection, and accept the name as free text. It MUST omit the identifier when no relevant reference exists and MUST ask which reference to use when relevant references describe different changes.

#### Scenario: Context supplies unambiguous naming data

- **WHEN** the discussion supplies a type and name with no relevant work-item reference
- **THEN** the skill uses that data without repeating naming questions and omits the identifier.

#### Scenario: References identify different changes

- **WHEN** multiple relevant work-item references describe different changes
- **THEN** the skill asks the user which reference to use before constructing the branch name.

### Requirement: Consistent names preserve actual identifiers

The helper SHALL normalize only the name to lowercase hyphen-separated words and construct `<type>/<id>_<name>` when an identifier is supplied or `<type>/<name>` otherwise. It MUST preserve a supplied identifier exactly, validate the resulting reference with Git, and reject empty or invalid names and occupied local branch names. The skill MUST request a correction rather than reuse, overwrite, or automatically suffix an occupied name.

#### Scenario: Identifier-bearing name

- **WHEN** the naming inputs are type `fix`, identifier `AbC-42`, and name `Fix Bug`
- **THEN** the helper returns `fix/AbC-42_fix-bug` when that name is valid and available.

#### Scenario: Name without identifier

- **WHEN** the naming inputs are type `docs`, name `User GUIDE!`, and no identifier
- **THEN** the helper returns `docs/user-guide` when that name is available.

#### Scenario: Invalid or occupied name

- **WHEN** the resulting name is empty, invalid for Git, or already exists as a local branch
- **THEN** the workflow requests a correction without creating or overwriting a branch.

### Requirement: Bounded deterministic parent suggestion

The helper SHALL inspect at most 20 commits using first-parent traversal from HEAD, including HEAD in the bound. It SHALL compare commits nearest HEAD first against local and available remote-tracking reference tips, exclude the current branch and symbolic references, and select the alphabetically first full reference name at the first matching commit. The skill MUST describe this reference as a convenient base suggestion rather than proof of historical origin and MUST NOT automatically fetch or update remotes.

#### Scenario: Several reference tips match the nearest commit

- **WHEN** multiple eligible references match the first matching commit in the bounded traversal
- **THEN** the helper selects the alphabetically first full reference name without asking the user to resolve the tie.

#### Scenario: No reference matches within the bound

- **WHEN** no eligible tip matches any of the first 20 first-parent commits
- **THEN** the helper returns no parent suggestion while retaining other available base options.

#### Scenario: Merged-side tip is outside first-parent history

- **WHEN** a reference tip occurs only on the merged-side history rather than the bounded first-parent path
- **THEN** that tip is not selected as the parent suggestion.

### Requirement: User-selected base with native free-text selection

The skill SHALL offer the current branch, detected parent, existing main references, and existing master references in that order, omitting absent and duplicate references. Detached HEAD SHALL have no current-branch option. The skill MUST use Claude Code's `AskUserQuestion` or opencode's `question` with free-text entry and MUST NOT automatically choose a base. Claude Code SHALL paginate more than four bases in returned order with a More option and retain free text on every page. The helper SHALL resolve the selected or entered base to a commit SHA; an unavailable or non-commit base SHALL return the workflow to base selection.

#### Scenario: User enters an unavailable base

- **WHEN** a selected or free-text base does not resolve to a commit
- **THEN** the skill explains the problem and asks for a base again without creating a branch.

#### Scenario: Suggested bases are absent

- **WHEN** inspection returns no suggested base references
- **THEN** the skill still accepts a free-text base rather than selecting one automatically.

### Requirement: Safe local creation and verified switching

The skill MUST load safe-operations and locate its helper through the shared tool-resolution policy. The helper SHALL stop when inspection cannot establish a Git repository and HEAD commit or detects a merge or rebase in progress. Before creation it SHALL revalidate name availability, base validity, equality with the selected SHA, and merge/rebase state. It SHALL create and switch using separate Git arguments from that SHA without configuring remote tracking. The explicit workflow request and base selection SHALL authorize only the requested local creation and switch.

#### Scenario: Creation completes

- **WHEN** the requested branch name remains available, the base still resolves to the selected SHA, and Git permits switching
- **THEN** the helper creates and switches to the branch without tracking and reports success only after verifying the active branch and HEAD match the request.

#### Scenario: Base moved after selection

- **WHEN** the base no longer resolves to the previously selected SHA
- **THEN** the helper rejects creation without creating a branch and the skill returns to base selection.

#### Scenario: Merge or rebase is in progress

- **WHEN** inspection or the immediate pre-creation check detects a merge or rebase in progress
- **THEN** the workflow stops with the reason without attempting branch creation.

### Requirement: Preserve work and report actual execution state

The workflow MUST preserve staged, unstaged, and untracked work and MUST NOT automatically stash, discard, commit, push, fetch, reset, delete, or clean up repository state. Cancellation before creation SHALL end without mutation. After an attempted creation fails, the skill MUST stop without automatic retry and report what executed, whether creation occurred, the active branch, and what remains incomplete. Read-only inspection, naming, and base failures SHALL NOT carry creation-specific incomplete reporting. Successful completion SHALL report the branch name and base used.

#### Scenario: Existing changes survive creation

- **WHEN** Git can switch to the selected base while staged, unstaged, and untracked changes exist
- **THEN** those changes remain intact after verified branch creation and switching.

#### Scenario: Git blocks switching

- **WHEN** Git refuses the requested switch to protect existing work
- **THEN** the workflow stops, preserves the work, and reports attempted creation state, the active branch, and incomplete verification without cleanup or retry.

#### Scenario: User cancels before creation

- **WHEN** the user cancels at a question before creation
- **THEN** the workflow ends without invoking creation or modifying repository state.

#### Scenario: Read-only operation fails

- **WHEN** inspection, naming, or base resolution fails
- **THEN** the helper reports that operation's failure without creation-specific incomplete reporting.

### Requirement: Both-harness installation and regression coverage

Existing projections SHALL install the universal skill and Node helper for Claude Code and opencode. Regression tests SHALL cover naming formats, identifier preservation, missing and invalid inputs, bounded first-parent search, deterministic ties, unavailable and moved bases, busy repository states, occupied names, cancellation, existing work preservation, execution-state reporting, native picker instructions, and both harness projections. Rejection and cancellation tests SHALL verify that no branch was created.

#### Scenario: Install manifest expands for both harnesses

- **WHEN** the install manifest is expanded for Claude Code and opencode
- **THEN** each projection includes the universal new-change-branch skill and its helper with the declared capability requirements.
