# spec: fetch-before-execute-enforcement

## Purpose

Make the `sai-commands` skill run every `/sai-*` invocation through its command file before any task work.

## Requirements
### Requirement: LLM MUST fetch command file before executing any sai-* task

When a `/sai-*` command is invoked, the LLM SHALL follow its command file exactly, from its first directive, before acting on the task: the content the harness already expanded into context, or else the `@commands/sai-<name>.md` file it fetches.

#### Scenario: /sai-1-spec invoked
- **WHEN** the user invokes `/sai-1-spec`
- **THEN** the LLM follows `commands/sai-1-spec.md` exactly, fetching `@commands/sai-1-spec.md` when the harness did not expand it

#### Scenario: /sai-4-apply invoked
- **WHEN** the user invokes `/sai-4-apply`
- **THEN** the LLM follows `commands/sai-4-apply.md` exactly, fetching `@commands/sai-4-apply.md` when the harness did not expand it

### Requirement: Resolution steps are explicit and ordered

The skill SHALL provide numbered resolution steps: (1) take the command name from the invocation, (2) follow the harness-expanded command content, or else fetch `@commands/sai-<name>.md`, (3) follow the file exactly, from its first directive, before acting on the task itself.

#### Scenario: step-by-step resolution followed
- **WHEN** the LLM processes any `/sai-*` command
- **THEN** it follows the three resolution steps in order
