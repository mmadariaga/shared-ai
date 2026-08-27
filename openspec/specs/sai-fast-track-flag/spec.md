# sai-fast-track-flag Specification

## Purpose

Enables the `--fast-track` per-invocation flag on `sai-explore`, `sai-2-design`, `sai-4-apply`, `sai-archive`, `sai-backfill`, and `sai-merge`, defining each command's opt-out set, auto-stay behavior under fast-track mode, the single-canonical-membership rule, and the cross-command guardrails that survive fast-track.
## Requirements

### Requirement: Fast-track opt-in membership
The set of commands that accept and parse `--fast-track` SHALL be exactly `sai-explore`, `sai-2-design`, `sai-4-apply`, `sai-archive`, `sai-backfill`, and `sai-merge`, per the canonical model single-sourced in `sai/policies/fast-track-flag.md`. `sai-explore` and `sai-4-apply` parse in their main-session body cards; `sai-2-design` parses in its coordinator card since the flag-parsing unification — its coordinator card owns BOTH the parse and the banner, and the design worker neither parses the token nor emits a banner nor keeps dedup state; routed-shaped `sai-archive` parses in its coordinator card; routed-shaped `sai-backfill` parses in its worker card alongside the diff-source tokens, with no banner (a deliberate documented exception); routed-shaped `sai-merge` parses in its coordinator card. A composition command outside this set MAY inject apply fast-track without becoming a parser member, and MAY strip an explicit `--fast-track` token as a behavioral no-op without activating any mode — `/sai-build` and `/sai-review` do exactly this before change resolution.

#### Scenario: Design parses coordinator-side
- **WHEN** `/sai-2-design` receives an envelope containing `--fast-track`
- **THEN** the design coordinator performs the presence-plus-strip parse, prints the single banner itself, and forwards the cleaned remainder, while the design worker returns no notice and keeps no banner-dedup state

#### Scenario: Review stays a no-op stripper
- **WHEN** `/sai-review` receives `--fast-track`
- **THEN** it strips the token before change resolution without activating fast-track or printing a banner

### Requirement: Preserve fast-track's explore language behavior

Explore fast-track SHALL bypass gate 9 without an explicit overview-language option and SHALL resolve `None`; explicit `--overview-lang` SHALL override that default only on the supervised route. Direct Build - Unattended SHALL treat the explicit option as a no-op and SHALL never generate `change-overview.md`.

The fast-track signal SHALL not bypass the technical-uncertainty assessment, Ask 1, the viable post-POC menu, or the not-viable post-POC menu. Those uncertainty decisions remain explicit even when the language questions are bypassed.

#### Scenario: auto-fast remains overview-free

- **WHEN** Direct Build - Unattended is selected with or without an explicit overview-language option
- **THEN** no overview-language question or overview generation occurs

#### Scenario: fast-track does not bypass uncertainty choices

- **WHEN** `--fast-track` is active and the technical-uncertainty assessment fires
- **THEN** Ask 1 and the applicable post-POC menu remain presented and require the user's explicit choice

### Requirement: sai-2-design under fast-track has no specs approval gate to opt out of

`--fast-track` remains accepted by `sai-2-design`, and its parsing, preflight ordering, and `> FAST-TRACK MODE ACTIVE` banner are unchanged. The specs approval gate SHALL not be treated as part of any opt-out set for `sai-2-design`, because that gate is an automatic stamp presented to nobody: the flag has no approval question to auto-answer, and the approval metadata is written identically with and without the flag.

#### Scenario: fast-track does not change approval behavior

- **WHEN** `/sai-2-design {name} --fast-track` runs and `/sai-2-design {name}` runs on an otherwise identical change
- **THEN** both invocations stamp `approval.specs.approved_at` (only when absent or empty) and `approval.specs.notes` as an empty string, with no question presented in either case

#### Scenario: fast-track membership and banner unchanged
- **WHEN** the fast-track command membership list or the `sai-2-design` banner behavior is evaluated
- **THEN** `sai-2-design` SHALL remain in the membership list and SHALL still emit the fast-track banner exactly once per session after universal prerequisites pass

### Requirement: sai-archive under fast-track auto-proceeds the unchecked-items gate and conditionally the delta-spec sync gate

When `sai-archive` runs with `--fast-track`, the unchecked-items gate SHALL auto-proceed as if the user answered `yes`, without asking the unchecked-items question or writing approval metadata. Delta-spec synchronization SHALL NOT have a separate decision gate: the archive CLI SHALL handle synchronization and movement through exactly `openspec archive <name> --yes --json`. The existing archive commit gate, safe-operations confirmations, CORE hard stop, AUDIT informational line, collision check, and change-name resolution SHALL remain in force.

#### Scenario: Unchecked-items gate auto-proceeds under fast-track

- **WHEN** `sai-archive {name} --fast-track` runs and `implementation.md` contains unchecked items
- **THEN** the agent does not ask the unchecked-items question, proceeds as if `yes` was chosen, and writes no approval key

#### Scenario: Delta-spec synchronization has no separate gate

- **WHEN** `sai-archive {name} --fast-track` runs and delta specs require synchronization
- **THEN** no synchronization choice is presented and the authorized archive flow uses the CLI archive primitive

#### Scenario: Sync gate auto-syncs when the implementation is applied

- **WHEN** `sai-archive {name} --fast-track` runs, delta specs need changes, and `implementation.md` contains at least one `- [x]`
- **THEN** no synchronization choice is presented and the authorized archive flow uses the CLI archive primitive

#### Scenario: Sync gate auto-syncs when the change was born from sai-backfill

- **WHEN** `sai-archive {name} --fast-track` runs, delta specs need changes, and the Classification Check resolved `backfilled: true`
- **THEN** no synchronization choice is presented and the authorized archive flow uses the CLI archive primitive

#### Scenario: Sync gate still asks when neither low-risk condition holds

- **WHEN** `sai-archive {name} --fast-track` runs and delta specs need changes without an applicable legacy low-risk condition
- **THEN** no synchronization choice is presented and the authorized archive flow uses the CLI archive primitive, subject to its pre-write validation

#### Scenario: Already-synced sync gate auto-archives under fast-track

- **WHEN** `sai-archive {name} --fast-track` runs and the delta specs are already in sync with the main specs
- **THEN** no synchronization choice is presented and the archive flow uses the CLI archive primitive

#### Scenario: No delta specs still use the CLI

- **WHEN** `sai-archive {name} --fast-track` runs without delta specs
- **THEN** the archive flow still uses `openspec archive <name> --yes --json` rather than a separate manual move

#### Scenario: CORE-missing hard stop still halts under fast-track

- **WHEN** `sai-archive {name} --fast-track` runs and one or more CORE artifacts are not `done`
- **THEN** the agent stops with `Missing CORE artifact(s): …. Archive blocked.` and fast-track does not bypass the hard stop

#### Scenario: AUDIT informational line still prints under fast-track

- **WHEN** `sai-archive {name} --fast-track` runs with complete CORE artifacts and missing AUDIT artifacts
- **THEN** the agent prints the informational AUDIT line and continues without suppressing it

#### Scenario: Archive commit gate remains protected

- **WHEN** fast-track archive processing leaves eligible staged changes after the CLI archive succeeds
- **THEN** the documented fast-track commit behavior creates only the authorized new local commit and retains the empty-index guard

#### Scenario: Archive commit gate auto-commits via a new commit under fast-track

- **WHEN** fast-track archive processing leaves eligible staged changes after the CLI archive succeeds
- **THEN** the command presents no commit-gate prompt and creates one authorized new local commit

#### Scenario: Archive commit gate commits nothing when the index is empty under fast-track

- **WHEN** fast-track archive processing leaves the index empty after exact-path classification
- **THEN** the command creates no commit and preserves the empty-index guard

#### Scenario: Safe operations and collision checks remain in force

- **WHEN** fast-track archive processing reaches a safe-operations confirmation or an existing archive target
- **THEN** the confirmation or collision stop remains required and fast-track does not bypass it

### Requirement: The --fast-track flag is parsed from arguments_value before the picker

Exactly six commands — `sai-explore`, `sai-2-design`, `sai-4-apply`, `sai-archive`, `sai-backfill`, and `sai-merge` — SHALL accept a `--fast-track` token in their arguments. The token SHALL be parsed from `arguments_value` before downstream resolution: in the shared body file for `sai-explore`, `sai-2-design`, and `sai-4-apply`, in the `sai-archive` coordinator card before the change-picker, in the `sai-backfill` worker card per its Envelope Tokens procedure, which also parses the diff-source tokens and reads the trimmed remainder as the request body, and in the `sai-merge` coordinator card before forwarding the cleaned remainder to its worker. After extraction the token SHALL be removed from `arguments_value`, and the cleaned remainder SHALL remain authoritative downstream. `/sai-build` remains outside this parser membership and may inject apply fast-track through composition. No wrapper-echo field is forwarded or used to find or clean a change name.

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
When `--fast-track` is active, the owning coordinator or main-session card SHALL print the exact line `> FAST-TRACK MODE ACTIVE` exactly once per invocation at run start as ordinary conversation text; compositions own their chained-segment banner so every path yields exactly one visible confirmation; routed-shaped `sai-backfill` parses worker-side and SHALL emit no banner anywhere in the run. The banner SHALL NOT be written to disk.

#### Scenario: Backfill runs bannerless

- **WHEN** `/sai-backfill --fast-track --staged {name}` runs
- **THEN** no `FAST-TRACK MODE ACTIVE` banner is printed at any point of the run

#### Scenario: No banner without the flag

- **WHEN** any command starts a run without `--fast-track`
- **THEN** no `FAST-TRACK MODE ACTIVE` banner is printed

### Requirement: Composition-injected apply fast-track under sai-build
`/sai-build` SHALL always inject normalized apply fast-track true when activating its chained apply segment without becoming a seventh body-file parser. Explicit `--fast-track` on build SHALL not change phase order, injection, gates, or banner behavior; safe-operations and other non-opted-out gates remain in force.

#### Scenario: Build injects apply fast-track
- **WHEN** build activates apply
- **THEN** apply receives fast-track true while build remains outside the six parser members

### Requirement: Composition owns the chained banner
When chained apply receives composition-injected fast-track true, the supervising coordinator SHALL emit `> FAST-TRACK MODE ACTIVE` exactly once at activation and zero times if apply never activates. Standalone parser-member behavior remains unchanged.

#### Scenario: Build banner is activation-scoped
- **WHEN** build transitions successfully to apply
- **THEN** the coordinator prints one banner and the skipped apply shell does not print another

#### Scenario: Failed build has no banner
- **WHEN** implement fails or is cancelled before apply
- **THEN** no composition banner is printed

#### Scenario: Banner prints once when the flag is present

- **WHEN** any banner-emitting parser-member command starts a run with `--fast-track` active
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

For each parser-member command, `--fast-track` SHALL opt out of exactly the named gates and nothing else. It is a fixed, audited list of opt-outs, not a generic skip-all-gates switch. Safe-operations confirmations SHALL remain in force under fast-track for every member command. For `sai-explore`, the language-gate opt-outs SHALL not include the technical-uncertainty pause, Ask 1, viable post-POC choices, or not-viable post-POC choices.

#### Scenario: safe-operations confirmations survive fast-track

- **WHEN** any member command runs with `--fast-track` and is about to perform a destructive or hard-to-reverse operation covered by the safe-operations skill
- **THEN** the safe-operations confirmation is still required because it is not in any command's fast-track opt-out list

#### Scenario: the opt-out set is fixed per command

- **WHEN** fast-track is active for `sai-explore`, `sai-2-design`, `sai-4-apply`, `sai-archive`, `sai-backfill`, or `sai-merge`
- **THEN** no gate beyond each command's named set changes behavior
- **AND** `sai-explore` still presents Ask 1 and every applicable post-POC menu

#### Scenario: uncertainty menus are never auto-approved

- **WHEN** `--fast-track` is active and a viability POC reaches either a viable or not-viable verdict
- **THEN** the corresponding post-POC menu is presented rather than auto-approved

### Requirement: Merge fast-track bypasses only runtime scope

When `/sai-merge` runs with `--fast-track`, it SHALL bypass only the runtime resolution scope question. It SHALL still require conflict-triggered language selection, global strategy confirmation, complete-file payload validation, worker-owned verification, and final commit authorization.

#### Scenario: Fast-track conflict retains strategy safety

- **WHEN** a fast-track merge contains a semantically ambiguous conflict
- **THEN** the command skips only scope selection and still requires the contextual decision and every later validation and authorization boundary

### Requirement: Fast-track behavior is harness-agnostic and documented
The `--fast-track` behavior SHALL be identical under Claude Code, opencode, and GitHub Copilot, achieved by single-sourcing the parse and gate branches in the shared body files, shared instructions, and routed cards. Any wrapper-level `argument-hint` change SHALL be mirrored across `commands/claude/`, `commands/opencode/`, and `commands/copilot/` in the same commit (Mirror discipline). Where a wrapper shape does not carry an `argument-hint` — specifically the opencode `sai-archive` wrapper — no separate consistency marker is required. `AGENTS.md` SHALL name `--fast-track` and its six affected commands under "Critical conventions", and `README.md` SHALL document the flag in the commands table.

#### Scenario: opencode sai-archive wrapper keeps its envelope shape
- **WHEN** wrapper-level consistency for `--fast-track` argument hints is evaluated
- **THEN** the opencode `sai-archive` wrapper keeps its label-free two-key envelope with no real `argument-hint` and no HTML comment marker, and this does not count as a Mirror-discipline violation

### Requirement: Canonical fast-track parse order and state channel
On every surface that also validates other options, the fast-track presence-plus-strip parse SHALL run FIRST, and every other flag validation SHALL run afterwards on the cleaned remainder; the activation signal SHALL travel everywhere as invocation-scoped session state named exactly `fast_track_active`, never as an envelope key and never persisted to any file or configuration.

#### Scenario:
- **WHEN** `sai-explore` receives `{name} --overview-lang fr --fast-track`
- **THEN** the fast-track token is stripped and its banner printed before the overview-language validation examines the cleaned remainder

