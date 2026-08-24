# sai-instruction-format Specification

## Purpose

TBD - this spec was authored as a change delta and never merged into the main tree, so its requirements were invisible to validate, list, and archive. Summarize the capability here.

## Requirements
### Requirement: sai instruction files SHALL use flat markdown without XML task wrappers

Instruction files under `sai/commands/{name}/instructions.md` SHALL be written as flat markdown documents. The `<TASK>` XML wrapper pattern SHALL NOT be used in instruction files. Content previously indented inside a `<TASK>` block SHALL be unindented to the document root level.

#### Scenario: instruction file has no TASK wrapper

- **WHEN** any `sai/commands/{name}/instructions.md` is read
- **THEN** it contains no `<TASK>` or `</TASK>` tags

#### Scenario: heading hierarchy is flat

- **WHEN** an instruction file converted from TASK-wrapper format is read
- **THEN** all section headings use standard markdown `##` / `###` levels without extra indentation artifacts from the former wrapper

### Requirement: MANDATORY STOP ownership belongs to command wrappers, not instruction files

Instruction files under `sai/commands/{name}/instructions.md` SHALL NOT contain their own MANDATORY STOP directives. Stop signals are owned exclusively by the command body files under `sai/commands/` via the `## Completion` section.

#### Scenario: instruction file has no MANDATORY STOP

- **WHEN** any `sai/commands/{name}/instructions.md` is read
- **THEN** it does not contain a `MANDATORY STOP` directive
