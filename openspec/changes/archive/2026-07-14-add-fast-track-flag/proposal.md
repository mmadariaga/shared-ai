## Why

Some `/sai-*` invocations are batched, time-boxed, or low-stakes enough that the per-step language, approval, and commit gates add more friction than safety. A per-invocation opt-in lets the user trade a fixed, audited set of gates for one end-of-run checkpoint while preserving every gate not explicitly named.

## What Changes

- Add a `--fast-track` argument to exactly three commands — `sai-explore`, `sai-2-design`, `sai-4-apply` — parsed from `$ARGUMENTS` in the shared body files (`sai/commands/sai-explore.md`, `sai/commands/sai-2-design.md`, `sai/commands/sai-4-apply.md`); the token is stripped and the cleaned change-name/request flows to the picker/run unchanged.
- Emit a single-line `> FAST-TRACK MODE ACTIVE` banner at run start when the flag is present (in-conversation text only; Isolation-Mode-compatible).
- `sai-explore` under `--fast-track`: both language gates (artifact-review gate, `explore.md` item 3; crystallization gate, `explore.md` item 8) take their English path unconditionally, skipping the language question.
- `sai-2-design` under `--fast-track`: the specs approval gate auto-approves and writes `approval.specs.approved_at` + `approval.specs.notes` to `.openspec.yaml` without asking.
- `sai-4-apply` under `--fast-track`: the session-scoped `session_commit_authorized` flag is pre-activated for the run (auto-accepts every STOP & COMMIT), and every Step's Human Verification `- [ ]` checkboxes are deferred into one combined list, presented in step order after the Final sweep and before the MANDATORY STOP.
- Add an AGENTS.md entry under "Critical conventions" and a README.md commands-table note documenting the flag and its three commands.
- Each of the three shared instructions (`explore.md`, `design.md`, `apply.md`) gains exactly one `if FAST-TRACK` branch per affected gate — no other edits to those files.

## Capabilities

### New Capabilities
- `sai-fast-track-flag`: a per-invocation flag on `sai-explore`, `sai-2-design`, and `sai-4-apply` that opts out of a fixed, audited list of gates per command while leaving every other gate intact.

### Modified Capabilities
<!-- None. Existing gate capabilities are referenced, not respecified: the flag's opt-out behavior is owned entirely by the new capability, and each gate instruction gains a conditional branch rather than a changed default. -->

## Impact

- **Shared body files** (parsing + banner): `sai/commands/sai-explore.md`, `sai/commands/sai-2-design.md`, `sai/commands/sai-4-apply.md` — fetched identically by all three harness wrappers, so parsing is single-sourced.
- **Shared instructions** (gate branches): `sai/instructions/explore.md` (items 3, 8), `sai/instructions/design.md` (approval gate), `sai/instructions/apply.md` (STOP & COMMIT session flag ~215-222; Human Verification gate).
- **Thin wrappers**: `commands/{claude,opencode,copilot}/sai-explore*.md`, `sai-2-design*.md`, `sai-4-apply*.md` — `argument-hint` gains the optional flag; mirror discipline applies (all three harnesses in the same commit).
- **Docs**: `AGENTS.md` (Critical conventions), `README.md` (commands table).
- **No new state axis**: no env var, no session-chat flag, no `.openspec.yaml` key beyond the existing `approval.specs.*` that `sai-2-design` already writes.

## Proposal Research Documentation

**Local files**: `sai/commands/sai-explore.md`, `sai/commands/sai-2-design.md`, `sai/commands/sai-4-apply.md`, `sai/instructions/explore.md`, `sai/instructions/design.md`, `sai/instructions/apply.md`, `sai/instructions/artifact-feedback-gate.md`, `sai/instructions/change-picker.md`, `sai/instructions/remember.md`, `AGENTS.md`, `README.md`, `commands/claude/sai-explore.md`, `commands/opencode/sai-explore.md`, `commands/copilot/sai-explore.prompt.md`

**External URLs**: None

## Additional Notes

- Parsing lives in the **shared body files** (`sai/commands/`), which all three harness wrappers fetch, so the flag semantics are single-sourced; the per-harness thin wrappers only need their `argument-hint` updated. This satisfies harness universality without three copies of the parse logic.
- `session_commit_authorized` already exists in `apply.md` (§ "Session-scoped commit authorization flag", ~line 217); `--fast-track` pre-activates it rather than introducing new machinery. Its scope boundary is unchanged: `push`, `--force`, branch create/switch, rebase, merge, tag, and `gh pr` still require per-operation approval, and the GREEN-conflict STOP still halts.
- The Human Verification deferral keeps the gate key identical to the no-flag path — checkbox count, not the presence of a `**Human (...)**` header. A Step whose Human section holds only an italic note contributes nothing to the combined list.
- Explicitly OUT of scope (named gates that stay unchanged): the artifact feedback gate, the post-design (a)/(b) implementation-continuation choice, and all safe-operations confirmations. The flag is a fixed list of opt-outs, not a generic "skip all gates" switch.
- Explicitly OUT of scope (commands): `sai-1-spec`, `sai-3-implement`, `sai-5-review`, `sai-6-security`, `sai-7-performance`, `sai-8-accessibility`, `sai-archive`, `sai-pr`, `sai-commit`, `sai-backfill`.
- **For design.md — opencode wrapper asymmetry:** the Claude Code and Copilot `sai-2-design` wrappers carry `argument-hint: "[change-name]"`, but the opencode wrapper has no `argument-hint` and instead uses a `**Change-name argument:** $ARGUMENTS` echo line. Spec Req 9 requires wrapper `argument-hint` changes to be mirrored; design.md SHALL decide explicitly whether opencode (a) gains an `argument-hint` to match the other two, or (b) keeps its echo-line shape and only documents the optional `--fast-track` there — so the three wrappers stay consistent under Mirror discipline.
- **For design.md Risks — commit pre-activation ordering:** because `sai-4-apply --fast-track` pre-activates `session_commit_authorized` and defers Human Verification to the end, if an end-of-run human check surfaces a problem the run has already committed every prior Step. The bounded-failure semantics are normative in the spec (capability `sai-fast-track-flag`, Human-Verification-deferral requirement), but design.md SHALL restate this as a first-class Risk so the design-review stage treats it as such rather than a spec footnote.
