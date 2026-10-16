# implement-new-installation Specification

## Purpose
TBD - created by archiving change sai-build-new-walking-skeleton. Update Purpose after archive.

## Requirements

### Requirement: Implement-new family wrappers on both harnesses

Claude Code and opencode SHALL each ship `sai-3-implement-new.md` and `sai-build-new.md` command wrappers. Each wrapper SHALL fetch only the harness fetch skill and its coordinator card (`sai/commands/implement-new/coordinator.md` or `sai/commands/build-new/coordinator.md`), SHALL carry the clean-start preamble, SHALL forward an InvocationEnvelope with `command_name` `implement-new` or `build-new`, and SHALL NOT fetch a boot adapter or a command bootstrap. Both wrappers SHALL appear in `fixtures/thin-command-wrappers-baseline.json` with their fetch lines.

#### Scenario: Wrapper fetch lines

- **WHEN** either harness's `-new` wrapper is inspected
- **THEN** its fetch lines are exactly the harness fetch skill and its coordinator card and match the baseline entry.

### Requirement: Manifest registration of commands and workers

`sai/install-manifest.json` SHALL assign `sai-3-implement-new` the `implement-new-command` profile and `sai-build-new` the `build-new-command` profile, where `implement-new-command` extends `apply-coordinator`, adds the `safe-operations` skill, and delegates to the executor, `sai-red-new-worker`, and `sai-green-new-worker`, and `build-new-command` extends it. Both workers SHALL be assigned the `worker-execution` profile and SHALL appear in the worker matrix after the existing roles as phases `red-new` and `green-new` with binding stems `red-new` and `green-new`, the budget tier, and their contracts `sai/commands/implement-new/red-worker.md` and `green-worker.md`, each with a Claude Code and an opencode managed agent projection.

#### Scenario: Matrix expansion includes the new workers

- **WHEN** the manifest expands for either harness
- **THEN** one binding and one managed agent materialize for each of `sai-red-new-worker` and `sai-green-new-worker`.

### Requirement: Model customization lists the family

The model-customization menu SHALL list `sai-build-new` and `sai-3-implement-new` as commands, list both new workers, and group the two workers under `sai-3-implement-new`.

#### Scenario: Menu grouping

- **WHEN** the model-customization menu is rendered
- **THEN** `sai-red-new-worker` and `sai-green-new-worker` appear under `sai-3-implement-new`.

### Requirement: Existing commands unchanged and documented coexistence

`/sai-build`, `/sai-3-implement`, `/sai-4-apply`, and the `sai-explore` routes SHALL keep their wrappers and behavior. Usage pages `docs/commands/sai-3-implement-new.md` and `docs/commands/sai-build-new.md` SHALL exist and SHALL be linked from the on-demand and sequential references, and `README.md` and `AGENTS.md` SHALL describe the `-new` family as coexisting with the existing commands.

#### Scenario: Existing build wrappers keep their boot adapter

- **WHEN** the `sai-build`, `sai-3-implement`, and `sai-4-apply` wrappers are inspected
- **THEN** each still fetches its harness boot adapter.
