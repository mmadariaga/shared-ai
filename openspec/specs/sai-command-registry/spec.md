# spec: sai-command-registry

## Purpose

TBD - this spec was authored as a change delta and never merged into the main tree, so its requirements were invisible to validate, list, and archive. Summarize the capability here.

## Requirements
### Requirement: Registry table coverage

The SAI command registry skill SHALL list a `/sai-merge` row describing the merge-a-local-branch command with criteria-based conflict resolution and ADR/DDR collision repair, keeping the enumerated command set consistent with the installed wrapper files.

#### Scenario: Registry matches installed commands

- **WHEN** the registry table is rendered from the universal sai-commands skill
- **THEN** `/sai-merge` appears beside the other routed-shaped commands pointing at `@commands/sai-merge.md`


### Requirement: Skill declares fetch-before-execute rule

The skill SHALL state that the LLM MUST resolve `/sai-*` commands by reading the corresponding file from `@commands/sai-<name>.md` and MUST NOT interpret or execute a sai-* task directly.

#### Scenario: LLM attempts to skip command loading
- **WHEN** the LLM receives a `/sai-*` invocation
- **THEN** it MUST fetch the command file first, not interpret the task freely

### Requirement: Skill explains why loading matters

The skill SHALL document the quality layers that sai-* commands provide: prerequisite checks, cost discipline via budget skills, phase-specific instructions, and OpenSpec skill chaining.

#### Scenario: LLM understands consequence of skipping
- **WHEN** the LLM considers skipping the command file
- **THEN** it recognizes that skipping means skipping all quality layers

### Requirement: Registry table covers sai-retire-docs

The universal SAI command registry SHALL contain a `/sai-retire-docs` entry pointing to its wrapper and describing its bounded, confirmation-gated archival analysis.

#### Scenario: Registry lookup identifies the utility

- **WHEN** a user or harness resolves the SAI command registry
- **THEN** `/sai-retire-docs` SHALL resolve to the retire-docs wrapper before execution begins

### Requirement: Registry preserves fetch-before-execute discipline

The command registration SHALL preserve the existing fetch-before-execute contract for the utility wrapper and its boot adapter.

#### Scenario: Registered command loads its contract

- **WHEN** the utility is selected from the registry
- **THEN** the harness SHALL load the declared wrapper and command card before interpreting the task
