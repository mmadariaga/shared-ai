# plan-artifact-publication Specification

## Purpose
Publish the complete plan of the current change for review through exact authorized document inclusion while preserving unrelated local work.

## Requirements

### Requirement: Inspect complete current-change plan before inclusion

The publication action SHALL run without questions under the run's recorded `yes` publication answer. It SHALL resolve the destination without asking and SHALL run `plan-query`, which enumerates current-change proposal, design, tasks, interfaces, control metadata, specifications and optional overview, including pending content, tracked deletions, ignored paths and the source branch. The request description SHALL NOT claim a documents-only request, because other committed changes on the branch also enter it. A detached HEAD, a missing plan, an unresolved provider, an ambiguous remote or target branch, or an unavailable destination SHALL skip only publication and SHALL name the missing fact.

#### Scenario: Ignored plan documents are present
- **WHEN** the completed plan includes ignored metadata, specifications or overview
- **THEN** `plan-query` lists those files, and the inclusion commit force-adds only those listed ignored paths.

#### Scenario: Branch contains other committed changes
- **WHEN** the current branch includes changes outside the plan
- **THEN** the request description does not describe the request as documents-only.

#### Scenario: Plan paths are unsafe
- **WHEN** plan discovery encounters a linked ancestor, linked document or non-regular document
- **THEN** inclusion rejects the unsafe plan instead of traversing into unrelated work.

#### Scenario: Destination needs a question
- **WHEN** the provider is unresolved or the remote or target branch is ambiguous
- **THEN** no question is asked, publication is skipped, and the outcome names the missing fact.

### Requirement: Bind local inclusion to exact authorized documents

Without the unattended mode, the action SHALL require explicit approval of the exact current-change file list and content for one local inclusion commit. Its confirmation SHALL bind HEAD, file content, ignored status and owned index entries. Changes SHALL require renewed review and approval. In the unattended mode of `plan-commit`, the confirmation of the plan just queried SHALL replace the approval token, and the recheck after snapshotting SHALL still end the commit when the plan, an owned index entry or HEAD change. Only the listed ignored paths MAY bypass ignore rules, using a private index. Unrelated staging, working files and ignore rules SHALL remain unchanged.

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

#### Scenario: Unattended inclusion commits the queried plan
- **WHEN** `plan-commit --unattended` runs without `approved` or `confirmation` fields
- **THEN** it commits only the paths `plan-query` lists through a private index, and it ends without a commit when the plan, an owned index entry or HEAD changed while the commit was prepared.

### Requirement: Keep inclusion distinct from remote publication

After inclusion, the workflow SHALL recollect the same branch and destination through `/to-pr` with an explicit draft request and SHALL run `push --unattended`, `prepare`, and `publish --unattended`. The recorded `yes` answer SHALL be the only authorization of the push and the request mutation. A refusal, a rejected push, or any failure SHALL skip the rest of the publication without a question, without a retry, and without force. Failure SHALL preserve confirmed commits and pushes, report the local inclusion, the push, and the request outcome separately, and use read-only recovery for uncertainty without automatic rollback or implementation.

#### Scenario: Local inclusion completes before remote approval
- **WHEN** plan inclusion created a commit but the push or the publication is refused or fails
- **THEN** that commit remains, no later remote operation executes, and the outcome reports the commit separately from the failed step.

#### Scenario: Publication is unavailable or uncertain
- **WHEN** access, destination or publishable changes are unavailable, or a remote outcome is uncertain
- **THEN** only publication stops, `recover` runs once read-only on an uncertain result, the completed plan and confirmed effects remain, and the report explains the blocker and continuation through `/to-pr` on the same branch requesting a draft.

#### Scenario: Publication succeeds
- **WHEN** unattended draft publication completes and is verified
- **THEN** the same change branch and request remain available for later implementation, with no separate documentation branch, forced push, automatic ready conversion or implementation execution.

#### Scenario: Merged or closed request
- **WHEN** the branch has no open request and its last request was merged or closed
- **THEN** publication is skipped, the outcome names that request, and no request is reopened or created.

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

### Requirement: Plan publication lists only the current plan documents

`sai/tools/plan-publication.js` SHALL list as plan documents `proposal.md`, `design.md`, `tasks.md`, and `.openspec.yaml`, plus the change's specifications, and SHALL NOT list `interfaces.md` or `change-overview.md`. The code commits of the design segment (stubs and plan tests) SHALL reach the draft pull request through the existing whole-branch `to-pr.js push`, with no publication change for them.

#### Scenario: Plan documents of a new plan

- **WHEN** `plan-query` enumerates the plan documents of a change
- **THEN** it lists no `interfaces.md` and no `change-overview.md`

#### Scenario: Plan tests reach the draft request

- **WHEN** a `/sai-plan` run with a `yes` publication answer pushes the branch
- **THEN** the design segment's test and stub commits are part of the pushed branch
