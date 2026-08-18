# recursive-command-projection Specification

## Purpose
TBD: define recursive projection of command-owned Markdown files.

## Requirements

### Requirement: Recursive command projection SHALL install all command-owned Markdown files

The installer MUST use the recursive `sai-commands` projection to install matching files under the corresponding `sai/commands/{name}/` destination for both Claude Code and opencode. Dedicated projections for the three moved files MUST NOT remain active.

#### Scenario: Install the moved command-owned files

- **WHEN** the manifest is expanded for either supported harness
- **THEN** the resulting inventory SHALL include the three moved files at their command-relative destinations through the recursive projection, with no duplicate dedicated projection for any of them
