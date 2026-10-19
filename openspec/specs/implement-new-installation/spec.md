# implement-new-installation Specification

## Purpose
TBD - created by archiving change sai-build-new-walking-skeleton. Update Purpose after archive.

## Requirements

### Requirement: Implement-new family wrappers on both harnesses

Claude Code and opencode SHALL each ship `sai-3-implement.md` and `sai-build.md` command wrappers. Each wrapper SHALL fetch only the harness fetch skill and its coordinator card (`sai/commands/implement/coordinator.md` or `sai/commands/build/coordinator.md`), SHALL carry the clean-start preamble, SHALL forward an InvocationEnvelope with `command_name` `implement` or `build`, and SHALL NOT fetch a boot adapter or a command bootstrap. Both wrappers SHALL appear in `fixtures/thin-command-wrappers-baseline.json` with their fetch lines.

#### Scenario: Wrapper fetch lines

- **WHEN** either harness's wrapper is inspected
- **THEN** its fetch lines are exactly the harness fetch skill and its coordinator card and match the baseline entry.

### Requirement: Manifest registration of commands and workers

`sai/install-manifest.json` SHALL assign `sai-3-implement` the `implement-command` profile and `sai-build` the `build-command` profile. Both workers, `sai-3-red-worker` and `sai-3-green-worker`, SHALL be assigned the `worker-execution` profile and SHALL appear in the worker matrix after the existing roles with the binding stems and phases declared for them, the budget tier, and their contracts `sai/commands/implement/red-worker.md` and `green-worker.md`, each with a Claude Code and an opencode managed agent projection.

#### Scenario: Matrix expansion includes the new workers

- **WHEN** the manifest expands for either harness
- **THEN** one binding and one managed agent materialize for each of `sai-3-red-worker` and `sai-3-green-worker`.

### Requirement: Model customization lists the family

The model-customization menu SHALL list `sai-build` and `sai-3-implement` as commands, list both workers `sai-3-red-worker` and `sai-3-green-worker`, and group the two workers under `sai-3-implement`.

#### Scenario: Menu grouping

- **WHEN** the model-customization menu is rendered
- **THEN** `sai-3-red-worker` and `sai-3-green-worker` appear under `sai-3-implement`.
