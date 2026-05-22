# command-completion-header Specification

## ADDED Requirements

### Requirement: sai command body files SHALL wrap MANDATORY STOP directives in a ## Completion section

Each `sai/commands/sai-*.md` body file SHALL terminate with a `## Completion` markdown section that contains the MANDATORY STOP directive for that command. The MANDATORY STOP text SHALL appear inside the `## Completion` section, not at the top level of the document.

#### Scenario: command body contains Completion section

- **WHEN** any `sai/commands/sai-*.md` file is read
- **THEN** the file contains a `## Completion` section and the MANDATORY STOP instruction appears within that section

#### Scenario: Completion section is the final section

- **WHEN** a sai command body file is read
- **THEN** `## Completion` is the last `##`-level heading in the document
