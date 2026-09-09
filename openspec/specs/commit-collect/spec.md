# commit-collect Specification

## Purpose
TBD - created by archiving change commit-deterministic-extraction. Update Purpose after archive.
## Requirements
### Requirement: collect subcommand reports staged state and style as JSON

The `sai/tools/commit.js collect` subcommand SHALL read git staged state, repository commit style, and sensitive-file patterns, and return structured results as JSON when invoked with `--json`.

#### Scenario: collect with no staged changes
- **WHEN** `node sai/tools/commit.js collect --json` is called with an empty staging area
- **THEN** it exits with code 1 and returns `{"has_staged": false}`

#### Scenario: collect with staged files reports inventory
- **WHEN** `node sai/tools/commit.js collect --json` is called with staged files present
- **THEN** it exits with code 0 and returns an object with `has_staged: true`, `file_count`, `total_insertions`, `total_deletions`, and a `files` array containing objects with `path`, `insertions`, and `deletions` for each staged file

#### Scenario: collect infers scope from common path prefix
- **WHEN** staged files share a common directory prefix (e.g., all under `sai/commands/commit/`)
- **THEN** the returned object includes `inferred_scope` set to that prefix, or `null` if files span multiple roots

#### Scenario: collect detects repository commit style
- **WHEN** `node sai/tools/commit.js collect --json` runs on a repository with commit history
- **THEN** it returns a `detected_style` object containing `match_rate` (percentage of commits matching Conventional Commits format), `detected_types` (array of type keywords found in recent commits), `detected_scopes` (array of scope values found), `body_presence_rate` (percentage of commits with body text), and `recurring_headers` (section header strings appearing in bodies)

#### Scenario: collect detects sensitive files
- **WHEN** staged files match sensitive patterns (`.env`, `*credentials*`, `*.pem`, `*.key`, etc.)
- **THEN** the returned object includes `sensitive_files` array listing the exact paths of matching files

### Requirement: collect accepts --cwd for working directory specification

The `collect` subcommand SHALL accept `--cwd <directory>` to run git operations in a non-default working directory.

#### Scenario: collect uses specified working directory
- **WHEN** `node sai/tools/commit.js collect --json --cwd /path/to/repo` is called
- **THEN** all git commands (`git status`, `git diff --cached`, `git log`) execute in the specified directory

### Requirement: collect is read-only and makes no git mutations

The `collect` subcommand SHALL perform only read-only git operations: `git status --short`, `git diff --cached --stat`, `git diff --cached --name-status`, `git diff --cached`, and `git log -N`.

#### Scenario: collect produces no side effects
- **WHEN** `node sai/tools/commit.js collect --json` executes
- **THEN** no files are modified, no git state changes, and the working tree is left unchanged

### Requirement: collect --amend reports amend target and accepts empty staging area

The `collect` subcommand SHALL accept `--amend` to report information about the previous commit instead of the staged diff. When invoked with `--amend`, collect SHALL exit 0 even with an empty staging area, because a message-only amend is legitimate; it SHALL exit 1 only when there is no commit to amend at all. The returned object SHALL include an `amend_target` object with `sha` (an abbreviated commit SHA), `subject` (the commit subject line), and `already_pushed` (a boolean indicating whether the commit exists in any tracked remote).

#### Scenario: collect --amend returns amend target with SHA and subject
- **WHEN** `node sai/tools/commit.js collect --json --amend` is called on a repository with commit history
- **THEN** it exits with code 0 and returns an `amend_target` object containing `sha`, `subject`, and `already_pushed` fields

#### Scenario: collect --amend exits 1 only when no commit to amend
- **WHEN** `node sai/tools/commit.js collect --json --amend` is called on a repository with no commits
- **THEN** it exits with code 1

#### Scenario: collect --amend already_pushed is derived from git remote state
- **WHEN** `node sai/tools/commit.js collect --json --amend` inspects whether the amend target has been pushed
- **THEN** it queries git's tracked remote state to determine `already_pushed` rather than assuming a remote name

#### Scenario: collect --amend succeeds with empty staging area
- **WHEN** `node sai/tools/commit.js collect --json --amend` is called with no staged changes
- **THEN** it exits with code 0 and returns the amend target, because a message-only amend requires no staged files

