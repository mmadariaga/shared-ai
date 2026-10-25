# project-local-definition-refresh Specification

## Purpose
Refresh existing managed command and agent overrides in the selected project without creating missing local definitions or changing unrelated projects and files.

## Requirements

### Requirement: Refresh existing managed definitions in the selected project only

Installation SHALL refresh existing manifest-owned commands and agents in the current project's .claude or .opencode root for selected harnesses; setup <project-path> SHALL refresh both harnesses in that named project. Candidates SHALL derive from customizable-copy and tunable-seed projections. Refresh SHALL retain destination tuning and exact customization suffixes, replace other managed content, and clean declared retired paths in the same root. It SHALL NOT create missing local definitions or replacement aliases, scan other projects, or rewrite unrelated filenames. Missing roots SHALL remain absent. Current local definitions SHALL be skipped if the harness root, definition directory, or definition path is symbolic-linked or non-regular, with a notice where applicable.

#### Scenario: Current local overrides are refreshed
- **WHEN** installation runs in a project with stale managed command and agent overrides
- **THEN** their managed content is refreshed while their tuning and suffixes survive

#### Scenario: Setup refreshes both harnesses
- **WHEN** setup targets a project with existing overrides for Claude Code and opencode
- **THEN** it refreshes both harnesses in that project without scanning others

#### Scenario: Missing and unrelated definitions remain untouched
- **WHEN** a project lacks some managed definitions and has unrelated user files
- **THEN** refresh creates no missing local definitions and leaves unrelated filenames and other projects unchanged

#### Scenario: Linked current definition is skipped
- **WHEN** a local definition or its harness root or definition directory is a symbolic link
- **THEN** refresh skips that definition without changing its target

#### Scenario: Retirement does not create local replacements
- **WHEN** a project has a retired agent but no current-name replacement
- **THEN** refresh deletes the declared retired file without transferring settings or creating a local replacement
