# sai-2-design-skill-fix Specification

## Purpose
TBD - created by archiving change tasks-as-scaffold. Update Purpose after archive.
## Requirements
### Requirement: no-dead-skill-reference

`sai-2-design` (both `claude/commands/sai-2-design.md` and `opencode/commands/sai-2-design.md`) SHALL NOT reference `.claude/skills/openspec-continue/SKILL.md` or any path containing `openspec-continue` that is not confirmed to exist in the project. The dead `Fetch` or `Then fetch and follow` directive for that skill SHALL be removed entirely.

#### Scenario: sai-2-design loads without missing-file warning

- **WHEN** `/sai-2-design` is invoked
- **THEN** no "file not found" or equivalent error is produced for a skill path; all referenced skill paths resolve to existing files

---

### Requirement: embedded-design-generation

`sai-2-design` SHALL embed the complete generation instructions for `design.md` and `tasks.md` directly in the wrapper file. The instructions SHALL:
- Use `proposal.md` and `specs/**/*.md` as input context
- Generate `design.md` following the schema's design artifact instruction
- Generate `tasks.md` following the **narrative scaffold format** defined in the `tasks-scaffold-format` capability (no checkboxes)
- NOT regenerate `proposal.md` or `specs/`

The instructions SHALL be self-contained so that removing any openspec skill package does not break `/sai-2-design`.

#### Scenario: design and tasks generated without external skill dependency

- **WHEN** `/sai-2-design <change-name>` is run in a project where no `openspec-continue` skill is installed
- **THEN** `design.md` and `tasks.md` are created correctly using the embedded instructions

#### Scenario: tasks.md generated in narrative format

- **WHEN** `sai-2-design` generates `tasks.md`
- **THEN** the file follows the `## Step N:` scaffold format with Files Affected, What Will Be Done, and Testing Strategy fields; no `- [ ]` markers are present

