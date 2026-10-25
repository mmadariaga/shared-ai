# sai-fast-track-flag Specification

## Purpose

Enables the `--fast-track` per-invocation flag on `sai-explore`, `sai-2-design`, `sai-4-apply`, `sai-archive`, `sai-backfill`, and `sai-merge`, defining each command's opt-out set, auto-stay behavior under fast-track mode, the single-canonical-membership rule, and the cross-command guardrails that survive fast-track.

## Requirements

### Requirement: sai-2-design under fast-track has no specs approval gate to opt out of

`--fast-track` remains accepted by `sai-2-design`, and its parsing, preflight ordering, and `> FAST-TRACK MODE ACTIVE` banner are unchanged. The specs approval gate SHALL not be treated as part of any opt-out set for `sai-2-design`, because that gate is an automatic stamp presented to nobody: the flag has no approval question to auto-answer, and the approval metadata is written identically with and without the flag.

#### Scenario: fast-track does not change approval behavior

- **WHEN** `/sai-2-design {name} --fast-track` runs and `/sai-2-design {name}` runs on an otherwise identical change
- **THEN** both invocations stamp `approval.specs.approved_at` (only when absent or empty) and `approval.specs.notes` as an empty string, with no question presented in either case

#### Scenario: fast-track membership and banner unchanged
- **WHEN** the fast-track command membership list or the `sai-2-design` banner behavior is evaluated
- **THEN** `sai-2-design` SHALL remain in the membership list and SHALL still emit the fast-track banner exactly once per session after universal prerequisites pass

### Requirement: sai-archive under fast-track auto-proceeds the unchecked-items gate and conditionally the delta-spec sync gate

When `sai-archive` runs with `--fast-track`, the archive flow SHALL present no decision gate of its own for synchronization or movement: the archive CLI SHALL handle synchronization and movement through exactly `openspec archive <name> --yes --json`. The existing archive commit gate, safe-operations confirmations, CORE hard stop, AUDIT informational line, collision check, and change-name resolution SHALL remain in force.

#### Scenario: Unchecked-items gate auto-proceeds under fast-track
- **WHEN** `sai-archive {name} --fast-track` runs
- **THEN** no unchecked-items question exists, because archive reads no `implementation.md` completion check

#### Scenario: Delta-spec synchronization has no separate gate
- **WHEN** `sai-archive {name} --fast-track` runs and delta specs require synchronization
- **THEN** no synchronization choice is presented and the authorized archive flow uses the CLI archive primitive

#### Scenario: Sync gate auto-syncs when the implementation is applied
- **WHEN** `sai-archive {name} --fast-track` runs and delta specs need changes
- **THEN** no synchronization choice is presented and no `implementation.md` checkbox is read

#### Scenario: Sync gate auto-syncs when the change was born from sai-backfill
- **WHEN** `sai-archive {name} --fast-track` runs, delta specs need changes, and the Classification Check resolved `backfilled: true`
- **THEN** no synchronization choice is presented and the authorized archive flow uses the CLI archive primitive

#### Scenario: Sync gate still asks when neither low-risk condition holds
- **WHEN** `sai-archive {name} --fast-track` runs and delta specs need changes
- **THEN** no synchronization choice is presented, because no low-risk condition gates the sync, and the CLI archive primitive runs subject to its pre-write validation

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

### Requirement: Fast-track mode announces itself with a single-line banner at run start
When `--fast-track` is active, the owning coordinator or main-session card SHALL print the exact line `> FAST-TRACK MODE ACTIVE` exactly once per invocation at run start as ordinary conversation text; compositions own their chained-segment banner so every path yields exactly one visible confirmation; routed-shaped `sai-backfill` parses worker-side and SHALL emit no banner anywhere in the run. The banner SHALL NOT be written to disk.

#### Scenario: Backfill runs bannerless

- **WHEN** `/sai-backfill --fast-track --staged {name}` runs
- **THEN** no `FAST-TRACK MODE ACTIVE` banner is printed at any point of the run

#### Scenario: No banner without the flag

- **WHEN** any command starts a run without `--fast-track`
- **THEN** no `FAST-TRACK MODE ACTIVE` banner is printed

### Requirement: The fast-track flag opts out only of the gates named per command, never others

For each parser-member command, `--fast-track` SHALL opt out of exactly the named gates and nothing else. It is a fixed, audited list of opt-outs, not a generic skip-all-gates switch. Safe-operations confirmations SHALL remain in force under fast-track for every member command. `/sai-explore` is not a parser member and SHALL have no opt-out set.

#### Scenario: safe-operations confirmations survive fast-track

- **WHEN** any member command runs with `--fast-track` and is about to perform a destructive or hard-to-reverse operation covered by the safe-operations skill
- **THEN** the safe-operations confirmation is still required because it is not in any command's fast-track opt-out list

#### Scenario: the opt-out set is fixed per command

- **WHEN** fast-track is active for `sai-archive` or `sai-backfill`
- **THEN** no gate beyond each command's named set changes behavior

#### Scenario: uncertainty menus are never auto-approved

- **WHEN** `/sai-explore` received `--fast-track` and a POC reaches a verdict of `<Cn> wins` or `none`
- **THEN** the verdict menu is presented rather than auto-approved

### Requirement: Fast-track behavior is harness-agnostic and documented
The `--fast-track` behavior SHALL be identical under Claude Code and opencode, achieved by single-sourcing the parse and gate branches in the shared cards and instructions. `argument-hint` is a Claude Code command field: the Claude wrappers of the commands that act on the flag (`/sai-archive` and `/sai-backfill`) document `--fast-track` there, the Claude `/sai-explore` wrapper does not, and the opencode wrappers, whose command format has no argument-hint field, carry none and need no separate consistency marker. `AGENTS.md` SHALL name `--fast-track` and the commands it affects under "Critical conventions", and `README.md` SHALL document the flag in the commands table.

#### Scenario: opencode wrappers carry no argument hint
- **WHEN** wrapper-level consistency for `--fast-track` argument hints is evaluated
- **THEN** each opencode wrapper keeps its label-free two-key envelope with no `argument-hint` and no HTML comment marker, and this does not count as a Mirror-discipline violation

### Requirement: The canonical fast-track policy is scoped to archive and backfill

`sai/policies/fast-track-flag.md` SHALL state in a Scope section that its canonical model governs only `/sai-archive` and `/sai-backfill`, the two commands where the flag skips real questions and gates. The policy SHALL name the archive coordinator as the owner of both the parse and the banner for `sai-archive`, SHALL keep `sai-backfill` as the phase-owned worker-side parse exception with no banner, and SHALL state that `/sai-explore` strips the token silently, with no banner, no `fast_track_active` state, and no behavioral effect. The policy SHALL NOT carry an explore-specific exception for the POC lane, the language gates, or the open-decision reconfirmation. The canonical parse order SHALL run the fast-track presence-plus-strip parse first and every other validation afterwards on the cleaned remainder. The backfill exception SHALL state that a standalone run keeps its interview as user questions and that the flag skips exactly the generated reconciliation questions, the spec-conflict decision, and the change-name confirmation. `/sai-archive` with `--fast-track` SHALL skip exactly the gates it skipped before this scoping, and without the flag every archive gate SHALL still ask.

#### Scenario: The policy names its two governed commands

- **WHEN** `sai/policies/fast-track-flag.md` is read
- **THEN** its Scope section states that the model governs `/sai-archive` and `/sai-backfill`, and its owner rule names the coordinator as parse and banner owner for `sai-archive` only

#### Scenario: Explore stays outside the model

- **WHEN** the policy's documented exceptions are read
- **THEN** `/sai-explore` is listed as stripping the token silently with no behavioral effect, and the policy no longer names `sai-explore` as a parse-and-banner owner or as keeping its own parse

### Requirement: sai-explore strips --fast-track silently

`/sai-explore` SHALL remove a `--fast-track` token from `arguments_value` and trim the surrounding whitespace silently, before the overview-language validation, and treat the remainder as the request: it SHALL print no `> FAST-TRACK MODE ACTIVE` banner, keep no fast-track state, and change no behavior, so runs with and without the token behave identically. Every explore question and gate SHALL stay as it is without the token, including the artifact-review and crystallization language gates, the overview-language question, the open-decision reconfirmation, the POC lane's three stops, and the route picker. The Claude Code `/sai-explore` wrapper SHALL NOT advertise `--fast-track` in its `argument-hint`.

#### Scenario: The token is stripped with no effect

- **WHEN** `/sai-explore my-topic --fast-track` runs
- **THEN** the request is `my-topic`, no banner is printed, and the run asks every question and gate it asks without the token

#### Scenario: The language gates still ask

- **WHEN** `/sai-explore` runs with `--fast-track` in a non-English conversation and reaches an artifact review or the crystallization language gate with no project setting answering it
- **THEN** the language question is asked as it is without the token

#### Scenario: The argument hint omits the token

- **WHEN** `commands/claude/sai-explore.md` is read
- **THEN** its `argument-hint` names the optional change name or topic and `--overview-lang <language>`, and no `--fast-track`

### Requirement: Fast-track parse membership is archive and backfill

Exactly two commands — `/sai-archive` and `/sai-backfill` — SHALL accept a `--fast-track` token and activate fast-track on it, per `sai/policies/fast-track-flag.md`. The archive coordinator SHALL parse the token from `arguments_value` before the change-picker and print the banner; the backfill worker card SHALL parse it with the diff-source tokens per its Envelope Tokens procedure and print no banner. After extraction the token SHALL be removed and the cleaned remainder SHALL remain authoritative downstream. `/sai-1-spec`, `/sai-2-design`, `/sai-plan`, `/sai-deep-review`, `/sai-build`, `/sai-3-implement`, `/sai-4-review`, and `/sai-merge` SHALL accept and ignore the token, activating nothing and printing no banner, and `/sai-explore` SHALL strip it silently. The parse SHALL be single-sourced in one location per command so that all harness thin wrappers inherit identical behavior.

#### Scenario: Archive strips the flag before picking

- **WHEN** a user runs `/sai-archive oauth2-auth --fast-track` in any token order
- **THEN** the archive coordinator activates fast-track mode, removes the token before picking, and the change-picker receives `oauth2-auth` with no residual flag text

#### Scenario: Backfill strips tokens worker-side

- **WHEN** a user runs `/sai-backfill my-change --staged --fast-track`
- **THEN** the worker card activates fast-track, resolves `--staged` as the diff source, and reads `my-change` as the explicit request-body identifier with no residual token text

#### Scenario: Other commands accept and ignore the token

- **WHEN** `--fast-track` is passed to `/sai-1-spec`, `/sai-4-review`, `/sai-build`, `/sai-merge`, or `/sai-explore`
- **THEN** the command activates nothing, prints no banner, and its gates are unaffected

### Requirement: Fast-track parse runs first and travels as session state
On every surface that also validates other options, the fast-track presence-plus-strip parse SHALL run FIRST, and every other flag validation SHALL run afterwards on the cleaned remainder; the activation signal SHALL travel everywhere as invocation-scoped session state named exactly `fast_track_active`, never as an envelope key and never persisted to any file or configuration.

#### Scenario: Explore strips the token before validating other options
- **WHEN** `sai-explore` receives `{name} --overview-lang fr --fast-track`
- **THEN** the fast-track token is stripped silently, with no banner and no `fast_track_active` state, before the overview-language validation examines the cleaned remainder
