## ADDED Requirements

### Requirement: Skill file location and naming

The Claude Code executor skill MUST be created at `skills/claude/executor/SKILL.md`. It SHALL follow the same file structure as `skills/claude/budget-explorer/SKILL.md` (frontmatter + behavior sections).

#### Scenario: File placement

- **WHEN** an agent loads the executor skill in Claude Code
- **THEN** it fetches `skills/claude/executor/SKILL.md` via `Fetch` or `/skill executor`

### Requirement: Subagent binding

The skill SHALL bind the "executor subagent" concept to `subagent_type: General` (capital G). Every spawn MUST explicitly set `model: haiku`.

#### Scenario: Spawn parameters

- **WHEN** a main agent spawns an executor subagent per this skill
- **THEN** the Agent call uses `subagent_type: "General"` and `model: "haiku"`

### Requirement: No tool-call cap

The executor skill SHALL NOT impose a tool-call cap. The haiku model tier provides sufficient cost control without a cap.

#### Scenario: Long build command

- **WHEN** an executor subagent runs a command that produces multiple sequential tool calls
- **THEN** it is not stopped by an arbitrary cap; it completes the task

### Requirement: Raw output allowed

The executor skill SHALL allow the subagent to return raw command output when it is the direct answer. Unlike research subagents, no "no raw file contents" restriction applies to executor responses.

#### Scenario: Build log excerpt

- **WHEN** the executor captures a compiler error message verbatim
- **THEN** it may include the exact error string in its response

### Requirement: Skill frontmatter

The skill file frontmatter MUST include:
- `name`: `claude-executor`
- `description`: concise description of the executor's purpose (bash/test/build execution)
- `license`: MIT
- `metadata.author`: shared-ai
- `metadata.version`: "1.0"

#### Scenario: Frontmatter validation

- **WHEN** the skill file is read
- **THEN** all required frontmatter fields are present and correctly set

### Requirement: Universal Behavior section inlined

The skill file SHALL contain a `## Universal Behavior` section with all rules from the `executor-universal-behavior` capability, followed by a `## Claude Code Binding` section with harness-specific parameters.

#### Scenario: Section structure

- **WHEN** an agent reads `skills/claude/executor/SKILL.md`
- **THEN** it finds both `## Universal Behavior` and `## Claude Code Binding` sections
