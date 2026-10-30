# planning-cost-baseline Specification

## Purpose
TBD - created by archiving change measure-planning-cost-baseline. Update Purpose after archive.

## Requirements

### Requirement: Versioned planning cost baseline

The repository SHALL keep a baseline of planning and implementation cost at `docs/measurements/planning-baseline-<YYYY-MM-DD>.md`, generated from `sai/tools/retrospective.js cost --with-worktrees --format markdown`, so that runs measured after a later contract change can be compared with it. The baseline SHALL state its format version and the command that produced it, and SHALL report tokens and tool calls per pipeline segment, role, and agent type for every planning and implementation run still present in the harnesses' data, with the pairing of planning and implementation runs per change.

#### Scenario: Regenerating after a contract change
- **WHEN** the design contracts change and the same `cost` command runs again
- **THEN** its markdown output has the same format version and tables as the committed baseline, so the figures can be compared

### Requirement: Anonymized projects in the baseline

The committed baseline SHALL carry no project names, change names, or paths of an anonymized project: such a project SHALL appear only under its alias, with numbered changes.

#### Scenario: Project measured under an alias
- **WHEN** the baseline covers a project passed to the `cost` mode with `--alias`
- **THEN** the baseline names that project only by its alias and lists its changes as numbered changes
