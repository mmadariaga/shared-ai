# plan-artifact-publication Specification

## Purpose
Publish the complete plan of the current change for review through exact authorized document inclusion while preserving unrelated local work.

## Requirements

### Requirement: Inspect complete current-change plan before inclusion

The optional publication action SHALL enumerate current-change proposal, design, tasks, interfaces, control metadata, specifications and optional overview, including pending content and tracked deletions. It SHALL show ignored paths, source branch, full branch commits and diff against the resolved target, warning that other committed changes also enter the request. Detached HEAD, missing plan or unavailable destination SHALL block only publication.

#### Scenario: Ignored plan documents are present
- **WHEN** the completed plan includes ignored metadata, specifications or overview
- **THEN** inspection lists those files and their actual content instead of relying on an empty Git diff, and names every ignored path before inclusion approval.

#### Scenario: Branch contains other committed changes
- **WHEN** the current branch includes changes outside the plan
- **THEN** the workflow displays them before publication and does not describe the request as necessarily documents-only.

#### Scenario: Plan paths are unsafe
- **WHEN** plan discovery encounters a linked ancestor, linked document or non-regular document
- **THEN** inclusion rejects the unsafe plan instead of traversing into unrelated work.

### Requirement: Bind local inclusion to exact authorized documents

The action SHALL require explicit approval of the exact current-change file list and content for one local inclusion commit. Its confirmation SHALL bind HEAD, file content, ignored status and owned index entries. Changes SHALL require renewed review and approval. Only authorized ignored paths MAY bypass ignore rules, using a private index. Unrelated staging, working files and ignore rules SHALL remain unchanged.

#### Scenario: Exact complete plan is approved
- **WHEN** the user approves the listed documents and each ignored path for inclusion
- **THEN** the private-index commit includes only the authorized current-change documents and deletions, preserves unrelated staged and working changes, and synchronizes only owned index entries.

#### Scenario: Approved plan changes
- **WHEN** document content, file list, HEAD or an owned index entry changes after inspection
- **THEN** stale inclusion approval is rejected before committing and the workflow requires fresh review.

#### Scenario: Inclusion is cancelled
- **WHEN** the user cancels local inclusion approval
- **THEN** no plan inclusion commit, dependent push or request mutation runs.

#### Scenario: Plan is already committed
- **WHEN** the authorized plan tree matches HEAD
- **THEN** inclusion returns no changes without creating another commit.

#### Scenario: Local commit fails
- **WHEN** the authorized local commit is rejected by a hook
- **THEN** HEAD, unrelated staging and working files remain unchanged, and the workflow inspects actual effects before any retry.

### Requirement: Keep inclusion distinct from remote publication

After inclusion, the workflow SHALL recollect the same branch and destination through `/to-pr` with an explicit draft request. Local approval SHALL authorize neither push nor request mutation. Exact remote approval SHALL retain independent non-force push and publication tokens. Cancellation or failure SHALL preserve confirmed commits and pushes, report outcomes separately, and use read-only recovery for uncertainty without automatic rollback or implementation.

#### Scenario: Local inclusion completes before remote approval
- **WHEN** plan inclusion created a commit but remote publication is cancelled
- **THEN** that commit remains and no pending remote operation executes.

#### Scenario: Publication is unavailable or uncertain
- **WHEN** access, destination or publishable changes are unavailable, or a remote outcome is uncertain
- **THEN** only publication stops, the completed plan and confirmed effects remain, and the report explains the blocker and continuation through `/to-pr` on the same branch requesting a draft.

#### Scenario: Publication succeeds
- **WHEN** exact remote approval and verified draft publication complete
- **THEN** the same change branch and request remain available for later implementation, with no separate documentation branch, forced push, automatic ready conversion or implementation execution.

### Requirement: Plan inclusion never drops staged content of owned paths

Plan publication SHALL compare the index entry of every owned path with `HEAD` and with the working tree. `plan-query` SHALL return `status: blocked` with reason `staged-content` and SHALL name each owned path whose index entry differs from both. `plan-commit` SHALL block on that result before any write, creating no commit and leaving the real index unchanged. A staged entry equal to `HEAD` or to the working tree SHALL be no obstacle.

#### Scenario: Staged content differs from both HEAD and the working tree

- **WHEN** an owned path has staged content that differs from both `HEAD` and its working-tree content
- **THEN** `plan-query` returns `blocked` naming that path, and `plan-commit` creates no commit and leaves the real index unchanged.

#### Scenario: Staged content matches the working tree

- **WHEN** an owned path's staged content equals its working-tree content
- **THEN** `plan-query` returns `ready` and the inclusion commit proceeds.

### Requirement: Plan publication git calls are bounded and a timed-out commit is read back

Every git call of plan publication SHALL run through the shared asynchronous process helper with its 120 s limit and process-group termination. A call that reaches the limit SHALL end the operation. After a `commit` timeout, plan publication SHALL read `HEAD` back, SHALL return `status: uncertain` with the state of `HEAD` relative to the approved commit, and SHALL NOT repeat the commit on its own.

#### Scenario: The commit reaches the limit

- **WHEN** the plan inclusion commit, a hook included, runs longer than 120 s
- **THEN** its process group ends, plan publication reads `HEAD` back and returns `uncertain` with that `HEAD` state, and no second commit runs.

#### Scenario: Another git call reaches the limit

- **WHEN** a git call of `plan-query` or `plan-commit` other than the commit runs longer than 120 s
- **THEN** the operation ends with the `process-timeout` failure and no later git call of that operation runs.
