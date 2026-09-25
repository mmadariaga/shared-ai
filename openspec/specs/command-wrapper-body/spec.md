# command-wrapper-body Specification

## Purpose

Fix the body shape of every `sai-*` command wrapper so each stays a thin entry point into its command bootstrap.

## Requirements

### Requirement: three-directive-wrapper-body

The body of every in-scope `commands/claude/sai-*.md` and `commands/opencode/sai-*.md` wrapper SHALL consist of exactly three directives, in order: (1) the harness fetch-skill load, (2) the harness boot-adapter load, and (3) the command bootstrap call to `@sai/commands/{name}/command-bootstrap.md` — plus a standalone two-key invocation envelope block rendered directly after the command-bootstrap directive, and no other content. The legacy `## Sai <Phase>` heading SHALL remain absent. `sai-explore` remains the sole load-set exception. All other wrapper content, isolation blocks, prerequisite checks, and behavior sections remain forbidden. Frontmatter is outside this requirement. This requirement remains the single normative owner of wrapper body shape.

#### Scenario: Claude Code wrapper body shape

- **WHEN** any `commands/claude/sai-*.md` wrapper other than `sai-explore.md` is read
- **THEN** its directive set is exactly the harness fetch-skill, boot-adapter, launcher call, and the two-key envelope
- **THEN** `sai-explore.md`'s directive set is governed by `explore-harness-specific-loads`

#### Scenario: opencode wrapper body shape

- **WHEN** any `commands/opencode/sai-*.md` wrapper other than `sai-explore.md` is read
- **THEN** its directive set is exactly the opencode fetch-skill, boot-adapter, launcher call, and the two-key envelope
- **THEN** `sai-explore.md`'s directive set is governed by `explore-harness-specific-loads`

#### Scenario: behaviour loads absent from the wrapper

- **WHEN** any in-scope wrapper other than `sai-explore.md` is read
- **THEN** no `Fetch @sai/policies/...`, `Fetch @skills/budget/...`, `Fetch @skills/safe-operations/...`, or `Fetch @sai/orchestration/workers/bindings/...` directive appears in its body
- **THEN** `sai-explore.md`'s one extra load is the harness `idea-list-render` card, per `explore-harness-specific-loads`, and no binding directive appears in any wrapper body

#### Scenario: no section heading survives

- **WHEN** any wrapper is read
- **THEN** its body contains no `## Sai ...` heading line

#### Scenario: maximum body shape with a label-free envelope

- **WHEN** `commands/opencode/sai-status.md` — an opencode change-consuming wrapper — is read
- **THEN** its body is the fetch-skill line, the boot-adapter load, the launcher call, the standalone `InvocationEnvelope:` block with exactly `command_name` followed by `arguments_value`, and nothing else

### Requirement: envelope-lives-in-the-wrapper

The invocation envelope SHALL remain in the command file, directly after the command-bootstrap directive, because `$ARGUMENTS` is substituted only in the command file. It SHALL contain exactly `command_name` and `arguments_value`, in that order. The command bootstrap SHALL not define, parse, or require an envelope. A trimmed, non-empty `arguments_value` SHALL be authoritative for change-name resolution; an empty value SHALL enter the established picker. No wrapper-echo field, transcript scan, or labelled wrapper line is part of the contract.

#### Scenario: envelope fields are narrowed

- **WHEN** a wrapper is read
- **THEN** the `InvocationEnvelope:` block carries exactly `command_name` and `arguments_value`

#### Scenario: launcher carries no envelope

- **WHEN** any `command-bootstrap.md` is read
- **THEN** it contains no `InvocationEnvelope` block and no reference to `command_name` or `arguments_value`

### Requirement: explore-harness-specific-loads

`sai-explore` SHALL load a harness-specific card beyond the boot adapter — the fetch stays in the wrapper because the command bootstrap cannot know its harness — making each explore wrapper body four directives rather than three. The explore command bootstrap SHALL carry no command-specific load; the Plan - Unattended worker bindings load at their dispatch point in `sai/commands/explore/steps/pipeline-plan-unattended.md`.

#### Scenario: Claude explore body shape

- **WHEN** `commands/claude/sai-explore.md` is read
- **THEN** its directive set is the fetch-skill load, the boot-adapter load, the `idea-list-render` card load, and the launcher call — four directives

#### Scenario: opencode explore body shape

- **WHEN** `commands/opencode/sai-explore.md` is read
- **THEN** its directive set is the fetch-skill load, the boot-adapter load, the `idea-list-render` card load, and the launcher call — four directives

#### Scenario: explore launcher carries no load

- **WHEN** `sai/commands/explore/command-bootstrap.md` is read
- **THEN** it contains no card or binding fetch and states that execution continues with the card selected by the harness boot adapter

### Requirement: wrapper-directory-shape-unchanged

The source wrapper directories SHALL contain exactly the 19 active `sai-*.md` files for each harness after this change. Neither directory SHALL contain `budget.md`, and neither directory SHALL contain a command bootstrap card. The active SAI wrapper set and its harness parity SHALL remain intact.

#### Scenario: Source wrapper directories exclude budget

- **WHEN** `commands/claude/` and `commands/opencode/` are listed
- **THEN** each directory contains exactly 19 `sai-*.md` files and no `budget.md`.
