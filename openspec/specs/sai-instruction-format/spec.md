# sai-instruction-format Specification

## ADDED Requirements

### Requirement: sai instruction files SHALL use flat markdown without XML task wrappers

Files under `sai/instructions/` SHALL be written as flat markdown documents. The `<TASK>` XML wrapper pattern SHALL NOT be used in instruction files. Content previously indented inside a `<TASK>` block SHALL be unindented to the document root level.

#### Scenario: instruction file has no TASK wrapper

- **WHEN** any file under `sai/instructions/` is read
- **THEN** it contains no `<TASK>` or `</TASK>` tags

#### Scenario: heading hierarchy is flat

- **WHEN** an instruction file converted from TASK-wrapper format is read
- **THEN** all section headings use standard markdown `##` / `###` levels without extra indentation artifacts from the former wrapper

### Requirement: MANDATORY STOP ownership belongs to command wrappers, not instruction files

Instruction files under `sai/instructions/` SHALL NOT contain their own MANDATORY STOP directives. Stop signals are owned exclusively by the command body files under `sai/commands/` via the `## Completion` section.

#### Scenario: instruction file has no MANDATORY STOP

- **WHEN** any file under `sai/instructions/` is read
- **THEN** it does not contain a `MANDATORY STOP` directive
