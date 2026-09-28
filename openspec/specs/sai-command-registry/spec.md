# spec: sai-command-registry

## Purpose

Make every `/sai-*` invocation run through its installed command file, using the installed command files themselves as the registry.

## Requirements
### Requirement: Installed command files are the registry

The universal `sai-commands` skill SHALL name the installed `commands/sai-*.md` files under the harness root as the registry of SAI commands, and SHALL carry no enumerated command table. A name with no installed command file SHALL be reported as not a SAI command, and the skill SHALL stop there.

#### Scenario: A new command needs no registry edit

- **WHEN** a new `commands/{claude,opencode}/sai-<name>.md` wrapper pair is installed
- **THEN** `/sai-<name>` resolves through the skill without any change to the skill file

#### Scenario: Unknown command name

- **WHEN** the skill receives `/sai-<name>` and no `commands/sai-<name>.md` is installed
- **THEN** it reports that `/sai-<name>` is not a SAI command and stops

### Requirement: Skill declares fetch-before-execute rule

The skill SHALL state that a `/sai-*` invocation runs only through its command file: when the harness has already expanded the command into context, the LLM follows that content; otherwise it fetches `@commands/sai-<name>.md`. In both cases it SHALL follow the file exactly, from its first directive, before acting on the task itself.

#### Scenario: Invocation arrives as text
- **WHEN** the LLM receives a `/sai-*` invocation that the harness did not expand
- **THEN** it fetches the command file first, not interpreting the task freely

#### Scenario: Invocation already expanded
- **WHEN** the harness has expanded the `/sai-*` command into context
- **THEN** the LLM follows the expanded content without fetching the file again

### Requirement: Skill explains why loading matters

The skill SHALL state that every behavior a SAI command has (prerequisite checks, budget routing, phase instructions, gates) comes from the chain its command file loads, so a task run without the file skips all of them.

#### Scenario: LLM understands consequence of skipping
- **WHEN** the LLM considers skipping the command file
- **THEN** it recognizes that skipping means skipping every behavior the file's chain loads
