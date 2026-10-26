# method-selection Specification

## Purpose
TBD - created by archiving change merge-method-selector. Update Purpose after archive.

## Requirements

### Requirement: Method comes from the invocation arguments

`/sai-merge` SHALL take its integration method from the invocation arguments when they carry one: `--rebase` for a rebase and `--squash` for squash-then-rebase, `--squash` winning when both are given, and an explicit option SHALL keep the run free of the method question. When the arguments carry neither option, the coordinator SHALL ask the method (merge, rebase, or squash) through the native picker before the baseline suite run, and SHALL use a merge when no native picker is available. With nothing to squash, `--squash` SHALL run the plain rebase.

#### Scenario: Squash with nothing to squash

- **WHEN** `--squash` is given and the merge base equals the current `HEAD`
- **THEN** the coordinator runs the plain rebase without a squash commit

#### Scenario: Explicit option asks no method

- **WHEN** `/sai-merge feature --rebase` is invoked
- **THEN** the run rebases onto `feature` and asks no method question

#### Scenario: Missing option asks the method

- **WHEN** `/sai-merge feature` is invoked on a harness with a native picker
- **THEN** the coordinator asks for merge, rebase, or squash before the baseline runs and uses the answer as the method
