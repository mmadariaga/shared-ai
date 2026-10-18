# build-composition-execution Specification

## Purpose
Define the execution surface the Claude `sai-build` wrapper declares so its chained apply segment runs at apply parity, and the test that pins that wide set.

## Requirements

### Requirement: Chained apply segment runs under apply-parity toolset

The Claude sai-build wrapper SHALL declare the wide execution set of its `build-command` capability profile (shell `*`, write enabled, delegation to the executor, red, green, and review workers) so the chained implement and review segments can perform coordinator-owned git add and git commit, checkbox flips, pre-commit listing, and bounded repairs without re-entering the wrapper.

#### Scenario: Build composition executes owned apply work

- **WHEN** the /sai-build composition runs its chained implement and review segments on Claude Code
- **THEN** coordinator-owned git, checklist, and verification operations execute under the sai-build toolset
