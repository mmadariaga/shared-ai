# fetch-loaded-copy-reuse Specification

## Purpose
TBD - created by archiving change fetch-loaded-copy-reuse. Update Purpose after archive.

## Requirements

### Requirement: Fetch directives follow an already-loaded fetched copy

The Claude Code and opencode fetch skills SHALL instruct the agent to follow a `Fetch @<subpath>` directive from the copy it already loaded in the same conversation, with no fetch tool call, when the fetch tool already returned that subpath's complete content in this conversation and that content is still in the agent's context. A complete result SHALL be the full output of a one-subpath call of the fetch tool, the full Read of the header `path` after a `too-large` result, or the full Read of a `path` that a multi-subpath call of the fetch tool returned.

#### Scenario: Repeated directive with the content still in context

- **WHEN** an agent meets a `Fetch @sai/policies/cache-warming.md` directive after the fetch tool already returned that subpath's complete content earlier in the conversation and the content is still in its context
- **THEN** the agent follows the loaded copy and makes no fetch tool call

#### Scenario: Too-large result followed by a full Read

- **WHEN** an earlier fetch tool call for a subpath returned a `too-large` line, the agent then read the full header `path`, and that content is still in its context
- **THEN** a later directive for the same subpath is followed from that loaded copy with no tool call

#### Scenario: Path-mode result followed by a full Read

- **WHEN** an earlier multi-subpath fetch tool call returned a resolution block for a subpath, the agent then read the full returned `path`, and that content is still in its context
- **THEN** a later directive for the same subpath is followed from that loaded copy with no tool call

### Requirement: Skill directives follow an already-loaded skill

The Claude Code and opencode fetch skills SHALL instruct the agent to follow a `Fetch @skills/<name>/SKILL.md` directive from the skill already loaded through the harness skill tool (`Skill` on Claude Code, `skill` on opencode), with no second skill-tool call, when that skill's content is still in the agent's context; otherwise the agent SHALL invoke the skill tool.

#### Scenario: Skill already loaded and in context

- **WHEN** a directive names `@skills/budget-explorer/SKILL.md` and the agent already loaded that skill through the skill tool with its content still in context
- **THEN** the agent follows the loaded skill and makes no second skill-tool call

#### Scenario: Skill not loaded yet

- **WHEN** a directive names a skill that the agent has not loaded through the skill tool in this conversation
- **THEN** the agent invokes the skill tool for it

### Requirement: Content that is not a complete loaded copy is loaded again

The fetch skills SHALL instruct the agent to run the fetch tool or the skill tool again when the loaded content has left its context (a compaction or summary kept only a mention of it), when it is unsure the content is still there, or when the earlier read was partial. A file the harness attached from an `@path` mention and a Read of another copy of the file MUST NOT count as loaded copies.

#### Scenario: Content left the context after a compaction

- **WHEN** a directive names a subpath whose earlier fetched content a compaction reduced to a mention
- **THEN** the agent runs the fetch tool again for that subpath

#### Scenario: Partial earlier read

- **WHEN** the agent's earlier read of a subpath was header-only or partial
- **THEN** the directive runs the fetch tool

#### Scenario: Harness-attached file

- **WHEN** the harness attached a file named by an `@path` mention and a directive later names the same subpath
- **THEN** the agent does not treat the attached file as a loaded copy and runs the fetch tool

### Requirement: Reuse is keyed on the subpath

The fetch skills SHALL key a loaded copy on the directive's subpath, so a copy installed under another root after the first load is picked up only once the loaded content has left the agent's context.

#### Scenario: New copy installed under another root mid-conversation

- **WHEN** a project-local copy of a subpath is installed after the agent loaded the user-global copy, and the loaded content is still in context
- **THEN** a later directive for that subpath follows the already-loaded copy until that content leaves the context

### Requirement: Each agent judges reuse against its own context

The fetch skills SHALL limit reuse to content the agent loaded itself. A subagent or worker MUST NOT reuse the loaded copy of the agent that dispatched it, and a continued subagent SHALL reuse only what it loaded itself.

#### Scenario: Worker dispatched by a coordinator that loaded the file

- **WHEN** a worker meets a directive for a subpath that only its dispatching coordinator loaded
- **THEN** the worker runs the fetch tool itself

### Requirement: Both harness fetch skills carry the same rule

The Claude Code fetch skill (`skills/claude/fetch/SKILL.md`) and the opencode fetch skill (`skills/opencode/fetch/SKILL.md`) SHALL each carry the loaded-copy reuse rule as one `### Loaded-copy reuse` section placed after `### Recursion`, worded identically apart from the harness skill tool name, with identical behavior.

#### Scenario: Comparing the two fetch skills

- **WHEN** the `### Loaded-copy reuse` sections of the two fetch skills are compared
- **THEN** they differ only in the harness skill tool name (`Skill` on Claude Code, `skill` on opencode)
