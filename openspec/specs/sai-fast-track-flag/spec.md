# sai-fast-track-flag Specification

## Purpose

Enables the `--fast-track` per-invocation flag on `sai-explore`, `sai-2-design`, `sai-4-apply`, and `sai-archive`, defining each command's opt-out set, auto-stay behavior under fast-track mode, the single-canonical-membership rule, and the cross-command guardrails that survive fast-track.

## Requirements
### Requirement: The fast-track command set is the single canonical membership list

The set of commands that accept and parse `--fast-track` SHALL be exactly `sai-explore`, `sai-2-design`, `sai-4-apply`, `sai-archive`, and `sai-backfill`. `sai-explore`, `sai-2-design`, and `sai-4-apply` parse the token in their shared body files; routed-shaped `sai-archive` parses it in its coordinator card (`sai/commands/archive/coordinator.md`) because its utility body card was retired; routed-shaped `sai-backfill` parses it in its worker card (`sai/commands/backfill/worker.md`) alongside the diff-source tokens, with no banner. This requirement is the single source of truth for parser membership. A composition command outside this set MAY inject apply fast-track without becoming a parser member.

#### Scenario: Membership is resolved against the canonical list

- **WHEN** any requirement in this capability needs to decide whether a command supports `--fast-track`
- **THEN** it resolves membership against this canonical five-command list, so a future addition or removal is a single-point edit here rather than parallel edits across specs

### Requirement: sai-2-design under fast-track has no specs approval gate to opt out of

`--fast-track` remains accepted by `sai-2-design`, and its parsing, preflight ordering, and `> FAST-TRACK MODE ACTIVE` banner are unchanged. The specs approval gate is no longer part of any opt-out set for `sai-2-design`, because that gate is an automatic stamp presented to nobody: the flag has no approval question to auto-answer, and the approval metadata is written identically with and without the flag.

#### Scenario: fast-track does not change approval behavior

- **WHEN** `/sai-2-design {name} --fast-track` runs and `/sai-2-design {name}` runs on an otherwise identical change
- **THEN** both invocations stamp `approval.specs.approved_at` (only when absent or empty) and `approval.specs.notes` as an empty string, with no question presented in either case

#### Scenario: fast-track membership and banner unchanged
- **WHEN** the fast-track command membership list or the `sai-2-design` banner behavior is evaluated
- **THEN** `sai-2-design` SHALL remain in the membership list and SHALL still emit the fast-track banner exactly once per session after universal prerequisites pass

### Requirement: sai-archive under fast-track auto-proceeds the unchecked-items gate and conditionally the delta-spec sync gate

When `sai-archive` runs with `--fast-track`, its opt-out set SHALL be exactly three gates:

1. **Unchecked-items gate (always).** The Completion Check soft confirmation (`sai/commands/archive/instructions.md`) — presented when `implementation.md` exists and contains one or more `- [ ]` — SHALL auto-proceed as if the user answered `yes`, without asking the "Continue archiving with N unchecked items?" question. The archive move proceeds. No approval key is written to `.openspec.yaml` (the gate is conversational only, unchanged).

2. **Delta-spec sync gate (conditional).** The sync gate (upstream `openspec-archive-change` skill step 4, as governed by `sai/commands/archive/instructions.md` Missing main spec handling) has two paths, both handled under `--fast-track`:
   - **Changes-needed path** (interactive options **Sync now** / **Archive without syncing**): the agent SHALL auto-proceed by selecting the **Sync now** branch — never **Archive without syncing** — if and only if the change is low-risk-by-construction, defined as the disjunction of EITHER (a) the implementation is detected as applied — `openspec/changes/{name}/implementation.md` exists AND contains at least one `- [x]` — OR (b) the change is backfilled — the `backfilled` value resolved by the Classification Check is `true` (`.openspec.yaml` exists, parses as valid YAML, and carries the boolean literal `backfilled: true`, per the resolution idiom in `sai/commands/archive/instructions.md`). When NEITHER condition holds (not applied AND not backfilled), the changes-needed sync gate SHALL fire interactively exactly as without the flag.
   - **Already-synced path** (interactive options **Archive now** / **Sync anyway** / **Cancel**): the agent SHALL auto-proceed by selecting **Archive now** unconditionally, since the delta specs are already in sync and there is nothing to sync; this no-op path does not depend on the low-risk condition above.

3. **Archive commit gate (auto-select new commit).** The post-archive commit gate (`openspec/specs/sai-archive-commit-gate/spec.md`) SHALL NOT be presented as a prompt; the agent SHALL auto-select the new-commit option. Because a new commit is never destructive, the pushed-HEAD guard does not apply to the fast-track path, and there is no do-nothing fallback and no pushed-HEAD explanatory line. The shared empty-index guard SHALL still apply: when staging exactly `openspec/specs` and `openspec/changes/archive` leaves the index with no staged changes, the agent SHALL NOT create a commit and SHALL print the guard's single explanatory line. When `git status` shows no changes, the gate and its auto-selection SHALL be skipped. The gate SHALL NOT adopt the `commit-auth-gate` `yes` / `no` / `Allow on this session` option set and SHALL NOT set or read the session commit-authorization flag.

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

#### Scenario: Archive commit gate auto-commits via a new commit under fast-track

- **WHEN** `sai-archive {name} --fast-track` completes the archive skill and staging the two paths leaves a non-empty staged diff
- **THEN** the agent presents no commit-gate prompt, stages exactly `openspec/specs` and `openspec/changes/archive`, composes the message per `sai/commands/commit/instructions.md` steps 1–5, and creates a new commit

#### Scenario: Archive commit gate commits nothing when the index is empty under fast-track

- **WHEN** `sai-archive {name} --fast-track` completes the archive skill and staging the two paths leaves the index with no staged changes
- **THEN** the agent does not create a commit and prints the guard's explanatory line

### Requirement: The --fast-track flag is parsed from arguments_value before the picker

Exactly five commands — `sai-explore`, `sai-2-design`, `sai-4-apply`, `sai-archive`, and `sai-backfill` — SHALL accept a `--fast-track` token in their arguments. The token SHALL be parsed from `arguments_value` before downstream resolution: in the shared body file for `sai-explore`, `sai-2-design`, and `sai-4-apply`, in the `sai-archive` coordinator card before the change-picker, and in the `sai-backfill` worker card per its Envelope Tokens procedure, which also parses the diff-source tokens and reads the trimmed remainder as the request body. After extraction the token SHALL be removed from `arguments_value`, and the cleaned remainder SHALL remain authoritative downstream. `/sai-build` remains outside this parser membership and may inject apply fast-track through composition. No wrapper-echo field is forwarded or used to find or clean a change name.

For `sai-2-design`, `sai-4-apply`, and `sai-archive`, the cleaned `arguments_value` SHALL reach the shared change-picker before it resolves a name. `sai-4-apply` and `sai-archive` SHALL NOT strip a residual `--fast-track` token from the picker's resolved value or perform a second flag-removal pass after picking. `sai-backfill` consumes no change-picker; its cleaned request body is read by its own technical flow.

The parse SHALL be single-sourced in one location per command — the shared body file, the coordinator card for `sai-archive`, or the worker card for `sai-backfill` — so that all harness thin wrappers inherit identical behavior.

#### Scenario: Flag is stripped and the change-name passes through cleanly

- **WHEN** a user runs `/sai-4-apply oauth2-auth --fast-track` (in any token order)
- **THEN** the body file activates fast-track mode, removes the `--fast-track` token from `arguments_value` before picking, and the change-picker receives `oauth2-auth` with no residual flag text

#### Scenario: Backfill strips tokens worker-side

- **WHEN** a user runs `/sai-backfill my-change --staged --fast-track`
- **THEN** the worker card activates fast-track, resolves `--staged` as the diff source, and reads `my-change` as the explicit request-body identifier with no residual token text

#### Scenario: Absent flag leaves behavior identical to today

- **WHEN** a user runs `/sai-4-apply oauth2-auth` with no `--fast-track` token
- **THEN** fast-track mode is inactive and every gate behaves exactly as it did before this capability existed

#### Scenario: The flag is confined to the named commands

- **WHEN** a `--fast-track` token is passed to any command other than `sai-explore`, `sai-2-design`, `sai-4-apply`, `sai-archive`, or `sai-backfill` (for example `sai-1-spec`, `sai-3-implement`, `sai-5-review`, `sai-pr`)
- **THEN** that command SHALL NOT gain fast-track behavior from this capability — the flag is not defined for it and its gates are unaffected

### Requirement: Fast-track mode announces itself with a single-line banner at run start

When `--fast-track` is active through body-file parsing, the command's body file SHALL emit the single line `> FAST-TRACK MODE ACTIVE` at run start; when active through `sai-archive`'s coordinator-card parsing, the coordinator card owns the same banner at run start. When apply receives fast-track only through a chained composition, the supervising composition coordinator owns the banner at apply activation. Routed-shaped `sai-backfill` parses worker-side and SHALL emit no banner anywhere in the run. The banner SHALL NOT be written to disk.

#### Scenario: Archive banner prints from the coordinator

- **WHEN** `/sai-archive {name} --fast-track` runs
- **THEN** the coordinator prints the exact line `> FAST-TRACK MODE ACTIVE` once at run start, after the prerequisite checks and before change resolution, and writes nothing to disk to record it

#### Scenario: Backfill runs bannerless

- **WHEN** `/sai-backfill {name} --fast-track` runs
- **THEN** no `FAST-TRACK MODE ACTIVE` banner is printed at any point of the run

#### Scenario: No banner without the flag

- **WHEN** a command runs without `--fast-track`
- **THEN** no `FAST-TRACK MODE ACTIVE` banner is printed

### Requirement: Composition-injected apply fast-track under sai-build
`/sai-build` SHALL always inject normalized apply fast-track true when activating its chained apply segment without becoming a fifth body-file parser. Explicit `--fast-track` on build SHALL not change phase order, injection, gates, or banner behavior; safe-operations and other non-opted-out gates remain in force.

#### Scenario: Build injects apply fast-track
- **WHEN** build activates apply
- **THEN** apply receives fast-track true while build remains outside the four parser members

### Requirement: Composition owns the chained banner
When chained apply receives composition-injected fast-track true, the supervising coordinator SHALL emit `> FAST-TRACK MODE ACTIVE` exactly once at activation and zero times if apply never activates. Standalone parser-member behavior remains unchanged.

#### Scenario: Build banner is activation-scoped
- **WHEN** build transitions successfully to apply
- **THEN** the coordinator prints one banner and the skipped apply shell does not print another

#### Scenario: Failed build has no banner
- **WHEN** implement fails or is cancelled before apply
- **THEN** no composition banner is printed

#### Scenario: Banner prints once when the flag is present

- **WHEN** any of the four commands starts a run with `--fast-track` active
- **THEN** the agent prints the exact line `> FAST-TRACK MODE ACTIVE` in the conversation before proceeding, and writes nothing to disk to record it

#### Scenario: No banner without the flag

- **WHEN** a command runs without `--fast-track`
- **THEN** no `FAST-TRACK MODE ACTIVE` banner is printed

### Requirement: Apply fast-track restores its two gate opt-outs

When the apply fast-track signal is active, the coordinator SHALL pre-activate session-scoped commit authorization and SHALL auto-resolve the implementation plan's branch-selection prompt to staying on a non-empty current branch. All safe-operations, GREEN-conflict, Human Verification, and reporting requirements remain in force.

#### Scenario: Fast-track stays on a current branch
- **WHEN** the fast-track signal is active and the current branch is non-empty
- **THEN** the coordinator skips the three-option branch prompt, creates or switches to no branch, and prints `> Fast-track: staying on current branch "{current-branch}"`

#### Scenario: Branch-base sub-prompt needs no handling because stay is a git no-op

- **WHEN** the branch prompt is auto-resolved to "Stay on current branch" under fast-track
- **THEN** the branch-base sub-prompt is not reached — it is surfaced only for new branches — so the auto-selection introduces no additional prompt to suppress

#### Scenario: Detached HEAD remains interactive
- **WHEN** the fast-track signal is active and the current branch is empty because HEAD is detached
- **THEN** the coordinator presents the original three-option branch prompt and prints no auto-stay announcement

#### Scenario: Auto-stay does not relax any other apply gate

- **WHEN** `sai-4-apply {name} --fast-track` auto-stays on the current branch and later reaches a safe-operations confirmation or the commit-authorization gate
- **THEN** the safe-operations confirmation is still required and the commit gate still prints its pre-commit file visibility report and proposed message; auto-staying opts out of the branch prompt only, nothing else

### Requirement: The fast-track flag opts out only of the gates named per command, never others

For each parser-member command, `--fast-track` SHALL opt out of exactly the named gates and nothing else — it is a fixed, audited list of opt-outs, not a generic "skip all gates" switch. Safe-operations confirmations SHALL remain in force under fast-track for every member command. No gate outside the per-command list SHALL be auto-answered or skipped.

#### Scenario: Safe-operations confirmations survive fast-track

- **WHEN** any member command runs with `--fast-track` and is about to perform a destructive or hard-to-reverse operation covered by the safe-operations skill
- **THEN** the safe-operations confirmation is still required, because it is not in any command's fast-track opt-out list

#### Scenario: The opt-out set is fixed per command

- **WHEN** fast-track is active for `sai-explore` (two language gates), `sai-2-design` (no opt-out gate; specs approval is an automatic stamp), `sai-4-apply` (both commit-authorization gates — the per-Step STOP & COMMIT gate and the terminal documentation commit gate — + Human Verification deferral + Prerequisites branch-selection prompt auto-stay only), `sai-archive` (unchecked-items gate always + delta-spec sync gate conditional only + archive commit gate auto-select-new-commit only), or `sai-backfill` (generated reconciliation questions + spec-conflict decision + crystallized-block change-name confirmation only)
- **THEN** no gate beyond that command's named set changes behavior

### Requirement: Fast-track behavior is harness-agnostic and documented
The `--fast-track` behavior SHALL be identical under Claude Code, opencode, and GitHub Copilot, achieved by single-sourcing the parse and gate branches in the shared body files, shared instructions, and routed cards. Any wrapper-level `argument-hint` change SHALL be mirrored across `commands/claude/`, `commands/opencode/`, and `commands/copilot/` in the same commit (Mirror discipline). Where a wrapper shape does not carry an `argument-hint` — specifically the opencode `sai-archive` wrapper — no separate consistency marker is required. `AGENTS.md` SHALL name `--fast-track` and its five affected commands under "Critical conventions", and `README.md` SHALL document the flag in the commands table.

#### Scenario: opencode sai-archive wrapper keeps its envelope shape
- **WHEN** wrapper-level consistency for `--fast-track` argument hints is evaluated
- **THEN** the opencode `sai-archive` wrapper keeps its label-free two-key envelope with no real `argument-hint` and no HTML comment marker, and this does not count as a Mirror-discipline violation
