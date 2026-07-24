## Why

With 2+ active changes, comparing their workflow states today means invoking `/sai-status` once per change and mentally diffing the panels. A single bulk view that lays every active change against every sai-workflow artifact removes that repetition and shows all states at a glance.

## What Changes

- Introduce a dedicated `status-picker.md` instruction, fetched only by `sai-status`, that mirrors the shared `change-picker.md` on its 0-change and 1-change branches but adds a **"See all"** first option on the 2+-changes branch.
- When "See all" is selected, render a compact table: one row per active change, one column per sai-workflow artifact, plus an implementation-progress column and a `Next:` hint column. Selecting a specific change instead falls through to the existing single-change panel.
- Decouple `sai-status` from `change-picker.md`: `sai-status` fetches `status-picker.md` instead. The shared `change-picker.md` consumer list drops back to the 9 change-consuming commands; its resolution logic is untouched, so those 9 stay behaviorally identical.
- Preserve the read-only invariant: "See all" performs N `openspec status --change` calls (one per active change — no bulk CLI exists) plus local file reads; it writes nothing under any `openspec/` path.

## Capabilities

### New Capabilities
- `status-picker`: sai-status-specific picker that reuses the change-picker 0/1/N resolution but prepends a "See all" option on the 2+ branch.
- `bulk-status-table`: the compact all-changes table rendered when "See all" is selected, reusing sai-status panel cell semantics per change.

### Modified Capabilities
- `sai-status-change-picker`: its two requirements (sai-status inherits change-picker; sai-status is change-picker's 10th consumer) are REMOVED — superseded by `status-picker`.
- `change-picker`: ADD a consumer-scope requirement locking that `sai-status` is not a change-picker consumer, so the shared picker serves exactly the 9 change-consuming commands.

## Impact

- **Instructions**: new `sai/instructions/status-picker.md`; `sai/commands/sai-status.md` fetches it instead of `change-picker.md`; `sai/instructions/change-picker.md` consumer-list prose drops `sai-status` (10 → 9).
- **Behavior**: `sai-status` gains a bulk view on the 2+ branch; single-change panel and read-only invariant unchanged. The 9 other `sai-*` change consumers are unaffected.
- **Harnesses**: identical behavior across opencode, Claude Code, and GitHub Copilot — no harness-specific branches; the "See all" prompt uses each harness's native option-picker exactly as the existing picker does.
- **Cost**: bulk view issues N `openspec status` calls (fine at the current ~4 active changes; a future `openspec bulk-status` command would replace the N calls).

## Proposal Research Documentation

**Local files**:
- `sai/commands/sai-status.md` — read-only panel algorithm (Steps A–E), the 10-artifact canonical order, and the Next-hint resolution reused per row.
- `sai/instructions/change-picker.md` — the 0/1/N resolution and consumer list that `status-picker.md` forks from.
- `openspec/specs/sai-status-change-picker/spec.md` — existing capability asserting sai-status uses change-picker (superseded here).
- `openspec/specs/change-picker/spec.md` — base change-picker requirements (Wrapper-Echo Resolution, Invocation Trigger); no consumer-count requirement exists there today.

**External URLs**: none.

## Additional Notes

- The 10 sai-workflow artifacts, in canonical column order, are: `proposal`, `specs`, `design`, `tasks`, `interfaces`, `implementation`, `review`, `security`, `performance`, `accessibility`. `pr` is not one of the 10 and never gets a column.
- Cell semantics reuse the single-change panel exactly: `done` → present, `ready`/`blocked` → absent; a `## Not Applicable` audit body → `N/A`; absent `interfaces` is never flagged (ADR 0023); implementation shows `checked/total` from `- [x]` vs `- [ ]` counts.
- `openspec list --json` returns only live changes, so archived changes never appear as rows; per-row archive detection is unnecessary in the bulk view.
- Duplication between `change-picker.md` and `status-picker.md` (~80% identical) is accepted and intentional — it keeps the shared picker's hot path and the other 9 consumers untouched.

### Design hints for sai-2 (from spec review — non-normative)

These are deferred design/archive decisions, not spec requirements. The spec-only phase intentionally leaves them open for `/sai-2-design`:

- **Row bound / ordering for large N.** The specs lock one row per active change in `openspec list --json` order (currently alphabetical) with no cap. Fine at ~4 changes; at 15+ the table grows and the N `openspec status` calls add up. Design should decide whether to cap rows (e.g. 20 + "…and N more" footnote) and/or impose an explicit sort (e.g. `lastModified` desc) rather than relying on CLI order.
- **Consumer-list edit is load-bearing.** `sai/instructions/change-picker.md` prose must actually drop `sai-status` (10 → 9) to satisfy the `change-picker` consumer-scope scenario ("the consumer list … is read"). tasks.md should include a step that keeps the prose and that scenario in agreement.
- **sai-status-change-picker end state.** After this change, `openspec/specs/sai-status-change-picker/spec.md` carries only REMOVED requirements. The delta validates (`openspec validate` passes); design/archive should confirm the intended terminal state — an empty base capability vs. retiring the capability outright at `/sai-archive`.
- **Unbounded re-prompt carryover.** The 2+ branch inherits change-picker's unbounded invalid-input re-prompt. Harmless for the "See all" + change-name option set, but design should confirm it carries over verbatim rather than being redefined.
