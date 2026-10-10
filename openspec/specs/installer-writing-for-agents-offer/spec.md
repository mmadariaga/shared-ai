# installer-writing-for-agents-offer Specification

## Purpose
TBD - created by archiving change offer-writing-for-agents-skill. Update Purpose after archive.

## Requirements

### Requirement: Per-assistant writing-for-agents detection

The installer SHALL treat `writing-for-agents` as present for a selected assistant only when `writing-for-agents/SKILL.md` resolves, following symlinks, to a file in one of that assistant's user-global skills roots. For Claude Code the root is `~/.claude/skills`. For opencode the roots are the resolved opencode skills directory, `~/.claude/skills`, and `~/.agents/skills`. A dangling symlink SHALL count as absent. Detection SHALL check presence only, never the version.

#### Scenario: Skill present for every selected assistant

- **WHEN** every selected assistant has `writing-for-agents/SKILL.md` in one of its roots
- **THEN** the installer makes no offer and prints nothing about `writing-for-agents`

#### Scenario: A dangling link counts as absent

- **WHEN** the `writing-for-agents` entry in an assistant's root is a symlink whose target does not exist
- **THEN** the installer treats the skill as absent for that assistant

#### Scenario: opencode finds the skill under the shared Claude root

- **WHEN** opencode is selected and `writing-for-agents/SKILL.md` exists only under `~/.claude/skills`
- **THEN** the installer treats the skill as present for opencode

### Requirement: Single interactive skills.sh offer

When the skill is absent for one or more selected assistants and stdin is a TTY, the installer SHALL show one yes/no offer naming every assistant that lacks it. On acceptance it SHALL run `skills@latest add mattpocock/skills --skill=writing-for-agents` through the selected runner, with no `-a`, `-g`, or `-y` argument, spawned from an argument array with inherited stdio. A shell SHALL be used only on Windows. The offer SHALL run once per install, after the harness installs and before the CodeGraph offer.

#### Scenario: One offer names all assistants that lack the skill

- **WHEN** both Claude Code and opencode are selected and both lack the skill on a TTY
- **THEN** the installer asks one question naming both assistants

#### Scenario: The command preselects nothing

- **WHEN** the user accepts the offer
- **THEN** the spawned command is `skills@latest add mattpocock/skills --skill=writing-for-agents` behind the runner, with no assistant, scope, or answer flags

### Requirement: Runner selection follows the invoking package manager

The installer SHALL map `npm_config_user_agent` to the invoking runner (`npm/` to `npx`, `pnpm/` to `pnpm dlx`, `bun/` to `bunx`) and use it when it is available. Otherwise it SHALL use the first available runner of `npx`, `pnpm dlx`, `bunx`. When no runner is available, the installer SHALL add the manual command as a notice, start no install, and continue.

#### Scenario: pnpm invocation uses pnpm dlx

- **WHEN** `npm_config_user_agent` starts with `pnpm/` and `pnpm` is available
- **THEN** the offer runs the command through `pnpm dlx`

#### Scenario: No usable runner

- **WHEN** none of `npx`, `pnpm`, or `bunx` is available
- **THEN** the installer adds the manual command as a notice and the SAI install continues

### Requirement: Non-interactive installs print the command only

When stdin is not a TTY, the installer SHALL add the manual install command as a notice and SHALL spawn no process, including runner availability probes. The command's runner SHALL come from the user-agent mapping alone, defaulting to `npx`.

#### Scenario: No TTY

- **WHEN** the skill is absent and stdin is not a TTY
- **THEN** the installer adds the manual command notice and starts no process

### Requirement: Decline and failure leave the SAI install unchanged

A declined offer, a cancelled skills.sh session, a non-zero exit, or a spawn error SHALL add the manual command as a notice and SHALL leave the SAI install outcome and the other dependency offers unchanged.

#### Scenario: The user declines

- **WHEN** the user answers no to the offer
- **THEN** nothing is spawned and the manual command is added as a notice

#### Scenario: skills.sh fails

- **WHEN** the skills.sh process exits non-zero or fails to spawn
- **THEN** the manual command is added as a notice and the installer does not throw

### Requirement: Post-install re-check

After skills.sh exits successfully, the installer SHALL run detection again and add a notice for each selected assistant that still lacks the skill. When every assistant has it, the installer SHALL print nothing more.

#### Scenario: Project scope chosen inside skills.sh

- **WHEN** skills.sh exits successfully but an assistant's user-global roots still lack the skill
- **THEN** the installer adds a notice naming that assistant and the command to run again

### Requirement: writing-for-agents stays user-owned

No installer manifest projection SHALL target `writing-for-agents`. Doctor SHALL report nothing about it, and uninstall SHALL leave it in place.

#### Scenario: Manifest has no writing-for-agents projection

- **WHEN** the install manifest projections are enumerated
- **THEN** none targets a `writing-for-agents` path
