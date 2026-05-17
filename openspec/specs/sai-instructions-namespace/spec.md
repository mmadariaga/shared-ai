# sai-instructions-namespace Specification

## Purpose
TBD - created by archiving change move-instructions-to-sai. Update Purpose after archive.
## Requirements
### Requirement: Instructions live under instructions/sai/ subdirectory
All shared-AI instruction files SHALL reside in `instructions/sai/` within the repository. No `.md` instruction files SHALL exist directly in `instructions/` root.

#### Scenario: instructions root contains only the sai subdirectory
- **WHEN** the `instructions/` directory is listed
- **THEN** no `.md` files appear at `instructions/*.md`
- **THEN** all instruction files are found at `instructions/sai/*.md`

#### Scenario: sai subdirectory contains all expected files
- **WHEN** `instructions/sai/` is listed
- **THEN** the following files are present: `caveman.md`, `commit.md`, `glossary-format.md`, `implement.md`, `performance.md`, `plan.md`, `pr.md`, `remember.md`, `review.md`, `security.md`, `spec.propose.md`, `accessibility.md`

### Requirement: Instructions are installed into a sai/ subdirectory on the target system
The install script SHALL copy instruction files from `instructions/sai/` to `~/.claude/instructions/sai/` (Claude Code) and to `~/.config/opencode/instructions/sai/` (OpenCode), creating the subdirectory if it does not exist.

#### Scenario: Claude Code install places files in sai subdirectory
- **WHEN** the install script is run for Claude Code
- **THEN** files are copied to `~/.claude/instructions/sai/`
- **THEN** no files are copied to `~/.claude/instructions/` root from this project

#### Scenario: OpenCode install places files in sai subdirectory
- **WHEN** the install script is run for OpenCode
- **THEN** files are copied to `~/.config/opencode/instructions/sai/`
- **THEN** no files are copied to `~/.config/opencode/instructions/` root from this project

