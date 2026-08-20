**Complexity**: high

## Why

`sai-3-implement` and `sai-4-apply` are already a named chain — implement's completion tells the user to run `/sai-4-apply {name}` in a new chat — but the handoff is manual. A single `sai-build` command removes that hop so an approved design becomes applied code in one invocation, enabling the intended short pipeline of `sai-explore` → `sai-build` → `/sai-5-review` (or a future review grouping) while keeping each phase's worker isolation intact.

## What Changes

- Add un-numbered command `/sai-build` with routed name `build` and card at `sai/commands/build/`
- Add a routed two-phase coordinator that runs the implement phase adapter then the apply phase adapter in one supervising invocation, with no intermediate approval gate
- Resolve the change name once (change-picker / envelope) and inject it into both phases; never use conversation-held state as the dispatch source
- Suppress implement's standalone completion literal on the non-final segment; transition to apply instead
- Inject `--fast-track` into the apply composition envelope unconditionally (commit pre-auth, branch auto-stay, deferred combined Human Verification); print the FAST-TRACK banner once per run
- On phase-1 `failed` or `cancelled`, do not dispatch apply; leave the change re-enterable through implement re-entry (Step 1b collapse / COMPLETO · FALLO MENOR · INCOMPLETO)
- Final terminal navigation is apply's final completion (points at `/sai-5-review {name}` in a new chat)
- Register `build` on both harness boot adapters; add mirrored thin wrappers, launcher card, `sai-commands` skill entry, and naming/registry/wrapper inventory updates
- Reuse existing implement and RED/GREEN workers — no new managed worker or binding
- Do not extend the Review Engine artifact vocabulary; do not retrofit `sai-explore`; do not group `sai-5`–`sai-8`

## Capabilities

### New Capabilities
- `sai-build-command`: Routed two-phase coordinator for implement→apply composition — phase order, single change resolution, non-final implement transition, unconditional apply fast-track injection, failure/re-entry rules, final terminal navigation, and happy-path absence of user gates
- `sai-build-registration`: Cross-harness registration of `/sai-build` — boot routed-name lists, thin wrappers, launcher card, command registry skill entry, and inventory counts that admit the new command

### Modified Capabilities
- `sai-command-naming`: Admit `sai-build` as an un-numbered auxiliary command alongside explore/archive/commit/pr/backfill/status/worktree
- `sai-command-registry`: Add `/sai-build` → `@commands/sai-build.md` with a one-line description in the universal skill table
- `thin-wrappers`: Raise the per-harness `sai-*.md` wrapper inventory from 15 to 16 and include `sai-build.md`
- `command-launcher-card`: Raise the in-scope launcher set from 15 to 16 and require `sai/commands/build/launcher.md` (not near-empty — loads the implement-worker binding)
- `implementation-coordinator`: Parameterize implement `terminal_navigation` so a non-final composition segment resolves to the authorized successor transition and does not print the standalone `/sai-4-apply` completion literal; standalone `/sai-3-implement` keeps today's completion message
- `sai-fast-track-flag`: Admit composition-injected fast-track for chained apply under `/sai-build` — supervising coordinator owns the single-line banner at apply-segment activation; standalone body-file-at-run-start rule unchanged for the four parse members; `/sai-build` is not a fifth parse member

## Impact

- **New paths**: `sai/commands/build/coordinator.md`, `sai/commands/build/launcher.md`, `commands/claude/sai-build.md`, `commands/opencode/sai-build.md`
- **Boot**: `sai/adapters/claude/boot.md` and `sai/adapters/opencode/boot.md` add routed name `build`
- **Implement adapter**: `sai/commands/implement/coordinator.md` (and any co-located implement adapter surface) gains positional `terminal_navigation` matching the apply pattern
- **Skill / docs / tests**: `skills/universal/sai-commands/SKILL.md`; README/AGENTS inventory lines; fixed-count tests (`thin-wrappers`, launcher card, doctor inventory/fetch-resolution) updated for 16 commands
- **Workers**: none new — reuses `sai-3-implementation-worker`, `sai-4-red-worker`, `sai-4-green-worker`
- **Install manifest**: recursive `sai/commands` and wrapper projections already cover new files; no dedicated manifest rule required unless inventory tests hard-code the old count
- **Orchestration core**: chained-phase composition already exists (post chainable-apply extraction); this change is a consumer, not a second composition primitive
- **Apply**: chained activation and fast-track shell/phase split already exist; build supplies the composition-built envelope (resolved name + fast-track true) and does not reopen apply extraction
- **No breaking change** to standalone `/sai-3-implement` or `/sai-4-apply` inputs, gates, or completion messages when invoked directly

## Proposal Research Documentation

**Local files**:
- `sai/commands/spec/worker.md`, `sai/commands/spec/invocation.md`, `sai/commands/spec/instructions.md`
- `sai/commands/implement/coordinator.md`, `sai/commands/implement/worker.md`
- `sai/commands/apply/coordinator.md`, `sai/commands/apply/invocation.md`, `sai/commands/apply/runner.md`
- `sai/adapters/claude/boot.md`, `sai/adapters/opencode/boot.md`
- `sai/orchestration/command-runner.md`, `sai/orchestration/worker-core.md`
- `sai/policies/change-picker.md`, `sai/policies/prereqs.md`, `sai/policies/glossary-format.md`
- `sai/commands/explore/instructions.md` (spec→design chain and `--fast-track` injection precedent)
- `commands/claude/sai-3-implement.md`, `commands/claude/sai-4-apply.md`
- `openspec/specs/orchestration-core/spec.md`
- `openspec/specs/apply-phase-adapter-extraction/spec.md`
- `openspec/specs/sai-command-naming/spec.md`
- `openspec/specs/sai-command-registry/spec.md`
- `openspec/specs/thin-wrappers/spec.md`
- `openspec/specs/command-launcher-card/spec.md`
- `openspec/specs/implement-rerun-guard/spec.md`, `openspec/specs/implement-rerun-state-classification/spec.md`
- `openspec/specs/sai-fast-track-flag/spec.md`
- `openspec/specs/pipeline-design-phase-chaining/spec.md`
- `GLOSSARY.md` (Chained Phase Composition, Phase Adapter, Command Launcher, Standalone Invocation Shell)
- `openspec/changes/archive/2026-08-19-chainable-apply-phase-adapter/` (slice-0 precedent)
- Apply-referencing tests under `test/` (coordinator verification, routed architecture, step projection, install/doctor inventories)

**External URLs**:
- None

## Additional Notes

- **Dispatch model**: ordinary routed composition coordinator, not the explore supervision pattern. Explore's chain exists to serve a conversation-held crystallized block; build's input is a change name on disk via `change-picker`.
- **Fast-track**: explicit `--fast-track` on `/sai-build` is a no-op for behavior (implement ignores it; apply always receives injected true). Banner `> FAST-TRACK MODE ACTIVE` prints once per run.
- **Detached HEAD (E4)**: under fast-track, apply still refuses branch auto-stay and presents the three-option branch prompt — the only happy-path interactive stop besides safe-operations confirmations.
- **Human Verification (E5)**: under fast-track, HV is a post-commit combined report after Final sweep, not an approval gate.
- **Re-entry (E2/E3)**: interrupted or partial apply leaves checkbox state on disk; re-running `sai-build` re-enters through implement Step 1b (collapse COMPLETO, warn+continue FALLO MENOR, halt INCOMPLETO) rather than resuming the apply loop directly.
- **Plan quality**: left to implement's validation step; no mid-run review round over `implementation.md` and no Review Engine designator extension.
- **Non-goals**: grouping `sai-5`–`sai-8` into a review fan-out command; retrofitting explore onto the chained-phase primitive; declaring a Step count ceiling.
- **Overview language**: user requested Español for later `change-overview.md` generation (design phase); proposal and specs remain English per artifact language policy.
- **Model frontmatter** for the new wrappers is intentionally left to design (implement uses higher-capability planning; apply uses cheaper execution — build may mirror implement's coordinator tier or document a hybrid).
