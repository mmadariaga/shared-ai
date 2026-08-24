# auto-fast-hands-worker Specification

## Purpose
TBD - created by archiving change auto-fast-selector-option. Update Purpose after archive.
## Requirements
### Requirement: Closed-order execution

The hands worker SHALL execute exactly this order and nothing else: exact-path validated-content writes under `openspec/changes/{name}/`; upstream delta-spec sync followed by re-reading synced targets to confirm they match the change directory; the archive move of `openspec/changes/{name}/` to `openspec/changes/archive/YYYY-MM-DD-{name}/` using the supplied date prefix, failing rather than overwriting an existing target; `git add` of exactly the supplied owned path set; commit-message authoring from staged state only under commit-rules; and the HEREDOC-form local commit. A payload that skips a step, reorders steps, adds a step, or names a path or action outside this list MUST be rejected by returning `failed` naming the rejected step, having executed nothing.

#### Scenario: Deviating payload rejected

- **WHEN** a payload names an action outside the closed list or alters the step order
- **THEN** the worker returns failed naming the rejected step with nothing executed

### Requirement: Owned staging only

Staging SHALL cover exactly the supplied owned path set — the reconstructed artifacts now under `archive/`, the synced main specs, and the implementer's listed changed paths. `git add -A`, `git add .`, and any path outside the supplied set MUST NOT be used, and unrelated dirty worktree files MUST remain unstaged.

#### Scenario: Unrelated dirty files stay out

- **WHEN** the worktree contains unrelated dirty files at staging time
- **THEN** only the supplied owned paths enter the index and the unrelated files remain unstaged

### Requirement: Local-only commit

The worker SHALL execute the commit locally with the HEREDOC form and MUST NEVER push, amend, or force. On success its summary SHALL report, in order: the written artifact paths, the sync result, the archive destination directory, the staged path count, and the commit subject line.

#### Scenario: Successful closed-order run

- **WHEN** all six steps complete exactly as ordered
- **THEN** the completed result reports the written paths, sync result, archive destination, staged path count, and commit subject in order, with no push performed

### Requirement: Two-payload closed execution

The hands worker SHALL execute exactly one envelope-selected payload: `--autofast-materialize` performs exactly the validated writes and the spec sync then stops, and `--autofast-finish` performs exactly the archive move, owned staging, commit-message authoring, and the local commit. A payload bearing both markers or neither, skipping or reordering its own steps, adding a step, or naming a foreign path or action SHALL be rejected with nothing executed.

#### Scenario: Materialize payload stops before mutation gates

- **WHEN** the envelope carries `--autofast-materialize`
- **THEN** the worker writes the supplied validated contents, runs the spec sync, and performs no archive move, staging, or commit

#### Scenario: Finish payload assumes gated artifacts

- **WHEN** the envelope carries `--autofast-finish` after gate resolution
- **THEN** the worker moves the archived directory, stages exactly the owned path set, authors the message from staged state, and commits locally without pushing

#### Scenario: Malformed marker rejected

- **WHEN** a payload bears both markers or neither
- **THEN** the worker returns failed naming the rejection having executed nothing

