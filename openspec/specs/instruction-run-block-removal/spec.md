# instruction-run-block-removal Specification

## ADDED Requirements

### Requirement: Instruction files SHALL NOT contain `## Run` sections or `$ARGUMENTS` references

Instruction files under `sai/commands/{name}/instructions.md` SHALL NOT include a `## Run` section or reference `$ARGUMENTS`. The run trigger and user argument injection are owned exclusively by command wrapper files under `sai/commands/`.

#### Scenario: instruction file has no Run section
- **WHEN** any `sai/commands/{name}/instructions.md` is read
- **THEN** it does not contain a `## Run` heading or `$ARGUMENTS` reference

#### Scenario: security instruction template indentation is correct
- **WHEN** `sai/commands/security/instructions.md` is read
- **THEN** the `<output_template>` markdown content uses consistent indentation without extra leading spaces
