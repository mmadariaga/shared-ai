## ADDED Requirements

### Requirement: The --fast-track flag is parsed in the shared body file and never reaches the picker

Exactly three commands — `sai-explore`, `sai-2-design`, and `sai-4-apply` — SHALL accept a `--fast-track` token in their arguments. The token SHALL be parsed by the command's shared body file (`sai/commands/sai-explore.md`, `sai/commands/sai-2-design.md`, `sai/commands/sai-4-apply.md`) out of `$ARGUMENTS`. After extraction the token SHALL be removed from the argument string, and the cleaned remainder (the change-name for `sai-2-design`/`sai-4-apply`, or the free-form request for `sai-explore`) SHALL be passed to the change-picker / run step exactly as if the flag had not been typed. The flag SHALL be a single positional token, not a session flag, environment variable, or `.openspec.yaml` key.

The parse SHALL be single-sourced in the body file so that all three harness thin wrappers (`commands/claude/`, `commands/opencode/`, `commands/copilot/`) inherit identical behavior; the wrappers carry only an updated `argument-hint`.

#### Scenario: Flag is stripped and the change-name passes through cleanly

- **WHEN** a user runs `/sai-4-apply oauth2-auth --fast-track` (in any token order)
- **THEN** the body file activates fast-track mode, removes the `--fast-track` token, and the change-picker receives `oauth2-auth` with no residual flag text

#### Scenario: Absent flag leaves behavior identical to today

- **WHEN** a user runs `/sai-2-design oauth2-auth` with no `--fast-track` token
- **THEN** fast-track mode is inactive and every gate (language, approval, commit, human verification) behaves exactly as it did before this capability existed

#### Scenario: The flag is confined to the three named commands

- **WHEN** a `--fast-track` token is passed to any command other than `sai-explore`, `sai-2-design`, or `sai-4-apply` (for example `sai-1-spec`, `sai-3-implement`, `sai-5-review`, `sai-archive`, `sai-pr`)
- **THEN** that command SHALL NOT gain fast-track behavior from this capability — the flag is not defined for it and its gates are unaffected

### Requirement: Fast-track mode announces itself with a single-line banner at run start

When `--fast-track` is active, the command's body file SHALL emit the single line `> FAST-TRACK MODE ACTIVE` at run start, as ordinary in-conversation text. The banner SHALL NOT be written to any file, `.openspec.yaml` key, environment variable, or config, so it remains compatible with Isolation Mode.

#### Scenario: Banner prints once when the flag is present

- **WHEN** any of the three commands starts a run with `--fast-track` active
- **THEN** the agent prints the exact line `> FAST-TRACK MODE ACTIVE` in the conversation before proceeding, and writes nothing to disk to record it

#### Scenario: No banner without the flag

- **WHEN** a command runs without `--fast-track`
- **THEN** no `FAST-TRACK MODE ACTIVE` banner is printed

### Requirement: sai-explore under fast-track takes the English path of both language gates

When `sai-explore` runs with `--fast-track`, both language gates SHALL take their English path unconditionally and SHALL NOT ask the language question: the artifact-review language gate (`sai/instructions/explore.md` item 3) and the crystallization language gate (`sai/instructions/explore.md` item 8). Each gate instruction gains exactly one `if FAST-TRACK` branch; no other behavior in `explore.md` changes. Crystallizations and reviews are therefore produced in English regardless of the user's input language.

#### Scenario: Review gate skips to English under fast-track

- **WHEN** `sai-explore --fast-track` is asked to review an OpenSpec artifact and the user's dominant language is not English
- **THEN** the agent produces the review directly in English with no language question

#### Scenario: Crystallization gate skips to English under fast-track

- **WHEN** `sai-explore --fast-track` reaches an explicit crystallize request and the user's dominant language is not English
- **THEN** the agent emits the `Ready to Propose` block(s) with English prose and no language question

#### Scenario: Without fast-track the explore language gates are unchanged

- **WHEN** `sai-explore` runs without `--fast-track`
- **THEN** items 3 and 8 fire exactly as specified today (English skip / non-English question), unaffected by this capability

### Requirement: sai-2-design under fast-track auto-approves the specs approval gate

When `sai-2-design` runs with `--fast-track`, the specs approval gate (`sai/instructions/design.md` "Approval gate") SHALL auto-approve without asking the "Have you reviewed the specs…" question, and SHALL write `approval.specs.approved_at` (current UTC timestamp, ISO 8601) and `approval.specs.notes` (empty string, matching the no-flag path's empty-notes fallback) to `openspec/changes/{name}/.openspec.yaml`, MERGING into the existing file content and preserving all prior top-level keys verbatim — identical write semantics to the interactive path. The pre-existence check (proposal.md present AND at least one `specs/**/*.md` present) SHALL still run; on failure the command SHALL still STOP with the same message.

#### Scenario: Approval gate auto-approves and records the timestamp

- **WHEN** `sai-2-design oauth2-auth --fast-track` runs and `proposal.md` plus at least one spec file exist
- **THEN** the agent does not ask the approval question, writes `approval.specs.approved_at` and `approval.specs.notes` into `.openspec.yaml` (merging, preserving `schema:`/`created:` and any existing keys), and proceeds to generate design artifacts

#### Scenario: Missing specs still halts even under fast-track

- **WHEN** `sai-2-design {name} --fast-track` runs but no `specs/**/*.md` file exists
- **THEN** the agent STOPs with the existing "Change '{name}' not found or has no specs. Run /sai-1-spec to create it first." message and writes nothing

### Requirement: sai-2-design fast-track leaves the artifact feedback gate and the (a)/(b) choice unchanged

The `--fast-track` opt-out for `sai-2-design` SHALL be limited to the specs approval gate. The artifact feedback gate (`sai/instructions/artifact-feedback-gate.md`, presented after the design decision summary) and the post-design (a)/(b) implementation-continuation choice SHALL fire exactly as they do without the flag.

#### Scenario: Feedback gate and (a)/(b) choice still present under fast-track

- **WHEN** `sai-2-design {name} --fast-track` finishes writing `design.md`, `tasks.md`, and `interfaces.md`
- **THEN** the artifact feedback gate is still presented, and after the user proceeds, the (a)/(b) implementation-continuation question is still asked — neither is auto-answered by fast-track

### Requirement: sai-4-apply under fast-track pre-activates the session commit-authorization flag within its documented scope

When `sai-4-apply` runs with `--fast-track`, the session-scoped `session_commit_authorized` flag (`sai/instructions/apply.md` "Session-scoped commit authorization flag") SHALL be pre-activated for the duration of the run, so every STOP & COMMIT proceeds to `git add` + `git commit` without the per-step authorization ask. The pre-commit file visibility report and the proposed commit message SHALL still print unconditionally before each commit. The flag's existing scope boundary SHALL remain in force: the grant covers `git add` + `git commit` at the commit gate ONLY, and SHALL NOT authorize `push`, `--force`, branch create/switch, rebase, merge, tag, or `gh pr`, nor bypass the GREEN-conflict STOP.

#### Scenario: STOP & COMMIT auto-proceeds but still previews the commit

- **WHEN** `sai-4-apply {name} --fast-track` reaches a STOP & COMMIT marker after a Step's verification passes
- **THEN** the agent prints the pre-commit file visibility report and the proposed commit message, then runs `git add` + `git commit` without asking for authorization

#### Scenario: Fast-track does not extend to non-commit git operations

- **WHEN** `sai-4-apply {name} --fast-track` is running and a push, force-push, branch switch, rebase, merge, tag, or `gh pr` would be needed
- **THEN** that operation still requires its own explicit per-operation approval, unchanged by fast-track

#### Scenario: GREEN-conflict STOP still halts under fast-track

- **WHEN** a testable Step reports an unpassable GREEN (GREEN = fail, STOP reached = yes) during a `--fast-track` run
- **THEN** the coordinator still surfaces the conflict and halts, and SHALL NOT mark checkboxes, commit, or advance — pre-activation does not bypass this STOP

### Requirement: sai-4-apply under fast-track defers Human Verification checks to one combined end-of-run list

When `sai-4-apply` runs with `--fast-track`, the per-Step Human Verification gate SHALL NOT be presented mid-Step. Instead, each Step's Human section `- [ ]` checkboxes SHALL be accumulated in the coordinator's in-conversation memory and printed as a single combined list, in Step order, after the Final sweep and before the MANDATORY STOP. The gate key SHALL remain checkbox count, identical to the no-fast-track path: a Step whose Human section contains zero `- [ ]` checkboxes (for example an italic note only) contributes nothing to the combined list. Checkboxes are marked `[x]` after the Step's automated verification passes without waiting for the human gate; the human gate is presented once, as the combined list, at the end of the run. This differs from the no-flag path, where marking a Step's items requires the human confirmation first — under fast-track the marking moves ahead of human review, which is the documented trade-off below.

#### Scenario: Human checks are collected and shown once at the end

- **WHEN** `sai-4-apply {name} --fast-track` runs a plan whose Steps 2 and 5 each have Human Verification checkboxes
- **THEN** neither Step pauses mid-run for the human gate; after the Final sweep the agent prints one combined checklist containing Step 2's and Step 5's items in Step order, before the MANDATORY STOP

#### Scenario: Steps with no human checkbox contribute nothing

- **WHEN** a Step under `--fast-track` has a Human section with only an italic note and no `- [ ]` checkbox
- **THEN** that Step adds no entry to the combined end-of-run list, matching the no-flag gate-key behavior

#### Scenario: A failed end-of-run check is bounded to its Step

- **WHEN** the combined end-of-run list is presented and a check fails after all prior Steps have already committed
- **THEN** the run is bounded to the failing Step — the list is printed in Step order so a corrective re-run targets that Step only; this bounded-failure behavior is the documented trade-off of the fast-track deferral, not a defect

### Requirement: The fast-track flag opts out only of the gates named per command, never others

For each of the three commands, `--fast-track` SHALL opt out of exactly the named gates and nothing else — it is a fixed, audited list of opt-outs, not a generic "skip all gates" switch. Safe-operations confirmations SHALL remain in force under fast-track for all three commands. No gate outside the per-command list SHALL be auto-answered or skipped.

#### Scenario: Safe-operations confirmations survive fast-track

- **WHEN** any of the three commands runs with `--fast-track` and is about to perform a destructive or hard-to-reverse operation covered by the safe-operations skill
- **THEN** the safe-operations confirmation is still required, because it is not in any command's fast-track opt-out list

#### Scenario: The opt-out set is fixed per command

- **WHEN** fast-track is active for `sai-explore` (two language gates), `sai-2-design` (specs approval gate only), or `sai-4-apply` (commit authorization + Human Verification deferral only)
- **THEN** no gate beyond that command's named set changes behavior

### Requirement: Fast-track behavior is harness-agnostic and documented

The `--fast-track` behavior SHALL be identical under Claude Code, opencode, and GitHub Copilot, achieved by single-sourcing the parse and gate branches in the shared body files and shared instructions. Any wrapper-level change (`argument-hint`) SHALL be mirrored across `commands/claude/`, `commands/opencode/`, and `commands/copilot/` in the same commit (Mirror discipline). `AGENTS.md` SHALL gain one entry under "Critical conventions" describing the flag and its three affected commands, and `README.md` SHALL document the flag in the commands table.

#### Scenario: Same behavior across all three harnesses

- **WHEN** `--fast-track` is used under Claude Code, opencode, or GitHub Copilot
- **THEN** the flag is parsed and the gate opt-outs applied identically, because the logic lives in the shared body files and instructions all three harnesses fetch

#### Scenario: Docs describe the flag

- **WHEN** the change is implemented
- **THEN** `AGENTS.md` has a "Critical conventions" entry naming `--fast-track` and its three commands, and `README.md`'s commands table documents the flag; the AGENTS.md generated-artifact table is unchanged
