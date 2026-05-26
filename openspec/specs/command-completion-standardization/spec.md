# command-completion-standardization Specification

## ADDED Requirements

### Requirement: All sai-* command body files SHALL use consistent completion phrasing

Each `sai/commands/sai-*.md` file's `## Completion` section SHALL contain a MANDATORY STOP directive that uses the phrasing "Once all artifacts are written your work is COMPLETE" (or a command-specific variant such as "Once the implementation is done your work is COMPLETE") rather than "Once implementation is done".

#### Scenario: completion message uses standardized phrasing
- **WHEN** any `sai/commands/sai-*.md` file is read
- **THEN** the `## Completion` section contains "your work is COMPLETE" phrasing, not "Once implementation is done"

#### Scenario: all command wrappers are consistent
- **WHEN** all files matching `sai/commands/sai-*.md` are listed and read
- **THEN** every file's completion message follows the same structural pattern
