## Requirements

### Requirement: sai-2-design command exists in both harnesses
A `sai-2-design` command wrapper SHALL exist at `commands/claude/sai-2-design.md` and `commands/opencode/sai-2-design.md`.

#### Scenario: Claude Code wrapper present
- **WHEN** `commands/claude/` is listed
- **THEN** `sai-2-design.md` is present

#### Scenario: opencode wrapper present
- **WHEN** `commands/opencode/` is listed
- **THEN** `sai-2-design.md` is present

### Requirement: sai-2-design generates design.md and tasks.md
When invoked with a change name, `sai-2-design` SHALL produce `openspec/changes/{change-name}/design.md` and `openspec/changes/{change-name}/tasks.md`.

#### Scenario: design.md created after invocation
- **WHEN** `/sai-2-design <change-name>` is run on a change that has approved specs
- **THEN** `openspec/changes/<change-name>/design.md` is created

#### Scenario: tasks.md created after invocation
- **WHEN** `/sai-2-design <change-name>` is run on a change that has approved specs
- **THEN** `openspec/changes/<change-name>/tasks.md` is created

### Requirement: sai-2-design uses a high-capability model
The `sai-2-design` wrapper SHALL declare `model: claude-opus-4-7` and `effort: high` in its frontmatter.

#### Scenario: model declared in Claude Code wrapper
- **WHEN** `commands/claude/sai-2-design.md` frontmatter is read
- **THEN** `model` is `claude-opus-4-7` and `effort` is `high`


