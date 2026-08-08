# installed-prereqs-copy-retirement Specification

## Purpose
TBD - created by archiving change split-prereqs-check-and-paths. Update Purpose after archive.

## Requirements

### Requirement: Manifest retirement record for the stale installed copy

The `sai/install-manifest.json` file SHALL declare a retirement record for the destination `{ class: sai, path: instructions/prereqs.md }` covering both the claude and opencode harnesses, whose `managedHashes` include the SHA-256 of the pre-split `sai/policies/prereqs.md` content (`9AE247A9BB2A03999FE00DC2852530F5AE228E815DC6804CDAD4CC85BC182480`), which is the exact content of the stale installed copies.

#### Scenario: retirement record present

- **WHEN** `sai/install-manifest.json` is inspected after the change
- **THEN** a retirement record exists for `sai/instructions/prereqs.md` declaring both harnesses and the pre-split content hash in `managedHashes`

### Requirement: Stale installed copies removed

On any machine whose harness projections contain the stale `sai/instructions/prereqs.md` copy, running install or doctor SHALL remove that file from both the claude and opencode `sai/instructions/` projections when its content matches a managed hash, leaving no installed file at that path. A copy whose content does not match any managed hash — a user-modified file or a different older version — SHALL NOT be deleted; it SHALL be left in place and reported as an unrecognized retired copy.

#### Scenario: install removes the orphan from both harnesses

- **WHEN** install runs against projections containing `sai/instructions/prereqs.md` with the managed content hash
- **THEN** the file is removed from the claude and opencode projections and no `sai/instructions/prereqs.md` remains

#### Scenario: doctor recognizes the retired copy

- **WHEN** doctor runs against a projection containing `sai/instructions/prereqs.md` with the managed content hash
- **THEN** it reports the file as a recognized retired copy rather than an unexpected or missing file

#### Scenario: drifted copy is preserved and reported

- **WHEN** install or doctor runs against a projection containing `sai/instructions/prereqs.md` whose content does not match any managed hash
- **THEN** the file is left in place, is reported as an unrecognized retired copy, and is never deleted

### Requirement: No repo source reintroduced (regression guard)

The repository SHALL NOT contain a `sai/instructions/prereqs.md` source file after the change. This requirement guards an already-satisfied invariant — the repo-level duplicate was removed by the rename in commit `894122b` — and establishes no new behavior: the only canonical home for prerequisite content SHALL be the two halves under `sai/policies/` (composed through `sai/policies/prereqs.md`).

#### Scenario: instructions path absent from repo

- **WHEN** the repo's `sai/instructions/` directory is inspected after the change
- **THEN** it contains no `prereqs.md` file
