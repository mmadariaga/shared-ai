# command-wrapper-body Specification

## Purpose

TBD placeholder — purpose to be written when the change completes.

## Requirements

### Requirement: three-directive-wrapper-body

The body of every in-scope `commands/claude/sai-*.md` and `commands/opencode/sai-*.md` wrapper SHALL consist of exactly three directives, in order: (1) the harness fetch-skill load, (2) the harness boot-adapter load, and (3) the launcher call to `@sai/commands/{name}/launcher.md` — plus the standalone invocation envelope block, rendered directly after the launcher-call directive, and no other content. The rewrite SHALL drop the legacy `## Sai <Phase>` section heading: the wrapper body SHALL NOT carry any heading, because the envelope's `command_name` already identifies the command. `sai-explore` is the sole exception to the three-directive shape: its harness-specific card load and divergent binding loads are governed by `explore-harness-specific-loads`. All other content the wrapper carries today — behaviour-skill loads, worker bindings, and card fetches — SHALL move to the command's launcher. The wrapper body SHALL NOT contain isolation-mode blocks, prerequisite checks, or any other sai behaviour, and SHALL NOT contain any `## Load behaviors`, `## Load instructions`, `## Run`, `## Completion`, or `## Prerequisite checks` section. The wrapper's frontmatter SHALL remain byte-identical. This requirement is the single normative owner of the wrapper body shape: `thin-wrappers`' `wrapper-shape` references it and SHALL NOT restate the shape, its scenarios, or its forbidden-content rules.

#### Scenario: Claude Code wrapper body shape

- **WHEN** any `commands/claude/sai-*.md` wrapper other than `sai-explore.md` is read
- **THEN** its directive set is exactly `Fetch @skills/fetch/SKILL.md`, the boot-adapter load, and the launcher call — no other Fetch directive appears in the body
- **THEN** `sai-explore.md`'s directive set is governed by `explore-harness-specific-loads`

#### Scenario: opencode wrapper body shape

- **WHEN** any `commands/opencode/sai-*.md` wrapper other than `sai-explore.md` is read
- **THEN** its directive set is exactly the fetch-skill line (`Fetch @~/.config/opencode/skills/fetch/SKILL.md before you continue.`), the boot-adapter load, and the launcher call — no other Fetch directive appears in the body
- **THEN** `sai-explore.md`'s directive set is governed by `explore-harness-specific-loads`

#### Scenario: behaviour loads absent from the wrapper

- **WHEN** any in-scope wrapper other than `sai-explore.md` is read
- **THEN** no `Fetch @sai/policies/...`, `Fetch @skills/budget/...`, `Fetch @skills/safe-operations/...`, or `Fetch @sai/orchestration/workers/bindings/...` directive appears in its body
- **THEN** the only binding directive permitted in `sai-explore.md`'s body is the opencode `spec-worker` load, per `explore-harness-specific-loads`

#### Scenario: frontmatter untouched

- **WHEN** a wrapper's frontmatter before and after the change is compared
- **THEN** the frontmatter block is byte-identical, including `model`, `effort`, `variant`, `allowed-tools`, `argument-hint`, and `description`

#### Scenario: no section heading survives

- **WHEN** any wrapper is read
- **THEN** its body contains no `## Sai ...` heading line — the legacy `## Sai <Phase>` heading is dropped by the rewrite

#### Scenario: maximum body shape with a label-free envelope

- **WHEN** `commands/opencode/sai-status.md` — an opencode change-consuming wrapper — is read
- **THEN** its body is the fetch-skill line, the boot-adapter load, the launcher call, the standalone `InvocationEnvelope:` block with exactly `command_name` followed by `arguments_value`, and nothing else

### Requirement: envelope-lives-in-the-wrapper

The invocation envelope — `command_name`, `arguments_value` — SHALL ride in the command file, not in the launcher: the standalone `InvocationEnvelope:` block SHALL be rendered in the wrapper directly after the launcher-call directive, because `$ARGUMENTS` is substituted only in the command file. The envelope SHALL NOT be defined inside the launcher, and the launcher SHALL NOT define, parse, or require an envelope of its own. A trimmed, non-empty `arguments_value` SHALL be authoritative for change-name resolution. When `arguments_value` is empty after trimming, the established zero/one/multiple picker SHALL run. No transcript scan or labelled wrapper line is part of the envelope contract.

#### Scenario: envelope fields unchanged

- **WHEN** a wrapper is read
- **THEN** the `InvocationEnvelope:` block appears in the wrapper directly after the launcher-call directive and carries exactly `command_name` followed by `arguments_value`, with `$ARGUMENTS` substituted in the wrapper, not in the launcher

#### Scenario: launcher carries no envelope

- **WHEN** any `launcher.md` is read
- **THEN** it contains no `InvocationEnvelope` block and no reference to `command_name` or `arguments_value`

### Requirement: explore-harness-specific-loads

`sai-explore` SHALL load a harness-specific card beyond the boot adapter — the fetch stays in the wrapper because the launcher cannot know its harness — making the Claude explore body four directives rather than three (the opencode explore body is five). Any additional binding fetch whose presence diverges between the harnesses (the opencode-only `spec-worker` binding — a harness-neutral-form path that only the opencode wrapper carries) SHALL also remain in the wrapper, per the divergence rule in `command-launcher-card`'s `harness-neutral-launcher`. The explore launcher SHALL receive only the binding fetch both wrappers carry (the `design-worker` binding).

#### Scenario: Claude explore body shape

- **WHEN** `commands/claude/sai-explore.md` is read
- **THEN** its directive set is the fetch-skill load, the boot-adapter load, the `idea-list-render` card load, and the launcher call — four directives

#### Scenario: opencode explore body shape

- **WHEN** `commands/opencode/sai-explore.md` is read
- **THEN** its directive set is the fetch-skill load, the boot-adapter load, the `spec-worker` binding load, the `idea-list-render` card load, and the launcher call

#### Scenario: explore launcher is harness-neutral

- **WHEN** `sai/commands/explore/launcher.md` is read
- **THEN** it contains no harness-specific card or binding fetch (no `idea-list-render` load, no `spec-worker` binding load)

#### Scenario: explore launcher receives the neutral binding

- **WHEN** `sai/commands/explore/launcher.md` is read
- **THEN** it contains the `design-worker` binding fetch — the one binding both explore wrappers carry today — and no other directive

### Requirement: wrapper-directory-shape-unchanged

No file SHALL be added to, or removed from, `commands/claude/` or `commands/opencode/`; the launcher and all moved content SHALL live under `sai/`, which the model-customization menu never enumerates and which is not invocable. The set of 16 command files per harness (15 `sai-*` plus `budget`) SHALL remain exactly as before the change. `budget` is not a workflow command — it has no boot adapter, no envelope, and no launcher, and its wrapper SHALL remain byte-identical.

#### Scenario: same file set per harness

- **WHEN** `commands/claude/` and `commands/opencode/` are listed after the change
- **THEN** each directory contains exactly the same 16 filenames as before the change

#### Scenario: no launcher inside a command directory

- **WHEN** the change is applied
- **THEN** no `launcher.md` exists under `commands/claude/` or `commands/opencode/`

#### Scenario: budget untouched

- **WHEN** `commands/claude/budget.md` and `commands/opencode/budget.md` are compared before and after the change
- **THEN** each file is byte-identical
