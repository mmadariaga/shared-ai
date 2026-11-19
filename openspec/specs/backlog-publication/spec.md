# backlog-publication Specification

## Purpose
TBD - created by archiving change group-post-crystallization-question-rounds. Update Purpose after archive.

## Requirements

### Requirement: Prepare a publication proposal for a caller without publishing

On request from any workflow, `to-backlog` SHALL run its inspection and review steps and return the full publication proposal instead of asking: destination, repository and visibility, final title and description (or the complete parent and children of a slice set), the baseline version for an update, the confirmation token, and the confirm / edit / cancel question its standalone confirmation prompt would ask. Preparation SHALL publish nothing, create no destination, and write no remote state. The skill SHALL NOT name or depend on its caller, and standalone use SHALL keep its existing confirmation flow unchanged.

#### Scenario: Caller requests preparation

- **WHEN** a workflow asks `to-backlog` to prepare a publication for a crystallized proposal
- **THEN** the skill returns the complete proposal with its confirmation token and question, and publishes nothing

### Requirement: Act only on a supplied answer bound to the exact proposal

`to-backlog` SHALL act on a supplied answer only when it binds the exact proposal the skill prepared: the same destination, the same final content, the same baseline version, and the same confirmation token. Confirm SHALL continue to publication with the unchanged token; cancel SHALL end without publication; edit SHALL return to inspection and ask a full confirmation of the edited proposal with the standalone prompt, never with a supplied answer. On a mismatch or a missing answer, the skill SHALL ask with its standalone prompt. A prior general grant, unattended mode, or an answer to a different question SHALL NOT count as confirmation. The one exception SHALL be the `publication.autoApprove` project setting: a prepared proposal that reports `auto_approve: true` SHALL be published without a supplied answer. A slice-set publication SHALL accept either its existing explicit confirmation or a supplied answer that binds the entire set proposal.

#### Scenario: Supplied answer no longer matches

- **WHEN** a supplied confirm answer carries a confirmation token that differs from the prepared proposal's token
- **THEN** the skill does not publish and asks with its standalone confirmation prompt

#### Scenario: Supplied confirm matches

- **WHEN** a supplied confirm answer binds the prepared destination, content, baseline version, and confirmation token
- **THEN** the skill publishes with the unchanged token

#### Scenario: Auto-approved proposal needs no supplied answer

- **WHEN** a prepared proposal reports `auto_approve: true` and no answer is supplied
- **THEN** the skill publishes it with the unchanged token without asking

### Requirement: Backlog skill files stay caller-agnostic

`skills/universal/to-backlog/SKILL.md` and `skills/universal/to-backlog/slice-set.md` SHALL contain no reference to `sai-explore` or Explore. The slice-set correspondence hand-off to `backlog-origin-transport.md` SHALL apply whenever the caller stores the blocks for later planning dispatch.

#### Scenario: Caller references are absent

- **WHEN** the to-backlog skill files are searched for `sai-explore` or `Explore`
- **THEN** no match is found

### Requirement: Shared bounded recovery of approved new-issue publication

For failed new-issue publication, individual or sliced sets, to-backlog SHALL follow one shared recovery sequence identically in Claude Code and opencode. Before recovery it SHALL warn with completed work, pending work, known issue links and the private receipt path. It SHALL verify directly using the existing recovery operation without asking permission for read-only queries, including partial outcomes. Verification MAY update the local receipt but SHALL NOT modify remote state. Verified complete publication SHALL be reported as success without another write. When all pending actions are verifiable and remain within the original approval, the workflow SHALL retry them once using the returned continuation token as confirmation and `automatic_retry: true`. After a failed retry it SHALL verify again and consult the user with completed and pending state.

#### Scenario: Partial publication has verifiable pending work

- **WHEN** a publication fails after completing some approved actions and verification establishes the remaining actions
- **THEN** the workflow warns, verifies without another permission question and performs one automatic retry of only those pending actions within the original approval.

#### Scenario: Work is already complete

- **WHEN** direct verification confirms the complete approved publication
- **THEN** the workflow reports success without repeating actions, requesting another approval or consuming the automatic retry.

#### Scenario: Retry remains incomplete

- **WHEN** the single automatic retry fails to complete publication
- **THEN** the workflow verifies again and consults the user with the verified remaining state instead of starting another automatic retry.

### Requirement: Automatic retry accounting is durable and publication-wide

The publication receipt SHALL record `automatic_retry_consumed: true` before executing an automatic retry. The allowance SHALL apply once to the whole approved publication, including pending creation, membership and relationships, not separately to each action. Recovery and re-entry SHALL retain the consumed allowance. Read-only verification and already-completed results SHALL consume nothing. Further continuation after consumption SHALL require an explicit user response and a fresh verified token without `automatic_retry`. The workflow SHALL NOT restart publication with a new receipt to bypass the limit.

#### Scenario: A retry fails after its allowance is recorded

- **WHEN** an automatic retry consumes its allowance and a remote operation then fails
- **THEN** subsequent recovery retains the consumed allowance and another automatic attempt is rejected before any pending remote write.

#### Scenario: User continues after exhaustion

- **WHEN** the user explicitly chooses further continuation after verification of an exhausted publication
- **THEN** the workflow uses the fresh verified confirmation token without the automatic retry flag and retains previously completed work.

### Requirement: Recovery preserves the original approval and uncertain outcomes

The covered retry SHALL preserve approved content, destination, visibility and relationship representation and retain exact authorization checks. A scope change, including written fallback for failed native relationships, SHALL require renewed full review and approval. A matching issue or an empty candidate list after a lost creation response SHALL NOT prove the creation outcome; an attempted creation with unknown outcome SHALL require user identification rather than duplicate-producing replay. Existing-issue content edits SHALL receive no automatic mutation retry under this contract and SHALL retain their update recovery rules.

#### Scenario: Relationship representation changes

- **WHEN** recovery proposes replacing native relationships with written references
- **THEN** automatic retry rejects the changed representation and the workflow obtains renewed approval before that change.

#### Scenario: Creation remains uncertain

- **WHEN** verification cannot identify the result of an attempted creation
- **THEN** the workflow preserves known results and consults the user without repeating the uncertain creation.

#### Scenario: Existing content update fails

- **WHEN** publication was an edit to existing issue content rather than a new-issue publication
- **THEN** verification remains read-only and the shared creation retry allowance does not authorize another update mutation.

### Requirement: Backlog tool external processes are bounded per process

Every external process the backlog tools start (`gh`, `glab`, `git`, `az`, `where.exe`, and the Azure SDK Python process) SHALL run through one shared helper with a fixed limit of 120 s per process. The limit SHALL bound each process, never a whole tool invocation. A process that exceeds the limit SHALL be stopped, and the tool SHALL fail with reason `process-timeout` and a message that names the stalled step and the limit and states that nothing is reported as loaded or written by that step. The step name SHALL be the program and its first subcommand words, never the interpreter path or data arguments. A descendant that holds a process's output pipe open SHALL NOT extend the wait past the limit: when the process itself has already exited with a status, the call SHALL return no later than the limit with that process's own exit status and SHALL NOT report `process-timeout`. Every other process outcome SHALL keep its existing handling, so a run whose processes all finish within the limit keeps its current outputs, statuses, and receipts.

#### Scenario: A process exceeds the limit

- **WHEN** a `gh`, `glab`, `git`, or `az` process started by a backlog tool runs longer than 120 s
- **THEN** the tool fails with reason `process-timeout` and a message naming the step, such as `gh issue create`, and the 120 s limit.

#### Scenario: Many short processes in one invocation

- **WHEN** a `publish-set` or a paginated read starts many processes whose total time exceeds 120 s while each process finishes within the limit
- **THEN** the invocation continues and completes without a `process-timeout` failure.

#### Scenario: A descendant holds the output pipe open

- **WHEN** a started process exits while a detached descendant keeps its standard output open
- **THEN** the call returns no later than the 120 s limit with the exited process's own exit status, and it is not reported as `process-timeout`.

#### Scenario: A timeout before the first write

- **WHEN** a `to-backlog` operation fails with `process-timeout` before publication
- **THEN** its `failure_before_publication` output carries `reason: process-timeout` and the step message, and no issue or work item is created.

#### Scenario: Processes finish within the limit

- **WHEN** every external process of a backlog operation finishes within 120 s
- **THEN** the operation returns the same output, status, and receipt it returned before the limit existed.

### Requirement: Process groups of backlog tool external processes end with their bound

The shared helper that runs every external process of the backlog tools, `to-pr`, and plan publication SHALL be asynchronous and SHALL start each process as the leader of its own process group. When a process reaches its limit, the helper SHALL end the whole group, every descendant included (`process.kill(-pid)` on POSIX, `taskkill /T` on Windows), and the caller SHALL receive the `process-timeout` failure. While a started group is running, the helper SHALL end that group when the calling process receives `SIGINT` or `SIGTERM` or exits, because a group started apart from the terminal no longer receives its interrupt. Claude Code and opencode SHALL behave the same.

#### Scenario: A grandchild outlives its parent's limit

- **WHEN** a process started through the helper spawns a descendant and the process exceeds its limit
- **THEN** the helper ends the process and the descendant together and the caller receives a `process-timeout` failure.

#### Scenario: The calling tool is interrupted

- **WHEN** the calling tool receives `SIGINT` or `SIGTERM` while a process group started through the helper is still running
- **THEN** the helper ends that process group before the default action of the signal applies.

#### Scenario: A process finishes within the limit

- **WHEN** a process started through the helper exits within its limit
- **THEN** the helper resolves with the process's exit status, standard output, and standard error, and removes its interrupt handlers once no group is running.

### Requirement: Auto-approval setting is bound into every backlog proposal

`to-backlog.js` SHALL read `publication.autoApprove` itself, once per invocation, and SHALL pass its value to the selected provider adapter; the skill SHALL NOT read it. Only a `true` that `.sai/settings.local.jsonc` holds SHALL count as the setting being `true`; a `true` that only `.sai/settings.jsonc` holds SHALL read as `false`. When the setting is `true`, the GitHub, GitLab, and Azure DevOps adapters SHALL add `auto_approve: true` to every proposal before its digest: create, update, slice-set, and slice-set update proposals, including each changed item of a slice-set update. When the setting is absent, `false`, not a boolean, or a `true` held only by the base file, no proposal SHALL carry `auto_approve`, and its token SHALL equal the token computed without the setting. A token taken under one value of the setting SHALL NOT publish under the other, and the publication SHALL end as `failure_before_publication` with nothing created or updated. When `.sai/settings.jsonc` holds `publication.autoApprove: true`, the JSON output of every adapter dispatch SHALL carry in `warnings` the consent warning that names `publication.autoApprove` and says the value grants consent only from `.sai/settings.local.jsonc`, once, and the skill SHALL show it like any other warning.

#### Scenario: Create proposal binds the key

- **WHEN** `query` runs once with the setting absent and once with it `true`
- **THEN** the first proposal carries no `auto_approve`, the second carries `auto_approve: true`, and the two confirmation tokens differ

#### Scenario: Update proposal binds the key

- **WHEN** `query-update` runs once with the setting absent and once with it `true`
- **THEN** only the second proposal carries `auto_approve: true`, the tokens differ, and an update with the first token under the setting `true` returns `failure_before_publication` with no mutation

#### Scenario: Slice-set proposals bind the key

- **WHEN** the set and set-update queries run once with the setting absent and once with it `true`
- **THEN** only the second proposals carry `auto_approve: true`, every changed item of the set-update proposal carries it, the tokens differ, and `publish-set` with a token of the other value returns `failure_before_publication` and creates nothing

#### Scenario: Setting read once from the project settings

- **WHEN** `to-backlog.js` runs in a project whose `.sai/settings.local.jsonc` sets `publication.autoApprove` to `true`, to `false`, to `"yes"`, or not at all
- **THEN** the value passed to the adapter is `true` for the first and `false` for the other three

#### Scenario: Base-file true grants nothing and warns
- **WHEN** only `.sai/settings.jsonc` sets `publication.autoApprove` to `true`, then `.sai/settings.local.jsonc` also sets it to `false`, and then the local file sets it to `true`
- **THEN** the value passed to the adapter is `false`, `false`, and `true`, and each of the three invocations carries one consent warning naming `publication.autoApprove` and `.sai/settings.local.jsonc`

### Requirement: Auto-approved backlog publication

When the `ready` proposal reports `auto_approve: true`, the `to-backlog` skill SHALL show the complete proposal its section and branch require (destination, visibility with the public warning, title, description, planning changes, and for an update the baseline, the changes, and the provider's non-atomic update note), ask no approval question, and publish with the unchanged confirmation token. A slice-set proposal SHALL be shown completely with its concurrency note and published the same way. The skill SHALL ask its approval question as usual when the proposal was prepared again after a `stale-baseline` or `divergent` result, when the user asked in the conversation to review before publishing (the setting stays unchanged), and when the proposal does not report `auto_approve: true`. A pending retry after a failed or uncertain publication SHALL be auto-approved again only when recovery reports that the remote content still matches the baseline.

#### Scenario: Auto-approved create publishes without the question

- **WHEN** a create proposal reports `auto_approve: true` and the user has not asked to review
- **THEN** the skill shows the complete proposal and publishes with the unchanged token without asking

#### Scenario: Stale baseline renewal is asked

- **WHEN** an update proposal reporting `auto_approve: true` is prepared again after a `stale-baseline` result
- **THEN** the skill asks its approval question for the renewed proposal
