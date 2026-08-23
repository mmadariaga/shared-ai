**Complexity**: high

> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

Merging branches that both touch OpenSpec artifacts and ADR/DDRs today requires manual, error-prone conflict resolution, and numeric ADR/DDR collisions integrate silently because git sees distinct filenames: `0010-Name1.md` and `0010-Name2.md` merge cleanly while leaving two different decisions recorded under the same number. A command that merges with criteria and repairs the artifact namespace keeps parallel multi-branch development coherent.

## What Changes

Implemented a new routed-shaped `/sai-merge` command following the established commit/archive/backfill card pattern:

- New merge card set under `sai/commands/merge/`: a read-only Merge Analysis Worker (`instructions.md` + `worker.md`) and a coordinator (`coordinator.md`) owning every mutation behind user gates; `command-bootstrap.md` for the routed bootstrap seam.
- Harness wrappers `commands/claude/sai-merge.md` and `commands/opencode/sai-merge.md`; both boot adapters route the `merge` name to its coordinator card; the command registry skill lists `/sai-merge`.
- Worker-matrix expansion from fourteen to fifteen workers: the `merge` phase identity, `sai-merge-worker`, its binding/agent projections for both harnesses, and roster validators raised accordingly (`bin/worker-matrix.js`, `bin/install-manifest.js`, `bin/install-flow.js`, `sai/install-manifest.json`).
- Conflict resolution with criteria: semantic merge of OpenSpec specs (union for non-overlapping additions, fusion for compatible edits, escalation of true contradictions) plus guided code fusion validated by the detected project test suite through a bounded three-round verification loop.
- An unconditional post-merge ADR/DDR collision pass: colliding `NNNN-*.md` groups get lettered suffixes assigned by ascending commit date (`0010-Name1.md` → `0010a-Name1.md`, `0010-Name2.md` → `0010b-Name2.md`) and references are updated repo-wide (index links, pinned relationship tokens, openspec mentions), with orphan references reported rather than invented.
- Safety surface implemented beyond the original statement: pre-merge dirty-worktree and in-progress-merge guards, a runtime resolution-scope selector (artifacts/code/full, auto-full under `--fast-track`), and an explicit final-commit authorization gate whose refusal documents the exact repo state.
- Test suites updated across seventeen test files, including the worker-matrix, uninstall-enumeration/-execution, and model-customization-menu suites.

Known limitations recorded during review (non-normative): suffix ordering relies on git commit-date metadata and can surprise after rebases or cherry-picks; full-scope code fusion remains riskier than artifact-only resolution and is mitigated — not eliminated — by the verification loop and the no-detectable-suite escalation; `bin/model-customization.js` `UTILITY_NAMES` deliberately still omits `sai-merge`; unprefixed checklist identities silently looped parseTarget-based menus until this change prefixed them, and similar fixture drift may recur as inventories grow.

## Capabilities

### New Capabilities

- `sai-merge-command` — gated git-merge workflow: read-only pre-merge checks, recency-ordered local branch selection, categorized conflict analysis (specs semantic merge + guided code fusion), scoped resolution proposals, bounded suite verification, and unconditional ADR/DDR namespace repair with repo-wide reference updates, finalized by an authorized merge commit.

### Modified Capabilities

- `worker-matrix-collapse` — canonical matrix grows from fourteen to fifteen entries with the `sai-merge-worker` identity.
- `thin-wrappers` — the per-harness wrapper set grows to include `sai-merge.md`.
- `sai-command-registry` — the registry table gains the `/sai-merge` row.
- `sai-fast-track-flag` — `sai-merge` joins as the sixth `--fast-track` opt-in, parsed coordinator-side.
- `model-customization-menu` — derived routed-worker and command families include the merge targets.
- `adr-index-maintenance` — the index machinery handles lettered-suffix ADR/DDR records and suffixed relationship tokens produced by collision repair.

## Impact

New files:
- `sai/commands/merge/command-bootstrap.md`
- `sai/commands/merge/coordinator.md`
- `sai/commands/merge/instructions.md`
- `sai/commands/merge/worker.md`
- `commands/claude/sai-merge.md`
- `commands/opencode/sai-merge.md`

Modified files:
- `AGENTS.md`, `README.md`, `sai/adapters/claude/boot.md`, `sai/adapters/opencode/boot.md`, `sai/install-manifest.json`, `bin/install-flow.js`, `bin/install-manifest.js`, `bin/worker-matrix.js`, `skills/universal/sai-commands/SKILL.md`, `fixtures/thin-command-wrappers-baseline.json`, `test/agent-projection-strategy.test.js`, `test/agent-sidecar-removal.test.js`, `test/agent-tunable-ownership.test.js`, `test/apply-routed-architecture.test.js`, `test/canonical-opencode-agent-behavior.test.js`, `test/command-launcher-card.test.js`, `test/doctor-fetch-resolution.test.js`, `test/doctor-retirement-step-5.test.js`, `test/install-claude.test.js`, `test/install-manifest.test.js`, `test/install-opencode.test.js`, `test/model-customization-menu.test.js`, `test/uninstall-enumeration.test.js`, `test/uninstall-execution.test.js`, `test/worker-matrix-projection.test.js`, `test/worker-matrix.test.js`

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Proposal Research Documentation

- Evidence base: the staged diff of this change itself (`git diff --staged`, 32 files changed) — the verified implementation record this backfill describes.
- `sai/commands/commit/coordinator.md`, `sai/commands/archive/coordinator.md` — closest routed-shaped siblings consulted for the mutation surface, gate presentation, and HEREDOC commit form.
- `sai/adapters/claude/boot.md`, `sai/adapters/opencode/boot.md` — card-selection routing extended with the `merge` name.
- `sai/install-manifest.json`, `bin/worker-matrix.js`, `bin/install-manifest.js`, `bin/install-flow.js` — worker-matrix expansion mechanics and roster validation.
- `sai/commands/implement/adr-index.template.md`, `sai/commands/implement/ddr-index.template.md` — ADR/DDR index conventions grounding the lettered-suffix collision repair.
- `openspec/schemas/sai-workflow/schema.yaml` — artifact schema governing these drafts.

## Additional Notes

- Scope drift carried from intent reconciliation (diff-evidenced beyond the stated intent, specified from the diff): pre-merge dirty-worktree/in-progress-merge guards, the runtime resolution-scope selector with fast-track auto-full-scope, and the explicit final-commit authorization gate with refusal-state documentation.
- Known limitations remain non-normative; see the limitations paragraph under `## Why`. None is asserted as implemented behavior without diff evidence — the deliberate `UTILITY_NAMES` omission was verified read-only at `bin/model-customization.js` line 21.
