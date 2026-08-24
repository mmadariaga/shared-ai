> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

**Complexity**: high

## Why

The specification system carried a duplicated instruction set: `sai/commands/spec/instructions.md` (169 lines) mirrored core blocks already in `sai/commands/spec/steps/common.md`. When `steps/common.md` was kept in force for the entire workflow run, seven blocks loaded twice in a single context window. Every divergence between the two copies — contradictions, drift in wording, misaligned precedence — created a seam where smaller models would conflict and reasoning would split.

Removing the duplicate resolves those contradictions and consolidates the normative instruction surface. The change also restructures the `coordinator.md` from continuous prose into a numbered six-step lifecycle, making the control flow explicit and testable.

## What Changes

**Deleted files:**
- `sai/commands/spec/instructions.md` (169 lines, 8 sections) — the mirrored instruction set

**Modified files in `sai/commands/spec/`:**
- `steps/common.md` — now holds Collaboration Style, the Project Planning Agent role framing, the Artifact Verification Checklist (passive catalogue), Rule #1, and Rule #2
- `steps/research.md` — holds the Research Guide, handoff research consumption, and cost-discipline rules; the "no more than 3 files in a row" ceiling was deleted, leaving the audit ceiling of 15 reads / 30 searches as the single budget
- `steps/proposal.md` — holds Required Documentation discipline
- `steps/validation.md` — holds the Complexity Derivation Rubric with calibration anchor (140 archived changes, median S2 = 5, max S2 = 37); the shell reproduction script was dropped; validation warning entries now return structured entries
- `steps/review.md` and `specs.md` — origin headers only
- `worker.md` — prerequisites now point at `@sai/policies/prereqs-check.md` for exact STOP literals; the premature research obligation was removed; the bare-`--supervised` degenerate case is documented
- `coordinator.md` — restructured from continuous prose into a numbered six-step lifecycle with adapter configuration in its own section

**Modified files outside `sai/commands/spec/`:**
- `sai/install-manifest.json` — retirement entry for the deleted file, both harnesses
- `test/spec-coordinator-worker.test.js` — existing assertion inverted; two new tests added (one detecting normative block duplication in spec step files, one pinning the bare-`--supervised` case)

**Stale reference updates (16 files):**
- `openspec/schemas/sai-workflow/schema.yaml` line 24 — path swap to `sai/commands/spec/steps/validation.md`
- `openspec/schemas/sai-workflow/templates/proposal.md` line 2 — path swap to `sai/commands/spec/steps/validation.md`
- `openspec/specs/proposal-complexity/spec.md` line 99 — path swap to `sai/commands/spec/steps/validation.md`
- `openspec/specs/spec-quality/spec.md` lines 7, 55 — modified requirements pointing to `steps/validation.md`
- `openspec/specs/spec-research-consumption/spec.md` line 93 — reference to `steps/research.md`, false descriptor removed
- `openspec/specs/glossary-location/spec.md` line 17 — retarget to `sai/policies/spec-phase-contract.md` SpecWriteSurface
- `openspec/specs/routed-harness-support/spec.md` line 50 — rewritten to "active files under `sai/commands/spec/steps/`"
- `openspec/specs/remove-caveman-from-commands/spec.md` lines 7, 18 — reference to `steps/common.md`
- `openspec/specs/explore-crystallization-block/spec.md` line 144 — reference to `sai/commands/spec/steps/`
- `openspec/specs/wrapper-fetch-paths/spec.md` — scenario removed (premise reads the retired `sai/commands/spec/invocation.md`, making the scenario unexecutable); example in "Claude resolves a folded command instruction" retargeted to `@sai/commands/spec/steps/common.md`
- `openspec/specs/command-wrappers/spec.md` lines 9, 86, 90 — routing rewritten to verified path: card fetches `@skills/fetch/SKILL.md`, `@sai/adapters/claude/boot.md`, and `@sai/commands/spec/command-bootstrap.md`; boot routes to `@sai/commands/spec/coordinator.md`; worker loads `@sai/commands/spec/steps/common.md` at dispatch
- `openspec/specs/archive-completed-specs/spec.md` line 38 — retarget to `sai/policies/spec-phase-contract.md` SpecWriteSurface; scope restriction relocated
- `openspec/specs/adr-creation-decision/spec.md` — removed dead entry from enumeration of instruction surfaces
- `openspec/specs/docs-sync/spec.md` line 44 — inverted test assertion: file is NOT fetched and does not exist
- `openspec/specs/deduplicate-sai-2-design/spec.md` line 9 — REMOVED requirement (was never satisfiable: the base commit's instructions.md contained exactly eight sections and "Artifact-Only Scope" was not among them)
- `openspec/specs/instructions-fold/spec.md` line 21 — scenario removed (documents completed migration whose endpoint this change deletes)

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- **spec-quality** — modified to point validation rule citations to `sai/commands/spec/steps/validation.md` instead of the deleted `instructions.md`; the complexity rubric and validation procedures remain unchanged

## Impact

**Affected files:**
1. `sai/commands/spec/instructions.md` (deleted)
2. `sai/commands/spec/steps/common.md` (modified)
3. `sai/commands/spec/steps/research.md` (modified)
4. `sai/commands/spec/steps/proposal.md` (modified)
5. `sai/commands/spec/steps/validation.md` (modified)
6. `sai/commands/spec/steps/review.md` (modified)
7. `sai/commands/spec/steps/specs.md` (modified)
8. `sai/commands/spec/worker.md` (modified)
9. `sai/commands/spec/coordinator.md` (modified)
10. `sai/install-manifest.json` (modified)
11. `test/spec-coordinator-worker.test.js` (modified)
12. `openspec/schemas/sai-workflow/schema.yaml` (modified)
13. `openspec/schemas/sai-workflow/templates/proposal.md` (modified)
14. `openspec/specs/proposal-complexity/spec.md` (modified)
15. `openspec/specs/spec-quality/spec.md` (modified)
16. `openspec/specs/spec-research-consumption/spec.md` (modified)
17. `openspec/specs/glossary-location/spec.md` (modified)
18. `openspec/specs/routed-harness-support/spec.md` (modified)
19. `openspec/specs/remove-caveman-from-commands/spec.md` (modified)
20. `openspec/specs/explore-crystallization-block/spec.md` (modified)
21. `openspec/specs/wrapper-fetch-paths/spec.md` (modified)
22. `openspec/specs/command-wrappers/spec.md` (modified)
23. `openspec/specs/archive-completed-specs/spec.md` (modified)
24. `openspec/specs/adr-creation-decision/spec.md` (modified)
25. `openspec/specs/docs-sync/spec.md` (modified)
26. `openspec/specs/deduplicate-sai-2-design/spec.md` (modified)
27. `openspec/specs/instructions-fold/spec.md` (modified)

Tests pass at baseline: 1237 pass / 2 pre-existing failures remain.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill.

## Proposal Research Documentation

- `sai/commands/spec/instructions.md` (analyzed for duplication patterns against canonical instruction locations)
- `sai/commands/spec/steps/common.md`, `research.md`, `validation.md`, `review.md`, `proposal.md`, `specs.md` (consolidated instruction surfaces)
- `sai/commands/spec/worker.md`, `coordinator.md` (coordinator flow and prerequisites)
- `openspec/specs/spec-quality/spec.md` (validation and complexity rubric)
- `openspec/specs/spec-research-consumption/spec.md`, `wrapper-fetch-paths/spec.md`, `command-wrappers/spec.md` (instruction fetch routing)
- 13 additional `openspec/specs/*/spec.md` files (conflict detection against overlapping requirements)

## Additional Notes

**Pre-existing rot absorbed by this change:** `openspec/specs/` carries dead references from three separate earlier migrations, not originating with this change:
- `docs-sync.md` and `instructions-fold.md` cite the long-retired `sai/instructions/spec.propose.md`
- `wrapper-fetch-paths.md` cites the retired `sai/commands/spec/invocation.md`
- `command-wrappers.md` described a wrapper-fetches-instructions architecture no longer in force after routing was introduced
- `deduplicate-sai-2-design.md` carried a REMOVED requirement that was never satisfiable: it expected an "Artifact-Only Scope" section in instructions.md, but the base commit contained exactly eight sections and that heading was not among them

This change absorbs that rot while consolidating the core instruction duplication.

**Coordinator restructuring and capability scope:** The restructuring of `sai/commands/spec/coordinator.md` from continuous prose into a numbered six-step lifecycle is a documentation-layout change that carries no modification to the obligations stated by the spec-coordinator capability. All four existing requirements survive unchanged; the delta is empty by design.

**ADR/DDR evaluation:** The ADR/DDR criteria were evaluated against this change's decisions. The closest candidate was the decision to consolidate instructions into step files rather than maintaining a central instructions.md: each block now lives in the step file that consumes it. This decision fails the "surprising without context" criterion because `sai/commands/design/` already followed this pattern at the base commit (command-bootstrap.md, coordinator.md, worker.md, and a steps/ directory with no instructions.md). Five commands overall lacked instructions.md at the base commit: apply, design, meta-build, meta-review, and status. This change represents convergence on an existing pattern rather than departure from established convention, so no decision record was created.

**Known debt deferred:** The decision-summary contract is undefined at runtime (validation.md cites a "Completion contract" section not found in the `openspec-propose` skill), and the 15-line cap in `spec-quality` is never fetched during execution — both shared work with the design command. Collaboration style remains duplicated between design and review; the spec read budget now diverges from the other six commands by design. Rule #1 and Rule #2 now load on every step because they live in `common.md`, a correctness fix preferred over context savings. The duplication-detection test keys off a fixed list of block headings and covers only spec step files. Origin headers are a convention without runtime enforcement, and inserting one during this work displaced a structural entry-point policy fetch and broke an existing invariant before being corrected.
