# sai-change-git-metadata Specification

## Purpose
Keep downstream commands independent of any branch metadata in `.openspec.yaml`.

## Requirements
### Requirement: Downstream commands do not depend on `git.branch`
`/sai-3-implement` resolves no branch (see `sai-implement-branch-prompt`), so it SHALL NOT write a `git.branch` key to `openspec/changes/{name}/.openspec.yaml`. Downstream commands SHALL NOT require `git.branch` and SHALL use their own branch detection.

#### Scenario: absence of git.branch does not break downstream commands
- **WHEN** `openspec/changes/my-change/.openspec.yaml` does NOT contain a `git` key
- **THEN** `/sai-5-review` and `/sai-pr` SHALL NOT fail — they use their existing branch-detection behavior

#### Scenario: implement leaves .openspec.yaml without branch metadata
- **WHEN** `/sai-3-implement my-change` completes
- **THEN** `openspec/changes/my-change/.openspec.yaml` carries no `git.branch` key written by the implement run
