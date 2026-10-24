# method-selection Specification

## Purpose
TBD - created by archiving change merge-method-selector. Update Purpose after archive.

## Requirements

### Requirement: Method comes from the invocation arguments

`/sai-merge` SHALL take its integration method from the invocation arguments and SHALL ask no method question: a merge by default, `--rebase` for a rebase, and `--squash` for squash-then-rebase, `--squash` winning when both are given. With nothing to squash, `--squash` SHALL run the plain rebase.

#### Scenario: Squash with nothing to squash

- **WHEN** `--squash` is given and the merge base equals the current `HEAD`
- **THEN** the coordinator runs the plain rebase without a squash commit
