## Why

Some `sai-archive` runs are low-risk by construction (backfilled changes, already-applied implementations), yet the per-archive soft gates (unchecked-items confirmation, delta-spec sync confirmation) add friction without adding safety. Extending `--fast-track` to `sai-archive`, and appending a `(--fast-track)` hint to next-prompt completion messages that recommend a fast-track-capable command, lets a fast-track pass stay fast-track through the whole pipeline.

## What Changes

- `sai-archive` becomes the fourth command to accept the positional `--fast-track` token, parsed in its shared body file (`sai/commands/sai-archive.md`) exactly like `sai-2-design` / `sai-4-apply`, plus the post-picker cleanup for the opencode wrapper-echo case.
- Under `sai-archive --fast-track`, the unchecked-items soft gate (`sai/instructions/archive.md` Completion Check) auto-proceeds (picks `yes`) unconditionally.
- Under `sai-archive --fast-track`, the delta-spec sync gate auto-proceeds. On the changes-needed path it picks the **Sync now** branch when the change is low-risk-by-construction — the disjunction `implementation.md` exists AND has ≥1 `- [x]` **OR** the change is `backfilled: true`; when neither holds it fires interactively as today. On the already-synced path it auto-picks **Archive now** (a no-op) unconditionally.
- Every `## Completion` block whose next-prompt recommendation names a command in the fast-track set gains a literal ` (--fast-track)` appended after the recommended command reference. Concretely: `sai-1-spec` (→ `/sai-2-design`), the `implement-invocation` completion emitted after `sai-3-implement` (→ `/sai-4-apply`), and `sai-backfill` (→ `/sai-archive`). The hint is purely textual — behavior is unchanged unless the user types the flag.
- `AGENTS.md` and `README.md` update to name `--fast-track`'s fourth command. `argument-hint` mirroring lands across `commands/claude/`, `commands/opencode/`, and `commands/copilot/` in the same commit; the opencode `sai-archive` wrapper keeps its echo-line HTML-comment shape (no real `argument-hint`, per prior ADR).

## Capabilities

### New Capabilities
- `sai-fast-track-next-prompt-hint`: append the literal ` (--fast-track)` to a `## Completion` next-prompt recommendation if and only if the recommended command is in the fast-track set; textual only, no behavior change.

### Modified Capabilities
- `sai-fast-track-flag`: extend the flag to `sai-archive` as a fourth command with its own opt-out set — the unchecked-items gate (always) and the delta-spec sync gate (conditional on implementation-applied detection).

## Impact

- **Command body file**: `sai/commands/sai-archive.md` gains two distinct insertion points — the fast-track parse block (before the change-picker) and the post-picker cleanup that strips any residual `--fast-track` from the resolved change name (the opencode wrapper-echo case).
- **Instruction**: `sai/instructions/archive.md` gains `if FAST-TRACK` branches on the unchecked-items gate (Completion Check) and both sync-gate paths — changes-needed (Sync now, gated on applied-OR-backfilled) and already-synced (Archive now, no-op) — under Missing main spec handling / upstream skill step 4. The changes-needed branch reuses the `backfilled` value already resolved by the Classification Check.
- **Completion messages**: `sai/commands/sai-1-spec.md`, `sai/instructions/implement-invocation.md`, `sai/commands/sai-backfill.md` gain the ` (--fast-track)` hint.
- **Wrappers**: `commands/claude/sai-archive.*`, `commands/copilot/sai-archive.*` gain the `argument-hint`; `commands/opencode/sai-archive.*` keeps its echo-line shape.
- **Docs**: `AGENTS.md` Critical conventions entry and `README.md` commands table.
- No production/runtime code, no new session flag, env var, or `.openspec.yaml` key.

## Proposal Research Documentation

**Local files**:
- `openspec/specs/sai-fast-track-flag/spec.md` — existing capability (three-command opt-out contract) being modified
- `sai/instructions/archive.md` — Completion Check (unchecked-items gate) and Missing main spec handling (sync gate)
- `.claude/skills/openspec-archive-change/SKILL.md` — step 4 sync gate ("Sync now" / "Archive without syncing")
- `sai/commands/sai-archive.md` — body file gaining the parse
- `sai/commands/sai-2-design.md` — fast-track parse + post-picker cleanup pattern to mirror
- `sai/commands/sai-1-spec.md`, `sai/instructions/implement-invocation.md`, `sai/commands/sai-backfill.md` — completion next-prompt messages gaining the hint

**External URLs**: none

## Additional Notes

- **Low-risk-by-construction = a disjunction** governing the changes-needed sync auto-proceed: (a) implementation-applied — `implementation.md` exists AND contains ≥1 `- [x]` (single-file state check, robust to git noise, no git-log traversal; `- [x]` is the durable evidence apply ran, each Step commits before its mark); OR (b) backfilled — `.openspec.yaml` resolves `backfilled: true` per the Classification Check idiom. Both are the low-risk cases the Why names; either alone is sufficient.
- **Sync auto-proceed picks "Sync now", not "Archive without syncing"** — preserves the recommended path's intent (auto-approve, not skip). The already-synced path instead auto-picks "Archive now" (a genuine no-op, nothing to sync), so no low-risk condition is required there.
- **Two capabilities, not one** — the gate opt-out (modified `sai-fast-track-flag`) and the textual hint (new `sai-fast-track-next-prompt-hint`) are separate concerns; keeps each contract narrow.
- **Hint fires on the recommended command, not the emitting one** — so `sai-1-spec` and `sai-3-implement` completions carry the hint even though those commands do not themselves gain `--fast-track`. This is what keeps the pipeline fast-track end-to-end.
- **Gates that stay in force under `sai-archive --fast-track`**: the CORE-missing hard stop, the AUDIT informational line, all safe-operations confirmations, the pre-existence check, and the opencode change-name resolution.
- **Accepted trade-offs**: a user who manually flips `- [ ]` to `- [x]` without applying code slips past the sync-gate condition; sync drift is silent when the condition holds. Both are bounded by explicit fast-track opt-in, same risk profile as `sai-4-apply`'s documented deferrals.
