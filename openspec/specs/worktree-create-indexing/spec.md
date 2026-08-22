# worktree-create-indexing Specification

## Purpose

TBD: best-effort CodeGraph indexing of freshly created worktrees performed by the `/sai-worktree` Create action.

## Requirements

### Requirement: Best-effort CodeGraph indexing after worktree creation

After `git worktree add` succeeds in the Create action, the `/sai-worktree` command SHALL run a CodeGraph indexing pass on the freshly created worktree synchronously, as an inline step of the Create action: it SHALL print one pre-announcement line stating that `codegraph init` is about to run in the new worktree, run `codegraph init <sibling-path>` with the path quoted per the same Windows PowerShell quoting notes already applied to git invocations, and then print exactly one one-line result notice for whichever outcome occurred — success (index created), `codegraph` binary not available, or initialization failure including its reason.

#### Scenario: Index created successfully
- **WHEN** the Create action has finished `git worktree add` and `codegraph init <sibling-path>` exits successfully
- **THEN** one pre-announcement line precedes the run and exactly one one-line notice reports that the index was created

#### Scenario: Binary absent
- **WHEN** the `codegraph` binary is not available when the Create action reaches the indexing pass
- **THEN** exactly one one-line notice states the binary is unavailable instead of silently skipping

#### Scenario: Initialization failure
- **WHEN** `codegraph init <sibling-path>` fails
- **THEN** exactly one one-line notice reports the failure including its reason

### Requirement: The indexing pass never fails the Create action

The CodeGraph indexing pass SHALL never roll back, never auto-retry, and never fail the Create action: every outcome — success, binary absence, or initialization failure — SHALL continue to the post-create inventory re-render and selector re-presentation with the freshly created worktree left in place.

#### Scenario: Failed indexing leaves the worktree intact
- **WHEN** the indexing pass fails after the worktree was created
- **THEN** the worktree remains registered and checked out, nothing is rolled back, no retry runs, and the command proceeds to re-render the inventory and re-present the selector

### Requirement: Indexing runs only for the Create action

Only the Create action SHALL invoke the CodeGraph indexing pass; Delete actions and inventory re-renders SHALL never print the pre-announcement and SHALL never run `codegraph init`.

#### Scenario: Deletion triggers no indexing
- **WHEN** a worktree is removed through the Delete action
- **THEN** no pre-announcement line is printed and `codegraph init` is never invoked
