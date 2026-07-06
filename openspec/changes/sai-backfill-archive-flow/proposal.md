## Why

The recent change-picker rollout (archived 2026-07-03) wired the picker into ten consuming `sai-*` commands, but `sai-backfill` is a false positive: it creates changes from a diff (like `sai-1-spec`, which was correctly excluded), so the picker actively misleads backfill users. Symmetrically, `sai-archive`'s Classification Check blocks on `design.md`/`tasks.md`/`implementation.md`, all three of which `sai/instructions/backfill.md:5` contractually forbids backfill from producing — leaving every backfilled change un-archiveable. The two ends need to be reconnected for the backfill flow to round-trip end to end.

## What Changes

- Remove the `Fetch @sai/instructions/change-picker.md` line from `sai/commands/sai-backfill.md`. Empty-`$ARGUMENTS` invocations now fall through to `sai/instructions/backfill.md`: STOP Conditions (line 7-10) handles the empty case; Phase 4 (line 81-88) handles the kebab-case-in-`$ARGUMENTS` and diff-derived-proposal cases.
- Add a `backfilled: true` field to `.openspec.yaml` written by `sai/instructions/backfill.md` Phase 5a, alongside the existing `schema` and `created` keys.
- Extend `sai/instructions/archive.md` Classification Check to read `.openspec.yaml`; when `backfilled: true`, treat `design`, `tasks`, and `implementation` as satisfied (they are intentionally absent by construction). All other CORE/AUDIT behavior is unchanged.
- Replace the closing `To archive the change, run …` line of `sai/commands/sai-backfill.md` with a `## Ready to Archive` block. The block is structurally inspired by `## Ready to Propose` from `sai/instructions/explore.md:42-53` but is a minimal handoff (name + next command), not a full proposal recap.

## Capabilities

### New Capabilities

- `sai-backfill-input-handling`: `sai/commands/sai-backfill.md` no longer fetches the change-picker; empty-`$ARGUMENTS` resolution delegates to `sai/instructions/backfill.md`'s STOP Conditions section.
- `sai-backfill-metadata-flag`: A `backfilled: true` field is written into `openspec/changes/{name}/.openspec.yaml` by `sai/instructions/backfill.md` Phase 5a, marking the change as reconstructed post-implementation.
- `sai-archive-backfill-awareness`: `sai/instructions/archive.md` Classification Check reads `backfilled` from `.openspec.yaml` and exempts `design`, `tasks`, and `implementation` for backfilled changes only; all other CORE/AUDIT rules are unchanged.
- `sai-backfill-completion-handoff`: `sai/commands/sai-backfill.md` (or `sai/instructions/backfill.md` Completion section) ends with a `## Ready to Archive` block that names the change and prints the next command, replacing the current passive "To archive … run" line.

### Modified Capabilities

- `change-picker`: The change-picker contract documents its list of consumers. Removing `sai-backfill` from that list is a spec-level change to the existing main spec at `openspec/specs/change-picker/spec.md:62` and to the header list at `sai/instructions/change-picker.md:3`.

## Impact

- **New files**:
  - `openspec/changes/sai-backfill-archive-flow/specs/change-picker/spec.md` — delta spec with `## MODIFIED Requirements` rewriting the consumer list at `openspec/specs/change-picker/spec.md:62` from ten to nine.
- **Modified files**:
  - `sai/commands/sai-backfill.md` — drop the change-picker fetch; replace the closing line with a `## Ready to Archive` block.
  - `sai/instructions/backfill.md` — Phase 5a writes the new `backfilled: true` field; Completion section emits the `## Ready to Archive` block.
  - `sai/instructions/archive.md` — Classification Check adds a `backfilled` lookup against `.openspec.yaml`; new exemption only when `backfilled: true`.
  - `sai/instructions/change-picker.md` — line 3 header list drops `sai-backfill` to match the new consumer set.
  - `AGENTS.md` — "Change picker" section (line 188) rewords "Ten commands" to "Nine commands" and drops `sai-backfill` from the consumer list.
- **No public API change** to OpenSpec or the `sai-workflow` schema; `.openspec.yaml` gains a new optional field. The `sai-workflow` schema does not enumerate `.openspec.yaml` keys, so no schema edit is required.
- **User-visible behavior change**: invoking `/sai-backfill` with no arguments no longer invokes the change-picker. The existing "Change name required. Run: /sai-backfill <name>" message remains the entry point for unknown names.
- **No change** to the other nine change-picker consumers, the picker's behavior, or any of the non-picker `sai-*` commands (`sai-1-spec`, `sai-commit`, `sai-explore`).

## Proposal Research Documentation

**Local files**:
- `sai/instructions/backfill.md` — full body; Phase 5a and the Completion line are the specific edit sites.
- `sai/instructions/backfill.md:5` — contractual prohibition on producing `design.md`/`tasks.md`/`implementation.md`.
- `sai/instructions/backfill.md:7-10` — STOP Conditions section, the actual handler for empty-`$ARGUMENTS` (NOT Phase 4).
- `sai/instructions/archive.md:6-11` — Classification Check, the site of the `backfilled` exemption.
- `sai/instructions/change-picker.md:3` — list of the ten consuming commands; `sai-backfill` is the only creator among them and is the entry to detach.
- `sai/instructions/change-picker.md` (full file) — once `sai-backfill` is removed, the header list becomes nine; the picker's resolution rules are unchanged.
- `sai/instructions/explore.md:42-53` — `## Ready to Propose` block format, used as a structural reference only (the new `## Ready to Archive` block is a minimal handoff, not a full proposal recap).
- `sai/commands/sai-backfill.md` — wrapper body; the Fetch line and the closing sentence are the edit sites.
- `openspec/specs/change-picker/spec.md:60-62` — main spec scenario "Picker updated once, applies everywhere" lists ten consumers; the line 62 list is the edit site for the new delta.
- `openspec/schemas/sai-workflow/schema.yaml` — confirms `.openspec.yaml` keys are not enumerated by the schema.
- `openspec/specs/spec-quality/spec.md` — completion-summary contract for `sai-1-spec` (referenced to confirm Isolation Mode discipline still applies to the new handoff block).
- `AGENTS.md:188` — "Change picker" section enumerates the ten consumers; this is the edit site for the new count and list.

**External URLs**: None.

## Additional Notes

- The `> ⚠ POST-HOC RECORD` warning at the top of every backfilled `proposal.md` (written by `sai/instructions/backfill.md:108`) stays. It is the human-readable signal that the change was reconstructed; `backfilled: true` is the machine-readable counterpart. Both coexist.
- `backfilled` is a binary flag for now — no `backfilled_at` or `base_sha`. Richer metadata is a future change and explicitly out of scope.
- The change-picker detaches from `sai-backfill` only. The other nine consumers (`sai-2-design`, `sai-3-implement`, `sai-4-apply`, `sai-5-review`, `sai-6-security`, `sai-7-performance`, `sai-8-accessibility`, `sai-archive`, `sai-pr`) remain picker-driven. The picker's resolution rules themselves are unchanged — only the consumer list shrinks.
- The six non-exempt artifacts — the two CORE artifacts backfill produces (`proposal`, `specs`) plus the four AUDIT artifacts (`review`, `security`, `performance`, `accessibility`) — are what backfill and archive must still satisfy. Of the five CORE artifacts, the three backfill is contractually forbidden to produce (`design`, `tasks`, `implementation`) are exempted; the remaining two (`proposal`, `specs`) remain required.
- The `## Ready to Archive` block is a minimal handoff (name + next command) — NOT a full recap of the proposal's What/Why/Capabilities. The `## Ready to Propose` block from explore is the *input* to `/sai-1-spec` and therefore needs that context, but the `## Ready to Archive` block is the *handoff* to `/sai-archive`, which only needs the name. The proposal.md the agent just wrote already contains the full context for the user to see.
- The `## Ready to Archive` block is paste-ready handoff text for a fresh chat, not an in-context auto-execution of `/sai-archive`. Isolation Mode discipline is preserved: the next-phase command starts with no inherited context.
- The `archive` capability slot in `openspec/specs/` is not modified; this change only touches `sai/instructions/archive.md` behavior, not the spec contract for archives.
- The `change-picker` main spec at `openspec/specs/change-picker/spec.md` lists ten consumers in its "Picker updated once, applies everywhere" scenario (line 62). After this change the list is nine. The change is captured in the `## MODIFIED Requirements` delta at `openspec/changes/sai-backfill-archive-flow/specs/change-picker/spec.md`; the main spec is updated when the change is archived.
