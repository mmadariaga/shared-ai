# instruction-run-block-removal Specification

## Purpose

Keep argument injection in the command wrappers, out of command-local instruction files.

## Requirements
### Requirement: Instruction files SHALL NOT contain `## Run` sections or `$ARGUMENTS` references

Instruction files under `sai/commands/{name}/instructions.md` SHALL NOT include a `## Run` section or reference `$ARGUMENTS`. The run trigger and user argument injection are owned exclusively by command wrapper files under `sai/commands/`.

#### Scenario: instruction file has no Run section
- **WHEN** any `sai/commands/{name}/instructions.md` is read
- **THEN** it does not contain a `## Run` heading or `$ARGUMENTS` reference
