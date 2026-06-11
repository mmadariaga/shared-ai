# install-instructions-recursive Specification

## Purpose
TBD - created by archiving change copilot-fixes. Update Purpose after archive.
## Requirements
### Requirement: The installer SHALL copy sai/instructions recursively, preserving subdirectory structure

`bin/install-flow.js` SHALL export a `listMdFilesRecursive(dir)` function that returns all `.md` files under a directory tree, and `installClaude`, `installCopilot`, and `installOpencode` MUST use it to copy `sai/instructions/` so that nested files (e.g. `harness/copilot.md`) land at the same relative path under the target `sai/instructions/` directory.

#### Scenario: Nested instruction file installed for Claude Code
- **WHEN** `installClaude(target)` runs
- **THEN** `<target>/sai/instructions/harness/copilot.md` exists

#### Scenario: Nested instruction file installed for Opencode
- **WHEN** `installOpencode(target)` runs
- **THEN** `<target>/sai/instructions/harness/copilot.md` exists

#### Scenario: Non-md files excluded
- **WHEN** `listMdFilesRecursive` scans a tree containing `.md` and non-`.md` files
- **THEN** only `.md` files are returned, including those in nested subdirectories

### Requirement: Manual install documentation SHALL use recursive instruction copy commands

`INSTALL.copilot.md` bash and PowerShell snippets MUST copy `sai/instructions/` recursively (`cp -r sai/instructions/. ...` / `Copy-Item sai\instructions\* ... -Recurse -Force`) instead of a flat `*.md` glob.

#### Scenario: Manual install followed
- **WHEN** a user follows either the bash or PowerShell steps in INSTALL.copilot.md
- **THEN** nested instruction subdirectories are copied to the target instructions folder

