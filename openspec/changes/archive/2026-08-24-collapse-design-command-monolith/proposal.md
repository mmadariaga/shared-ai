> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

**Complexity**: high (10 files affected, structural consolidation plus two modified requirements)

## Why

`sai/commands/design/` stated the same normative blocks in two to five places across `coordinator.md` and `worker.md`, and that drift had already produced a hard contradiction about which surface validates `--overview-lang`. Consolidating the canonical declarations into one `phase-contract.md` gives each block a single home, following the step-library pattern established for `sai-1` in commit e62ad533.

## What Changes

- NEW `sai/commands/design/phase-contract.md` carrying the canonical `DesignProgressPlan` (both variants), `DesignStepPointerMap`, `DesignWriteSurface`, and `DesignResultUnion`, plus a pointer self-derivation clause for the route where no coordinator sends pointer lines.
- `coordinator.md` restructured as six numbered lifecycle steps; reconciliation rendered as a matrix table backed by a normative prose paragraph; progress-plan declarations removed and delegated to the phase contract.
- `worker.md` no longer redeclares the progress plans; the claim that the coordinator rejects malformed `--overview-lang` before dispatch was removed; the fast-track banner notice is suppressed when `supervised` is true.
- The `### File Manifest` net-fold algorithm moved from `steps/design.md` to `steps/tasks.md`, where its input (`**Files Affected**` entries) is authored.
- `$ARGUMENTS` replaced with `{resolved_change_name}` in `steps/research.md`, `steps/design.md`, `steps/interfaces.md`, and `steps/tasks.md`.
- `steps/common.md` gained a `Rules originating here:` origination manifest.
- Guard assertions inverted: progress plans must now be single-sourced in the phase contract rather than duplicated byte-for-byte, and the pinned design-directory listing admits `phase-contract.md`.

## Capabilities

### New Capabilities

- **design-phase-consolidation** — canonical phase contract consolidating the progress plans, step pointer map, write surface, and result union into a single authoritative source that both coordinator and worker reference.

### Modified Capabilities

- **design-planning-worker** — two existing requirements change. `Fast-track activation is coordinator-owned handoff` no longer holds unconditionally, because the supervised route dispatches the worker with no coordinator present. `Overview-language form validation is coordinator-owned fail-fast` moves to worker-owned validation for the same reason.

## Impact

Ten files changed across `sai/commands/design/` and `test/`:

- `sai/commands/design/coordinator.md` — six lifecycle steps and reconciliation matrix
- `sai/commands/design/phase-contract.md` — NEW
- `sai/commands/design/steps/common.md` — rules-origination manifest
- `sai/commands/design/steps/design.md` — fold algorithm delegated to tasks.md
- `sai/commands/design/steps/interfaces.md` — placeholder updated
- `sai/commands/design/steps/research.md` — placeholder updated
- `sai/commands/design/steps/tasks.md` — fold algorithm relocated here
- `sai/commands/design/worker.md` — plan redeclarations, false validation claim, and unconditional banner removed
- `test/design-coordinator-worker.test.js` — assertions verify single-sourcing
- `test/orchestration-source-layout-step-2.test.js` — directory listing updated

Net change: 266 insertions, 124 deletions. All 1245 tests pass.

Two pre-existing divergences were discovered during backfill and are recorded rather than repaired here. The baseline worker already violated `Fast-track activation is coordinator-owned handoff` by activating fast-track, returning the banner notice, and keeping a banner-dedup reconstruction field. `coordinator.md` states that the coordinator does not validate `--overview-lang`, which diverges from the fail-fast half of the existing validation requirement. Neither divergence was introduced by this change.

Out of scope: reducing `worker.md` to a pure lifecycle envelope. Its overview-lifecycle and external-findings bodies remain in that file because 24 assertions in `test/design-coordinator-worker.test.js` pin them there; relocating them requires reworking those assertions and is a separate change.

## Proposal Research Documentation

- Staged diff against `fbc5ac3b2963a4da5fa14886c9d9cb001facf75a`
- `openspec/specs/design-planning-worker/spec.md` — existing requirements at lines 364 and 371
- `openspec/specs/sai-fast-track-flag/spec.md` — `Composition owns the chained banner`
- `sai/commands/spec/` and commit e62ad533 — the step-library pattern this change mirrors

## Additional Notes

The original intent also covered reducing the worker card to a lifecycle envelope and relocating the review and overview bodies into resident files. That portion was attempted, produced 61 test failures, and was reverted; only the consolidation that passes the guard suite is recorded here.
