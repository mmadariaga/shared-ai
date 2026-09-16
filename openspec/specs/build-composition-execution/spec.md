# build-composition-execution Specification

## Purpose
TBD - created by archiving change fix-review-pass12-sai-build-tools. Update Purpose after archive.

## Requirements

### Requirement: Chained apply segment runs under apply-parity toolset

The Claude sai-build wrapper SHALL declare the exact apply-parity allowed-tools execution set so the chained apply segment can perform coordinator-owned git add and git commit, checkbox flips, pre-commit listing, and bounded repairs without re-entering the apply wrapper.

#### Scenario: Build composition executes owned apply work

- **WHEN** the /sai-build composition runs its chained apply segment on Claude Code
- **THEN** coordinator-owned git, checklist, and verification operations execute under the sai-build toolset

### Requirement: Build parity test pins wide execution set

The build coordinator test suite SHALL assert that the sai-build allowed-tools line equals the sai-4-apply allowed-tools line and matches the wide execution set without node-scoped narrowing.

#### Scenario: Parity regression is caught

- **WHEN** either wrapper allowlist drifts from the wide execution set
- **THEN** the parity test fails before the composition ships
