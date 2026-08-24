# auto-fast-hands-worker Specification

## Purpose
TBD - created by archiving change auto-fast-selector-option. Update Purpose after archive.
## Requirements
### Requirement: Closed-order execution

The hands worker SHALL execute exactly this order and nothing else: exact-path validated-content writes under `openspec/changes/{name}/`; the existing archive read-only pre-flight against those actual written artifacts (classification, unchecked-item scan, delta-spec assessment including missing-main-spec additions, and archive-target collision check); upstream delta-spec sync followed by re-reading synced targets to confirm they match the change directory; the archive move of `openspec/changes/{name}/` to `openspec/changes/archive/YYYY-MM-DD-{name}/` using the supplied date prefix, failing rather than overwriting an existing target; `git add` of exactly the supplied owned path set; commit-message authoring from staged state only under commit-rules; and the HEREDOC-form local commit. A payload that skips a step, reorders steps, adds a step, or names a path or action outside this list MUST be rejected by returning `failed` naming the rejected step, having executed nothing.

The pre-flight SHALL run after the exact-path writes and before sync, archive
move, staging, or commit. It SHALL not be replaced by an in-memory check or a
second writer, and the supplied validated contents SHALL remain byte-for-byte
unchanged between schema validation and mutation.

#### Scenario: Deviating payload rejected

- **WHEN** a payload names an action outside the closed list or alters the step order
- **THEN** the worker returns failed naming the rejected step with nothing executed

### Requirement: Owned staging only

Staging SHALL cover exactly the supplied owned path set — the reconstructed artifacts now under `archive/`, the synced main specs, and the implementer's listed production-code paths. `git add -A`, `git add .`, and any path outside the supplied set MUST NOT be used, and unrelated dirty worktree files MUST remain unstaged.

#### Scenario: Unrelated dirty files stay out

- **WHEN** the worktree contains unrelated dirty files at staging time
- **THEN** only the supplied owned paths enter the index and the unrelated files remain unstaged

### Requirement: Local-only commit

The worker SHALL execute the commit locally with the HEREDOC form and MUST NEVER push, amend, or force. On success its summary SHALL report, in order: the written artifact paths, the archive pre-flight result, the sync result, the archive destination directory, the staged path count, and the commit subject line.

#### Scenario: Missing change directory is materialized before pre-flight

- **WHEN** the change directory does not exist before an Auto (fast implementation) hands run
- **THEN** the hands worker writes the validated drafts, runs archive classification, unchecked-item scanning, delta assessment, and collision checking against those files, and only then continues to sync, move, stage, and commit

#### Scenario: Successful closed-order run

- **WHEN** all seven steps complete exactly as ordered
- **THEN** the completed result reports the written paths, pre-flight result, sync result, archive destination, staged path count, and commit subject in order, with no push performed
