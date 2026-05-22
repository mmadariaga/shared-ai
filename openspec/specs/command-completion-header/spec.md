# command-completion-header Specification

## ADDED Requirements

### Requirement: All sai-* command body files SHALL use consistent completion phrasing

Each `sai/commands/sai-*.md` file's `## Completion` section SHALL contain a MANDATORY STOP directive that uses the phrasing "Once all artifacts are written your work is COMPLETE" (or a command-specific variant such as "Once the implementation is done your work is COMPLETE") rather than "Once implementation is done".

#### Scenario: completion message uses standardized phrasing
- **WHEN** any `sai/commands/sai-*.md` file is read
- **THEN** the `## Completion` section contains "your work is COMPLETE" phrasing, not "Once implementation is done"

#### Scenario: all command wrappers are consistent
- **WHEN** all files matching `sai/commands/sai-*.md` are listed and read
- **THEN** every file's completion message follows the same structural pattern

### Requirement: sai command body files SHALL wrap MANDATORY STOP directives in a ## Completion section

### Requirement: sai command body files SHALL wrap MANDATORY STOP directives in a ## Completion section

Each `sai/commands/sai-*.md` body file SHALL terminate with a `## Completion` markdown section that contains the MANDATORY STOP directive for that command. The MANDATORY STOP text SHALL appear inside the `## Completion` section, not at the top level of the document.

#### Scenario: command body contains Completion section

- **WHEN** any `sai/commands/sai-*.md` file is read
- **THEN** the file contains a `## Completion` section and the MANDATORY STOP instruction appears within that section

#### Scenario: Completion section is the final section

- **WHEN** a sai command body file is read
- **THEN** `## Completion` is the last `##`-level heading in the document
