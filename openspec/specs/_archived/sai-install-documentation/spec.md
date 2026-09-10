# sai-install-documentation Specification

## Purpose
TBD - created by syncing change relocate-generic-opencode-agents. Update Purpose after archive.

## Requirements

### Requirement: Manual install instructions are realigned

`INSTALL.opencode.md` SHALL document the three generic agent files as part of the agent-files copy step (the `cp agents/opencode/*.md ~/.config/opencode/agents/` command covers them automatically), SHALL NOT instruct users to add `explore`, `executor`, or `budget` entries to `opencode.json`/`opencode.jsonc` in the bash or PowerShell manual-install paths, and SHALL describe the configuration merge as covering only the SAI external-directory permission.

#### Scenario: the manual install doc shows no agent-block snippet

- **WHEN** `INSTALL.opencode.md` is read after this change is applied
- **THEN** its bash and PowerShell blocks contain no `"agent"` block snippet for `explore`, `executor`, or `budget`
- **AND** the blocks document the generic agent files under `~/.config/opencode/agents/`

#### Scenario: the merge statement is permission-only

- **WHEN** `INSTALL.opencode.md` describes the opencode configuration merge
- **THEN** it states that the merge covers only the SAI external-directory permission (`~/.config/opencode/sai/**`) and not any agent entries

### Requirement: Skill model-resolution documentation is realigned

The three opencode budget skills (`skills/opencode/budget-explorer/SKILL.md`, `skills/opencode/budget-executor/SKILL.md`, and `skills/opencode/budget-subagent/SKILL.md`) SHALL state that the subagent model is resolved from the agent file's frontmatter `model` key (the file installed at `~/.config/opencode/agents/{explore,executor,budget}.md`, seeded at install under the `tunable-seed` lifecycle), SHALL NOT state that the model is resolved via `agent.<keyword>.model` in `opencode.jsonc`, and SHALL NOT hardcode a model identifier in the skill file.

#### Scenario: the explorer skill names the explore agent file

- **WHEN** `skills/opencode/budget-explorer/SKILL.md` is read after this change is applied
- **THEN** its model-resolution line names the `explore` agent file's `model` frontmatter as the resolution source
- **AND** it does not mention `agent.explore.model` in `opencode.jsonc`

#### Scenario: the executor and subagent skills follow the same wording

- **WHEN** `skills/opencode/budget-executor/SKILL.md` and `skills/opencode/budget-subagent/SKILL.md` are read
- **THEN** each names its own agent file (`executor.md` / `budget.md`) as the model-resolution source and does not mention `agent.<keyword>.model` in `opencode.jsonc`

### Requirement: Repo documentation and ADR records are realigned

`AGENTS.md` SHALL NOT describe opencode subagent model resolution via `opencode.jsonc`; it SHALL describe it via the agent files. `docs/adr/0029-jsonc-parser-surgical-merge-for-opencode-agent-block.md` SHALL be recorded as historical (its subject — the agent-block merge — is retired). `docs/adr/0030-opencode-json-over-jsonc-merge-precedence.md` SHALL be recorded as superseded in respect of agents while its `opencode.json`-over-`opencode.jsonc` precedence continues to govern the SAI permission merge. The ADR index (`docs/adr/0000-INDEX.md`) SHALL reflect both updates.

#### Scenario: AGENTS.md describes agent-file model resolution

- **WHEN** `AGENTS.md` is read after this change is applied
- **THEN** its opencode subagent model-resolution statements refer to the agent files, not to `opencode.jsonc`

#### Scenario: the config-merge ADR records match the narrowed merge

- **WHEN** `docs/adr/0029-jsonc-parser-surgical-merge-for-opencode-agent-block.md`, `docs/adr/0030-opencode-json-over-jsonc-merge-precedence.md`, and `docs/adr/0000-INDEX.md` are read after this change is applied
- **THEN** ADR 0029 is recorded as historical
- **AND** ADR 0030 is recorded as superseded in respect of agents while its precedence rule for the permission merge remains in force
- **AND** the index entries match those statuses
