# installer-feedback-grouping Specification

## Purpose
TBD - created by archiving change install-feedback-cleanup. Update Purpose after archive.

## Requirements

### Requirement: Grouped per-harness install summaries

The installer SHALL emit its post-install summaries grouped by harness, printing the Claude block with its paths before the Opencode block with its paths, with each block's path lines closing that block before the next harness begins.

#### Scenario: Claude then Opencode blocks in order

- **WHEN** both Claude Code and Opencode are selected
- **THEN** the installer prints the Claude summary lines with Claude paths and then the Opencode summary lines with Opencode paths before any notices block

### Requirement: Single config-merge path preserves grouping

The installer SHALL invoke the Opencode config merge exactly once per run through the `merge-jsonc` projection, and `main` SHALL NOT issue an additional explicit `copyOpencodeConfig` call, so the config notice cannot appear twice and split the grouped ordering.

#### Scenario: Projection is the sole merge path

- **WHEN** the Opencode branch runs with the `merge-jsonc` projection present
- **THEN** the config merge runs once via the projection and no second merge call emits a duplicate notice
