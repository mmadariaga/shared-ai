# command-wrapper-body Specification

## Purpose

Fix the body shape of every `sai-*` command wrapper so each stays a thin entry point into its command bootstrap.

## Requirements

### Requirement: three-directive-wrapper-body

The body of every in-scope `commands/claude/sai-*.md` and `commands/opencode/sai-*.md` wrapper SHALL consist of exactly three directives, in order: (1) the harness fetch-skill load, (2) the `Required capability profile: {{capabilityProfile}}.` line, and (3) one card fetch, `Fetch @sai/commands/{name}/coordinator.md` for a goal-driven command, `Fetch @sai/commands/audit/coordinator.md` for an audit command, or `Fetch @sai/commands/{name}/body.md` for a utility command, each followed by `and follow it exactly, forwarding the InvocationEnvelope block below.` The clean-start line "This invocation starts clean: disregard prior conversational context except where a fetched contract explicitly directs otherwise." SHALL stand between the fetch-skill load and the capability-profile line; it is a preamble line, not a directive. A standalone two-key invocation envelope block SHALL follow the card fetch, and no other content. No wrapper SHALL fetch a boot adapter or a `command-bootstrap.md`. The legacy `## Sai <Phase>` heading SHALL remain absent. `sai-explore` remains the sole load-set exception, and it is also the sole wrapper whose body carries one `Receipt:` context-pointer line, placed first after the frontmatter, pointing to `@sai/commands/explore/body.md § Load receipt`; that line is a pointer only and restates no rule. All other wrapper content, isolation blocks, prerequisite checks, and behavior sections remain forbidden. Frontmatter is outside this requirement. This requirement remains the single normative owner of wrapper body shape.

#### Scenario: Claude Code wrapper body shape

- **WHEN** any `commands/claude/sai-*.md` wrapper other than `sai-explore.md` is read
- **THEN** its directive set is exactly the harness fetch-skill, the capability-profile line, the card fetch, and the two-key envelope, with the clean-start line after the fetch-skill load
- **AND** `sai-explore.md`'s directive set is governed by "Explore wrapper carries its harness-specific load"

#### Scenario: opencode wrapper body shape

- **WHEN** any `commands/opencode/sai-*.md` wrapper other than `sai-explore.md` is read
- **THEN** its directive set is exactly the opencode fetch-skill, the capability-profile line, the card fetch, and the two-key envelope, with the clean-start line after the fetch-skill load
- **AND** `sai-explore.md`'s directive set is governed by "Explore wrapper carries its harness-specific load"

#### Scenario: behaviour loads absent from the wrapper

- **WHEN** any in-scope wrapper other than `sai-explore.md` is read
- **THEN** no `Fetch @sai/policies/...`, `Fetch @skills/budget/...`, `Fetch @skills/safe-operations/...`, `Fetch @sai/adapters/...`, or `Fetch @sai/orchestration/workers/bindings/...` directive appears in its body
- **AND** `sai-explore.md`'s one extra load is the harness `idea-list-render` card, and no binding directive appears in any wrapper body

#### Scenario: no section heading survives

- **WHEN** any wrapper is read
- **THEN** its body contains no `## Sai ...` heading line

#### Scenario: maximum body shape with a label-free envelope

- **WHEN** `commands/opencode/sai-status.md` — an opencode change-consuming wrapper — is read
- **THEN** its body is the fetch-skill line, the clean-start line, the capability-profile line, the `Fetch @sai/commands/status/body.md` card fetch, the standalone `InvocationEnvelope:` block with exactly `command_name` followed by `arguments_value`, and nothing else

#### Scenario: only sai-explore carries the receipt pointer

- **WHEN** any in-scope wrapper is read
- **THEN** a `Receipt:` line appears only in `commands/claude/sai-explore.md` and `commands/opencode/sai-explore.md`, as the first line after the frontmatter
- **AND** every other wrapper body carries no `Receipt:` line

### Requirement: wrapper-directory-shape-unchanged

The source wrapper directories SHALL each contain exactly the eighteen active
`sai-*.md` files, one `to-backlog.md`, one `from-backlog.md`, one
`from-next-backlog-item.md`, and one `to-pr.md`, for twenty-two wrapper files per
harness. Neither directory SHALL contain `budget.md` or a command bootstrap
card. The active SAI wrapper set and its harness parity SHALL remain intact.
The three backlog commands SHALL remain separate conversation-preserving
invocations.

#### Scenario: Source wrapper directories exclude budget

- **WHEN** `commands/claude/` and `commands/opencode/` are listed
- **THEN** each directory contains eighteen `sai-*.md` files and the four named non-SAI entries, for twenty-two files, with no `budget.md` or command bootstrap card.

### Requirement: Envelope lives in the wrapper

The invocation envelope SHALL remain in the command file, directly after the card fetch, because `$ARGUMENTS` is substituted only in the command file. It SHALL contain exactly `command_name` and `arguments_value`, in that order. A trimmed, non-empty `arguments_value` SHALL be authoritative for change-name resolution; an empty value SHALL enter the established picker. No wrapper-echo field, transcript scan, or labelled wrapper line is part of the contract.

#### Scenario: the envelope carries exactly two keys

- **WHEN** a wrapper is read
- **THEN** the `InvocationEnvelope:` block follows the card fetch and carries exactly `command_name` and `arguments_value`

### Requirement: Explore wrapper carries its harness-specific load

`sai-explore` SHALL load a harness-specific card in its wrapper, because the shared body cannot know its harness: each explore wrapper body SHALL carry the harness `idea-list-render.md` load between the capability-profile line and the `sai/commands/explore/body.md` fetch, making it four directives rather than three. Each explore wrapper body SHALL open, first after the frontmatter, with one `Receipt:` context-pointer line that points to `@sai/commands/explore/body.md § Load receipt` and carries no rule text; the pointer line is not a directive and does not change the count. The Plan - Unattended and Direct Build - Unattended worker bindings SHALL load at their dispatch points, never in the wrapper.

#### Scenario: Claude explore wrapper shape

- **WHEN** `commands/claude/sai-explore.md` is read
- **THEN** its directive set is the fetch-skill load, the capability-profile line, the `idea-list-render` card load, and the `sai/commands/explore/body.md` fetch
- **AND** the first body line after the frontmatter is the `Receipt:` pointer line naming `@sai/commands/explore/body.md § Load receipt`

#### Scenario: opencode explore wrapper shape

- **WHEN** `commands/opencode/sai-explore.md` is read
- **THEN** its directive set is the opencode fetch-skill load, the capability-profile line, the `idea-list-render` card load, and the `sai/commands/explore/body.md` fetch
- **AND** the first body line after the frontmatter is the `Receipt:` pointer line naming `@sai/commands/explore/body.md § Load receipt`
