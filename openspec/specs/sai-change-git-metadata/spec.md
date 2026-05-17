# sai-change-git-metadata Specification

## Purpose
TBD - created by archiving change branch-name-prompt-on-implement. Update Purpose after archive.
## Requirements
### Requirement: sai-3-implement persists the resolved branch name in .openspec.yaml
After the branch name is resolved via the sai-implement-branch-prompt, `/sai-3-implement` SHALL write the resolved name to `openspec/changes/{name}/.openspec.yaml` under the key `git.branch` BEFORE generating `implementation.md`.

The write MUST use YAML merge semantics — all existing keys in `.openspec.yaml` (e.g. `approval.specs`) SHALL remain intact after the write.

This capability is OPTIONAL. If not implemented, downstream commands SHALL NOT require `git.branch` to be present in `.openspec.yaml`.

#### Scenario: branch name written to .openspec.yaml before implementation.md
- **WHEN** the user resolves the branch name to `feature/JIRA-123` during `/sai-3-implement my-change`
- **THEN** `openspec/changes/my-change/.openspec.yaml` contains `git.branch: feature/JIRA-123` after the command completes
- **THEN** `openspec/changes/my-change/.openspec.yaml` still contains `approval.specs.approved_at` (pre-existing key is not removed)
- **THEN** `implementation.md` is written after the `.openspec.yaml` update

#### Scenario: downstream commands can read git.branch without re-prompting
- **WHEN** `openspec/changes/my-change/.openspec.yaml` contains `git.branch: feature/JIRA-123`
- **THEN** `/sai-5-review` MAY read `git.branch` to identify the branch to diff, without presenting a separate branch-name prompt
- **THEN** `/sai-pr` MAY read `git.branch` to populate the base-branch reference, without presenting a separate branch-name prompt

#### Scenario: absence of git.branch does not break downstream commands
- **WHEN** `openspec/changes/my-change/.openspec.yaml` does NOT contain a `git` key (optional capability not implemented)
- **THEN** `/sai-5-review` and `/sai-pr` SHALL NOT fail — they fall back to their existing branch-detection behavior

