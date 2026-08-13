# sai-archive-commit-gate Specification

## Purpose

TBD — purpose to be documented.

## Requirements

### Requirement: sai-archive presents a three-option commit gate after the archive skill completes

After the upstream archive skill completes — the archive move, any delta-spec sync, and the archive summary — `/sai-archive` SHALL present a closed-choice action-selector gate through the harness-native option-picker with exactly three options, in this order:

1. Create a new commit — stages exactly `openspec/specs` and `openspec/changes/archive` and creates a new commit whose message is composed per `sai/commands/commit/instructions.md` steps 1–5 and `sai/policies/commit-rules.md`.
2. Amend the latest commit — stages exactly `openspec/specs` and `openspec/changes/archive` and runs `git commit --amend --no-edit`.
3. Do nothing — leaves the index untouched; no staging and no commit.

The new-commit option SHALL carry the `Recommended` marker, and no other option SHALL carry it. Options 1 and 2 SHALL run their commit action only when the shared empty-index guard passes (see the empty-index guard requirement).

#### Scenario: Gate fires after the archive skill completes

- **WHEN** `/sai-archive` completes the archive move and any delta-spec sync and prints the archive summary
- **THEN** the agent presents the three-option action-selector gate through the native option-picker, with the new-commit, amend, and do-nothing options in that order

#### Scenario: The new-commit option carries the Recommended marker

- **WHEN** the gate is presented
- **THEN** the new-commit option is labelled or marked as Recommended and no other option carries the marker

### Requirement: The gate asks first and stages only the archive and main-spec paths

The gate SHALL be presented before any staging. `git add` SHALL run only after the user selects an option, only for options 1 and 2, and SHALL stage exactly the two literal paths `openspec/specs` and `openspec/changes/archive`. The agent SHALL NOT use `git add -A` or any broader sweep and SHALL NOT stage any other path. The do-nothing option SHALL stage nothing and SHALL leave the index untouched. Options 1 and 2 SHALL run their commit action only when the shared empty-index guard passes: when the two-path staging leaves the index with no staged changes, the agent SHALL stage but SHALL NOT run the commit action.

#### Scenario: No staging before selection

- **WHEN** the gate is presented and no option has been selected yet
- **THEN** no `git add` has run and the index is exactly as it was when the gate was reached

#### Scenario: Amend stages exactly the two paths

- **WHEN** the user selects the amend option and the two-path staging leaves a non-empty staged diff
- **THEN** the agent stages only `openspec/specs` and `openspec/changes/archive` and runs `git commit --amend --no-edit`

#### Scenario: New commit stages exactly the two paths

- **WHEN** the user selects the new-commit option and the two-path staging leaves a non-empty staged diff
- **THEN** the agent stages only `openspec/specs` and `openspec/changes/archive` and creates a new commit with the composed message

#### Scenario: Do nothing leaves the index untouched

- **WHEN** the user selects the do-nothing option
- **THEN** the agent runs no `git add` and no `git commit`, and the index is exactly as it was when the gate was reached

### Requirement: The gate is skipped when git status shows no changes

When the archive skill completes and `git status` shows no changes, `/sai-archive` SHALL skip the gate entirely — no prompt, no staging, and no commit.

#### Scenario: No working-tree changes skips the gate

- **WHEN** the archive skill completes and `git status` reports no changes
- **THEN** the agent does not present the gate and runs no `git add` and no `git commit`

### Requirement: The new-commit message reuses commit.md steps 1–5 and commit-rules.md without duplicating commit rules

For the new-commit option, the agent SHALL compose the commit message by applying `sai/commands/commit/instructions.md` steps 1–5 — inspect staged state, classify the change, determine scope, compose the message, and verify faithfulness — with `sai/policies/commit-rules.md` as the single source of commit-message rules (type classification, subject format, body and footer conventions, repo-style detection rubric, and hard rules). The archive instruction SHALL reference these two files and SHALL NOT restate or duplicate their rule content. The picker selection of the new-commit option SHALL be the per-invocation commit authorization: after selection, the agent SHALL stage the two paths, compose the message from the staged diff, and commit without presenting any further authorization prompt. Steps 1–5 and the commit SHALL run only when the shared empty-index guard passes: when the two-path staging leaves the index with no staged changes, the agent SHALL NOT apply steps 1–5 and SHALL NOT commit, per the empty-index guard requirement.

#### Scenario: Message is composed from the staged diff per commit.md steps 1–5

- **WHEN** the user selects the new-commit option and the two-path staging leaves a non-empty staged diff
- **THEN** the agent runs commit.md step 1's staged-state inspection, then classifies the change, determines the scope, composes the message, and verifies faithfulness per steps 2–5, and commits with the composed message

#### Scenario: Commit rules are referenced, not duplicated

- **WHEN** the archive instruction describes the new-commit message composition
- **THEN** it names `sai/commands/commit/instructions.md` steps 1–5 and `sai/policies/commit-rules.md` as the rule sources and contains no restated classification, subject-format, body, or footer rules

#### Scenario: The picker selection is the per-invocation authorization

- **WHEN** the user selects the new-commit option and the two-path staging leaves a non-empty staged diff
- **THEN** the agent stages and commits without asking a second authorization question, because the picker selection already authorized the commit

### Requirement: The amend path applies the pushed-HEAD guard per commit-rules

For the amend option, the agent SHALL run the pushed-HEAD check BEFORE any staging: it SHALL determine whether HEAD is already pushed, per the `--amend` detection idiom in `sai/commands/commit/instructions.md` (`git log @{push}..HEAD --oneline` — empty output with HEAD matching the push target means pushed). When HEAD has no configured upstream, so `@{push}` does not resolve, the agent SHALL treat HEAD as unpushed and proceed without a secondary confirmation. When HEAD is already pushed, the agent SHALL warn explicitly and SHALL NOT amend without a secondary confirmation, per the commit-rules hard rule that a pushed commit is never amended without explicit warning plus secondary confirmation. On decline of the secondary confirmation, the agent SHALL NOT amend, SHALL NOT create any commit, and SHALL leave the index exactly as it was when the gate was reached — because the check runs before staging, no `git add` has occurred. The amend command SHALL run only when the shared empty-index guard passes: after staging the two paths, the agent SHALL NOT run `git commit --amend` when the index contains no staged changes, per the empty-index guard requirement.

#### Scenario: Unpushed HEAD amends without extra confirmation

- **WHEN** the user selects the amend option, HEAD is not already pushed, and the two-path staging leaves a non-empty staged diff
- **THEN** the agent stages the two paths and runs `git commit --amend --no-edit` without additional confirmation

#### Scenario: No configured upstream treats HEAD as unpushed

- **WHEN** the user selects the amend option, HEAD has no configured upstream so `@{push}` does not resolve, and the two-path staging leaves a non-empty staged diff
- **THEN** the agent treats HEAD as unpushed and proceeds to stage the two paths and run `git commit --amend --no-edit` without a secondary confirmation

#### Scenario: Pushed HEAD warns and requires secondary confirmation

- **WHEN** the user selects the amend option and HEAD is already pushed
- **THEN** the agent prints an explicit warning and asks a secondary confirmation before amending, and the amend runs only on explicit confirmation

#### Scenario: Declined secondary confirmation aborts the amend with the index untouched

- **WHEN** the pushed-HEAD guard fires and the user declines the secondary confirmation
- **THEN** the agent does not amend, does not create any commit, and leaves the index exactly as it was when the gate was reached, because the guard check ran before any `git add`

### Requirement: Fast-track auto-selects the new-commit option

When `--fast-track` is active for `/sai-archive`, the agent SHALL NOT present the three-option gate; it SHALL auto-select the new-commit option. Because a new commit is never destructive, the pushed-HEAD guard SHALL NOT apply to the fast-track path: there is no pushed-HEAD check, no do-nothing fallback, and no pushed-HEAD explanatory line. The shared empty-index guard SHALL still apply: when staging exactly `openspec/specs` and `openspec/changes/archive` leaves the index with no staged changes, the agent SHALL NOT create a commit and SHALL print the guard's single explanatory line. The empty-index guard SHALL run before `sai/commands/commit/instructions.md` steps 1–5 are applied, so the step-1 "No staged changes" and "Only unstaged changes" stop conditions are never reached. The step-1 secret-file heuristic (for example the `*credentials*` pattern, which a capability named `credentials-rotation` would match) SHALL NOT apply on the fast-track path and SHALL NOT present its confirmation STOP, because the gate fixes the staging scope to exactly the two paths under `openspec/`, so a matching staged path is a capability or archived-change spec, never a secret. When `git status` shows no changes, the gate and its fast-track auto-selection SHALL be skipped, per the skip rule. No other gate SHALL be affected.

#### Scenario: Fast-track auto-commits via a new commit

- **WHEN** `/sai-archive {name} --fast-track` completes the archive skill and staging the two paths leaves a non-empty staged diff
- **THEN** the agent presents no gate prompt, stages exactly `openspec/specs` and `openspec/changes/archive`, composes the message per `sai/commands/commit/instructions.md` steps 1–5, and creates a new commit

#### Scenario: Fast-track commits nothing when staging leaves the index empty

- **WHEN** `/sai-archive {name} --fast-track` completes the archive skill and staging the two paths leaves the index with no staged changes
- **THEN** the agent does not create a commit, prints the guard's explanatory line, and runs no further git mutation

### Requirement: The gate applies a shared empty-index guard after staging

After `git add` of the two literal paths for the amend option, the new-commit option, or the fast-track auto-selection, and BEFORE executing `git commit --amend` or creating the new commit, the agent SHALL check whether the index contains staged changes. When the staged diff is empty (the two-path staging staged nothing), the agent SHALL NOT amend and SHALL NOT create a commit, SHALL print exactly the single line `[sai-archive] no commit: staging left the index empty`, and SHALL leave the index exactly as it was after staging. The guard is shared between the two commit options and between the interactive and fast-track paths: it prevents the amend option from rewriting HEAD with an identical tree (a pointless SHA) and prevents the new-commit option from committing nothing. The guard does not alter the amend path's ordering: the pushed-HEAD guard SHALL still run BEFORE any staging, exactly as the amend requirement specifies, so the sequence remains pushed-HEAD check, then `git add`, then the empty-index check.

#### Scenario: Empty index after staging skips both commit options

- **WHEN** the user selects the amend or new-commit option and staging the two literal paths leaves the index with no staged changes
- **THEN** the agent neither amends nor creates a commit and prints exactly the line `[sai-archive] no commit: staging left the index empty`

#### Scenario: The guard runs before the commit action

- **WHEN** the amend option, the new-commit option, or the fast-track auto-selection has staged the two literal paths
- **THEN** the empty-index check runs before `git commit --amend` or the new commit executes, and for the amend option the pushed-HEAD guard has already run before any staging

### Requirement: The archive commit gate does not adopt the commit-auth-gate option set

The archive commit gate SHALL NOT use the `yes` / `no` / `Allow on this session` option set of the `commit-auth-gate` capability, SHALL NOT set or read the session-scoped commit-authorization flag, and SHALL NOT offer any session grant. The gate's options SHALL be exactly the amend / new commit / do nothing selector defined by this capability, and the `commit-auth-gate` requirements SHALL NOT govern this gate.

#### Scenario: The gate presents its own three options, not the commit-auth-gate set

- **WHEN** the archive commit gate is presented
- **THEN** its options are amend, new commit, and do nothing, and no `yes` / `no` / `Allow on this session` option is offered

#### Scenario: The session commit-authorization flag is neither set nor read

- **WHEN** any option of the archive commit gate is selected
- **THEN** the session-scoped commit-authorization flag of the `commit-auth-gate` capability is neither set nor read
