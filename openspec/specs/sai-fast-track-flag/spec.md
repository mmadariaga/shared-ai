# sai-fast-track-flag Specification

## Purpose

TBD - created by archiving change minor-bugfixes. Update Purpose after archive.
## Requirements
### Requirement: The fast-track command set is the single canonical membership list

The set of commands that accept `--fast-track` SHALL be exactly `sai-explore`, `sai-2-design`, `sai-4-apply`, and `sai-archive`. This requirement is the single source of truth for fast-track membership. Every other requirement in this capability, and the `sai-fast-track-next-prompt-hint` capability (`openspec/specs/sai-fast-track-next-prompt-hint/spec.md`), SHALL derive membership from this list rather than maintaining an independent copy. Adding or removing a fast-track command SHALL be a single-point edit to this list, after which dependent requirements follow.

#### Scenario: Membership is resolved against the canonical list

- **WHEN** any requirement in this capability, or the next-prompt-hint capability, needs to decide whether a command supports `--fast-track`
- **THEN** it resolves membership against this canonical four-command list, so a future addition or removal is a single-point edit here rather than parallel edits across specs

### Requirement: sai-archive under fast-track auto-proceeds the unchecked-items gate and conditionally the delta-spec sync gate

When `sai-archive` runs with `--fast-track`, its opt-out set SHALL be exactly two gates:

1. **Unchecked-items gate (always).** The Completion Check soft confirmation (`sai/instructions/archive.md`) — presented when `implementation.md` exists and contains one or more `- [ ]` — SHALL auto-proceed as if the user answered `yes`, without asking the "Continue archiving with N unchecked items?" question. The archive move proceeds. No approval key is written to `.openspec.yaml` (the gate is conversational only, unchanged).

2. **Delta-spec sync gate (conditional).** The sync gate (upstream `openspec-archive-change` skill step 4, as governed by `sai/instructions/archive.md` Missing main spec handling) has two paths, both handled under `--fast-track`:
   - **Changes-needed path** (interactive options **Sync now** / **Archive without syncing**): the agent SHALL auto-proceed by selecting the **Sync now** branch — never **Archive without syncing** — if and only if the change is low-risk-by-construction, defined as the disjunction of EITHER (a) the implementation is detected as applied — `openspec/changes/{name}/implementation.md` exists AND contains at least one `- [x]` — OR (b) the change is backfilled — the `backfilled` value resolved by the Classification Check is `true` (`.openspec.yaml` exists, parses as valid YAML, and carries the boolean literal `backfilled: true`, per the resolution idiom in `sai/instructions/archive.md`). When NEITHER condition holds (not applied AND not backfilled), the changes-needed sync gate SHALL fire interactively exactly as without the flag.
   - **Already-synced path** (interactive options **Archive now** / **Sync anyway** / **Cancel**): the agent SHALL auto-proceed by selecting **Archive now** unconditionally, since the delta specs are already in sync and there is nothing to sync; this no-op path does not depend on the low-risk condition above.

The following gates SHALL remain in force under `sai-archive --fast-track` and SHALL NOT be opted out: the CORE-missing hard stop, the AUDIT informational line, all safe-operations confirmations, the pre-existence check, and the opencode change-name resolution. No `.openspec.yaml` key, session flag, or environment variable is introduced by this requirement.

#### Scenario: Unchecked-items gate auto-proceeds under fast-track

- **WHEN** `sai-archive {name} --fast-track` runs and `implementation.md` exists with one or more `- [ ]` unchecked items
- **THEN** the agent does not ask "Continue archiving with N unchecked items?", proceeds with the archive move as if `yes` was chosen, and writes no approval key to `.openspec.yaml`

#### Scenario: Sync gate auto-syncs when the implementation is applied

- **WHEN** `sai-archive {name} --fast-track` runs, delta specs need changes, and `implementation.md` exists containing at least one `- [x]`
- **THEN** the changes-needed sync gate is not presented; the agent selects the **Sync now** branch (not **Archive without syncing**) and proceeds to archive

#### Scenario: Sync gate auto-syncs when the change was born from sai-backfill

- **WHEN** `sai-archive {name} --fast-track` runs, delta specs need changes, `implementation.md` is absent or has zero `- [x]`, but the Classification Check resolved `backfilled: true`
- **THEN** the changes-needed sync gate is not presented; the agent selects the **Sync now** branch via the backfilled disjunct and proceeds to archive

#### Scenario: Sync gate still asks when neither low-risk condition holds

- **WHEN** `sai-archive {name} --fast-track` runs, delta specs need changes, `implementation.md` is absent or present with zero `- [x]` marks, AND the change is not backfilled
- **THEN** the changes-needed sync gate fires interactively with its usual options, exactly as it would without `--fast-track`

#### Scenario: Already-synced sync gate auto-archives under fast-track

- **WHEN** `sai-archive {name} --fast-track` runs and the delta specs are already in sync with the main specs (the gate's already-synced path)
- **THEN** the agent auto-selects **Archive now** without asking, unconditionally, because there is nothing to sync

#### Scenario: CORE-missing hard stop still halts under fast-track

- **WHEN** `sai-archive {name} --fast-track` runs and one or more CORE artifacts are not `done`
- **THEN** the agent STOPs with the existing "Missing CORE artifact(s): …. Archive blocked." message; fast-track does not bypass the hard stop

#### Scenario: AUDIT informational line still prints under fast-track

- **WHEN** `sai-archive {name} --fast-track` runs, all CORE artifacts are `done`, and one or more AUDIT artifacts are missing
- **THEN** the agent still prints the informational line `[sai-archive] informational: missing AUDIT artifact(s): …`; fast-track does not suppress it

### Requirement: The --fast-track flag is parsed in the shared body file and never reaches the picker

Exactly four commands — `sai-explore`, `sai-2-design`, `sai-4-apply`, and `sai-archive` — SHALL accept a `--fast-track` token in their arguments. The token SHALL be parsed by the command's shared body file (`sai/commands/sai-explore.md`, `sai/commands/sai-2-design.md`, `sai/commands/sai-4-apply.md`, `sai/commands/sai-archive.md`) out of `$ARGUMENTS`. After extraction the token SHALL be removed from the argument string, and the cleaned remainder (the change-name for `sai-2-design`/`sai-4-apply`/`sai-archive`, or the free-form request for `sai-explore`) SHALL be passed to the change-picker / run step exactly as if the flag had not been typed. The flag SHALL be a single positional token, not a session flag, environment variable, or `.openspec.yaml` key.

For commands that resolve a change name through the shared change-picker (`sai-2-design`, `sai-4-apply`, `sai-archive`), the body file SHALL additionally strip any residual `--fast-track` token from the picker's resolved value (the post-picker cleanup that handles the opencode wrapper-echo case) before passing the change name downstream.

The parse SHALL be single-sourced in the body file so that all harness thin wrappers (`commands/claude/`, `commands/opencode/`, `commands/copilot/`) inherit identical behavior; the wrappers carry only an updated `argument-hint` (except where a wrapper shape does not support one — see the harness-agnostic requirement).

#### Scenario: Flag is stripped and the change-name passes through cleanly

- **WHEN** a user runs `/sai-4-apply oauth2-auth --fast-track` (in any token order)
- **THEN** the body file activates fast-track mode, removes the `--fast-track` token, and the change-picker receives `oauth2-auth` with no residual flag text

#### Scenario: Absent flag leaves behavior identical to today

- **WHEN** a user runs `/sai-2-design oauth2-auth` with no `--fast-track` token
- **THEN** fast-track mode is inactive and every gate (language, approval, commit, human verification, archive soft gates) behaves exactly as it did before this capability existed

#### Scenario: The flag is confined to the four named commands

- **WHEN** a `--fast-track` token is passed to any command other than `sai-explore`, `sai-2-design`, `sai-4-apply`, or `sai-archive` (for example `sai-1-spec`, `sai-3-implement`, `sai-5-review`, `sai-pr`)
- **THEN** that command SHALL NOT gain fast-track behavior from this capability — the flag is not defined for it and its gates are unaffected

### Requirement: Fast-track mode announces itself with a single-line banner at run start

When `--fast-track` is active, the command's body file SHALL emit the single line `> FAST-TRACK MODE ACTIVE` at run start, as ordinary in-conversation text. The banner SHALL NOT be written to any file, `.openspec.yaml` key, environment variable, or config, so it remains compatible with Isolation Mode.

#### Scenario: Banner prints once when the flag is present

- **WHEN** any of the four commands starts a run with `--fast-track` active
- **THEN** the agent prints the exact line `> FAST-TRACK MODE ACTIVE` in the conversation before proceeding, and writes nothing to disk to record it

#### Scenario: No banner without the flag

- **WHEN** a command runs without `--fast-track`
- **THEN** no `FAST-TRACK MODE ACTIVE` banner is printed

### Requirement: The fast-track flag opts out only of the gates named per command, never others

For each of the four commands, `--fast-track` SHALL opt out of exactly the named gates and nothing else — it is a fixed, audited list of opt-outs, not a generic "skip all gates" switch. Safe-operations confirmations SHALL remain in force under fast-track for all four commands. No gate outside the per-command list SHALL be auto-answered or skipped.

#### Scenario: Safe-operations confirmations survive fast-track

- **WHEN** any of the four commands runs with `--fast-track` and is about to perform a destructive or hard-to-reverse operation covered by the safe-operations skill
- **THEN** the safe-operations confirmation is still required, because it is not in any command's fast-track opt-out list

#### Scenario: The opt-out set is fixed per command

- **WHEN** fast-track is active for `sai-explore` (two language gates), `sai-2-design` (specs approval gate only), `sai-4-apply` (commit authorization + Human Verification deferral only), or `sai-archive` (unchecked-items gate always + delta-spec sync gate conditional only)
- **THEN** no gate beyond that command's named set changes behavior

### Requirement: Fast-track behavior is harness-agnostic and documented
The `--fast-track` behavior SHALL be identical under Claude Code, opencode, and GitHub Copilot, achieved by single-sourcing the parse and gate branches in the shared body files and shared instructions. Any wrapper-level `argument-hint` change SHALL be mirrored across `commands/claude/`, `commands/opencode/`, and `commands/copilot/` in the same commit (Mirror discipline). Where a wrapper shape does not carry an `argument-hint` — specifically the opencode `sai-archive` wrapper, whose shape is echo-line-driven — no separate consistency marker is required on the echo line; the wrapper's echo-line shape matches every other opencode change-consuming wrapper, and the Claude Code and Copilot `sai-archive` wrappers SHALL carry the real `argument-hint`. `AGENTS.md` SHALL name `--fast-track` and its four affected commands under "Critical conventions", and `README.md` SHALL document the flag in the commands table.

#### Scenario: opencode sai-archive wrapper keeps its echo-line shape
- **WHEN** the `sai-archive` `argument-hint` is added to the Claude Code and Copilot wrappers
- **THEN** the opencode `sai-archive` wrapper does NOT gain a real `argument-hint`; no HTML comment consistency marker is required on the echo line, and this does not count as a Mirror-discipline violation

