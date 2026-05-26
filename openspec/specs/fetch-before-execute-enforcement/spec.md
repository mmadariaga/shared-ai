# spec: fetch-before-execute-enforcement

## ADDED Requirements

### Requirement: LLM MUST fetch command file before executing any sai-* task

When a `/sai-*` command is invoked, the LLM SHALL resolve it by reading the corresponding `@commands/sai-<name>.md` file and follow the instructions in that file exactly. The LLM SHALL NOT skip to implementation or interpretation.

#### Scenario: /sai-1-spec invoked
- **WHEN** the user invokes `/sai-1-spec`
- **THEN** the LLM fetches `@commands/sai-1-spec.md` and follows its instructions exactly

#### Scenario: /sai-4-apply invoked
- **WHEN** the user invokes `/sai-4-apply`
- **THEN** the LLM fetches `@commands/sai-4-apply.md` and follows its instructions exactly

### Requirement: Resolution steps are explicit and ordered

The skill SHALL provide numbered resolution steps: (1) identify command name from input, (2) fetch corresponding file from `@commands/sai-<name>.md`, (3) follow instructions exactly, (4) do NOT skip to implementation or interpretation.

#### Scenario: step-by-step resolution followed
- **WHEN** the LLM processes any `/sai-*` command
- **THEN** it follows all four resolution steps in order
