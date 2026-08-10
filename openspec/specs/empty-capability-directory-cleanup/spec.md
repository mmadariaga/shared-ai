# empty-capability-directory-cleanup Specification

## Purpose

TBD — capability introduced by the retired orphan-inline-callers change.

## Requirements

### Requirement: Empty capability directories are removed from the working tree

The three empty capability directories `openspec/specs/implementation-continuation/`, `openspec/specs/inline-coordinator-adapter/`, and `openspec/specs/sai-2-continue-branch-flow/` SHALL be removed from the working tree. The directories are untracked and absent from HEAD — git neither tracks nor clones empty directories, and a fresh clone has never contained them — so this is a working-tree-local cleanup with no tracked-file deletion and no CI-observable invariant. The archived `retire-inline-harness-model` delta's repository-level obligation, deleting `openspec/specs/inline-coordinator-adapter/spec.md` (openspec/changes/archive/2026-08-06-retire-inline-harness-model/implementation.md:50), was already satisfied in the repository; this removal completes the delta's local residue. `openspec/specs/_archived/**` and `openspec/changes/archive/**` SHALL NOT be touched.

#### Scenario: The three directories are absent from the working tree

- **WHEN** the working tree under `openspec/specs/` is inspected after the cleanup
- **THEN** none of the three named directories exists
- **AND** the cleanup SHALL tolerate a tree where one or more of them is already absent

#### Scenario: The archived delta's local residue is closed

- **WHEN** the archived `retire-inline-harness-model` implementation record is re-read
- **THEN** the record's tracked deletion of `openspec/specs/inline-coordinator-adapter/spec.md` remains the repository-level completion of the delta
- **AND** this change removes the untracked residue directory from the working tree without altering the archived record or any archived change artifact
