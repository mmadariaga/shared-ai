**Complexity**: high (11 affected file paths, 3 new capabilities)

## Why

The Copilot retirement (ADR 0103) removed the inline adapter and installer inventory, but the five inline phase-command bodies extracted during the sai-1/5/6/7/8 coordinator-worker splits were never swept. No harness wrapper references them, yet the recursive `sai-commands` manifest entry still projects them to every Claude Code and opencode install. Separately, `openspec/specs/inline-coordinator-adapter/` — alongside `implementation-continuation/` and `sai-2-continue-branch-flow/` — survives as an empty directory in this working tree, a residue of the archived `retire-inline-harness-model` delta (openspec/changes/archive/2026-08-06-retire-inline-harness-model/implementation.md:50), which deleted the directory's tracked spec file; git neither tracks nor clones empty directories, so the residue is working-tree-local hygiene, not a repository-level breach. This change finishes executing that archived delta: the orphan bodies are deleted through the retirement protocol, the empty-directory residue is removed from the working tree, and the gate policy stops naming deleted files as its fetchers.

## What Changes

- Delete the five unreferenced inline phase bodies `sai/commands/sai-1-spec.md`, `sai/commands/sai-5-review.md`, `sai/commands/sai-6-security.md`, `sai/commands/sai-7-performance.md`, and `sai/commands/sai-8-accessibility.md`.
- Register each deletion as a hash-gated `retirements[]` record in `sai/install-manifest.json` so copies already installed on user machines are removed by install/doctor/uninstall rather than stranded, and remove the two phantom entries from the `sai-commands` projection exclude list.
- Add the five deleted paths to `RETIRED_SOURCES` in `bin/orchestration-source-audit.js`.
- Remove the three empty capability directories `openspec/specs/implementation-continuation/`, `openspec/specs/inline-coordinator-adapter/`, and `openspec/specs/sai-2-continue-branch-flow/` from the working tree — a plain cleanup step for untracked directories that git cannot represent, completing the archived delta's local residue.
- Correct the fetcher provenance in `sai/policies/artifact-feedback-gate.md`: the live fetchers are the two coordinators, not deleted bodies.
- Re-anchor the two test suites that assert the orphaned bodies.

## Capabilities

### New Capabilities

- `orphan-inline-caller-retirement`: the five unreferenced phase bodies are deleted and hash-gated retirement records remove installed copies
- `empty-capability-directory-cleanup`: the three empty capability directories are removed from the active spec tree (working-tree-local cleanup — the directories are untracked, so no durable guard is contracted)
- `feedback-gate-provenance-correction`: the live gate policy stops naming deleted files as its fetchers

### Modified Capabilities

- *(none — this change adds new capability contracts; repair of existing capability prose that still names the deleted bodies is a later slice and is explicitly out of scope)*

## Impact

Affected files:

- `sai/commands/sai-1-spec.md` (deleted)
- `sai/commands/sai-5-review.md` (deleted)
- `sai/commands/sai-6-security.md` (deleted)
- `sai/commands/sai-7-performance.md` (deleted)
- `sai/commands/sai-8-accessibility.md` (deleted)
- `sai/install-manifest.json`
- `bin/orchestration-source-audit.js`
- `sai/policies/artifact-feedback-gate.md`
- `test/spec-coordinator-worker.test.js`
- `test/accessibility-coordinator-worker.test.js`
- `test/uninstall-enumeration.test.js`

Plus three empty directories removed from the working tree (not git-tracked): `openspec/specs/implementation-continuation/`, `openspec/specs/inline-coordinator-adapter/`, `openspec/specs/sai-2-continue-branch-flow/`.

Not touched: `openspec/specs/_archived/**`, `openspec/changes/archive/**`, the harness wrappers under `commands/`, the routed coordinators/invocation cores/worker contracts/bindings, and the dedicated `spec/coordinator.md` projection entry. No dependency is introduced. No behavior changes for the two supported harnesses — no wrapper references any deleted body.

## Proposal Research Documentation

**Local files**: `sai/install-manifest.json`; `bin/orchestration-source-audit.js`; `sai/policies/artifact-feedback-gate.md`; `sai/commands/spec/coordinator.md`; `sai/commands/design/coordinator.md`; `sai/commands/spec/invocation.md`; `sai/commands/sai-1-spec.md`; `test/spec-coordinator-worker.test.js`; `test/accessibility-coordinator-worker.test.js`; `test/orchestration-source-layout-step-6.test.js`; `fixtures/spec-coordinator-worker.js`; `docs/adr/0103-retire-inline-harness-model-in-favor-of-routed-harnesses.md`; `openspec/changes/archive/2026-08-06-retire-inline-harness-model/implementation.md`; `openspec/specs/orchestration-source-layout/spec.md`; `skills/universal/sai-commands/SKILL.md`; `package.json`

**External URLs**: *(none)*

## Additional Notes

- **managedHashes scale**: the five bodies have multi-commit git histories, so each retirement record carries one SHA-256 digest per distinct historical content variant (precedent records range from 1 to 23 hashes). Digests SHALL be computed from the file's git history at implementation time, including the deletion-time digest; a digest fixed at proposal time is volatile and MUST NOT be copied into a retirement record — a stale digest silently strands the installed copy, which is this change's accepted risk (collection is manual git archaeology per file with no tooling).
- **Empty directories are untracked and uncloneable**: git does not track empty directories, so the three residue directories exist only in this working tree — a fresh clone has never contained them, and neither `git status` nor any CI-run test can observe their removal. The cleanup is therefore a plain working-tree step with no tracked-file deletion and no CI-enforceable invariant; the archived delta's tracked obligation (deleting `spec.md`) was already satisfied at the repository level, and the residue removal completes it locally.
- **Audit quirk**: `bin/orchestration-source-audit.js` effectively scans only the first line of non-change files (`researchDocumentation` is `false` and `false >= 0` is true, skipping `index > 0`), so adding the five paths to `RETIRED_SOURCES` flags future line-1 references without flagging the existing line-3+ spec prose. The audit test fixtures place their references on line 1 and remain unaffected.
- **Gate fetchers**: at the time of writing, the fetchers of `sai/policies/artifact-feedback-gate.md` are `sai/commands/spec/coordinator.md:10` and `sai/commands/design/coordinator.md:10` — a point-in-time observation, not a contract. The orphan `sai/commands/sai-1-spec.md:37` also fetches it and is deleted by this change; the deleted `sai-2-design.md` body is already covered by its retirement record.
- **Out of scope (later slices)**: contract prose repair in live capability specs that still name the five bodies (`spec-quality`, `extract-bodies`, `completion-message-simplification`, `review-phase-worker`, `source-layout`, `sai-fast-track-next-prompt-hint`, `explore-crystallization-block`, `spec-research-consumption`, `accessibility-worker-installation`, `remove-caveman-from-commands`) and capability-spec archival.
