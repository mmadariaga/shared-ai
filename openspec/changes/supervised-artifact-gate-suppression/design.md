## Target State

### Architecture Snapshot

None — no planned public surfaces

This change edits shared instruction prose, explore orchestration wording, and structural tests only; it introduces no application classes, interfaces, or callable APIs.

### File Manifest

M sai/commands/explore/instructions.md (Step 2)
M sai/commands/design/worker.md (Step 3)
M sai/commands/spec/worker.md (Step 3)
M sai/policies/artifact-feedback-gate.md (Step 1)
M test/design-coordinator-worker.test.js (Step 1, Step 3)
M test/explore-pipeline-selector.test.js (Step 1, Step 2)
M test/spec-coordinator-worker.test.js (Step 1, Step 3)

## Context

The shared artifact feedback gate in `sai/policies/artifact-feedback-gate.md` is the single sequencer for both standalone `/sai-1-spec` / `/sai-2-design` and explore Auto item 10. Today it always presents an interactive picker after convergence, cap exhaustion, or empty findings. Selector-dispatched Auto therefore stops twice for user input (after spec and after design), contradicting unattended supervised intent.

Standalone coordinators already fetch the gate without any mode and must keep interactive presentation, option order, and the Recommended marker byte-stable. Explore already pre-fetches the gate once before Auto dispatch and applies it at two conceptual sites with prose-supplied `artifacts`, `proceed-label`, and `next-action`. There is no executable Fetch parameter parser: parameters are instruction prose the model follows at apply time. `next-action` runs exactly once as supplied prose when proceed fires.

Related surfaces: design/spec worker-owned review loops coexist with the coordinator prose gate; under supervision, explore owns gate application and must not force iteration-0 presentation when the worker loop ends. The active-supervision **interval stage enumeration** that still names a user-facing artifact feedback picker lives in `openspec/specs/explore-pipeline-selector/spec.md` (corrected by this change's delta under `openspec/changes/supervised-artifact-gate-suppression/specs/explore-pipeline-selector/`), not in `sai/commands/explore/instructions.md` item 10 prose — item 10 only states duplicate-start rejection for the full active interval without enumerating a picker stage.

## Goals / Non-Goals

**Goals**

- Add optional `mode` (`interactive` | `supervised`) to the shared gate; omitted → `interactive`; invalid non-empty → STOP (no silent default, no auto-proceed).
- In supervised mode, after deferred-gate resolution, auto-execute the fetch site's `next-action` exactly once without picker, free-text path, or iteration-counter increment.
- Supply `mode = supervised` only at explore item 10's two gate sites; leave standalone coordinators omitting `mode`.
- Mode-qualify presentation, free-text, proceed-branch, placement, machine-feedback post-loop, and planning-artifact-review-loop coexistence so interactive and supervised cannot contradict after archive sync.
- Preserve explore read-only boundary, force-majeure interruptions (`failed`/`cancelled`, below-threshold `needs_input`), evidence-only idea-list marks, and existing **post-proceed** report order (decision summary → supervised gate auto-proceed / next-action → fetching-body reports such as phase-transition and Supervised sai-1/sai-2 done — never reports-before-auto-proceed).

**Non-Goals**

- No changes to question-autonomy, recovery policy, artifact-review-contract finding shape, review-loop caps, panel behavior, or harness install surfaces.
- No runtime caller/context detection to choose mode.
- No combined post-sai-2 gate; no gate-owned `.openspec.yaml` writes; no sai-3 chaining.
- No new conversation text at suppression points beyond existing item 10 reports.

## Decisions

### D1: Parameterize `mode` at the fetch site (not detect invocation context)

**Choice**: Fourth optional parameter `mode` on the shared gate; closed vocabulary `interactive` | `supervised`; omit defaults to `interactive` as a bounded exception to the missing-parameter STOP rule (required params and invalid mode still STOP).

**Alternatives considered**

- Detect explore/Auto from conversation or caller identity — rejected: Isolation Mode and declared-not-detected discipline forbid runtime caller detection.
- Separate supervised-only gate file — rejected: duplicates sequencer logic and drifts from interactive proceed semantics.
- Remove gate calls under Auto — rejected: both sites are phase sequencers (spec→design; design→overview), not only feedback UI.

**Rationale**: Fetch-site declaration keeps mode explicit, testable in prose/structure, and aligned with existing three-parameter supply pattern. Explore is the only supplier of `supervised`; standalone sites stay interactive by omission.

**Record family**: ddr

**Provenance**: user

### D2: Supervised mode auto-executes `next-action` once (sequencing, not gate removal)

**Choice**: When `mode = supervised` and the deferred-gate condition resolves (convergence, one-round cap exhaustion, or empty findings), the shared gate performs the site's supplied `next-action` exactly once without presenting choices. Execution stays in the shared policy; explore only supplies parameters.

**Alternatives considered**

- Explore inlines auto-proceed outside the policy — rejected: forks sequencer ownership and invites drift.
- Skip calling the gate under Auto — rejected: loses single-sourced next-action and placement relative to decision summary / machine-feedback deferral.

**Rationale**: Keeps the gate as phase sequencer; supervised is a presentation/proceed branch, not a deleted call. Failed/cancelled workers never reach this branch.

**Record family**: adr

**Provenance**: user

### D3: Mode-qualify every user-facing gate surface; leave standalone fetch sites untouched

**Choice**: Every presentation, free-text, proceed, placement, and machine-feedback "then present gate" requirement is explicitly `mode`-qualified. `sai/commands/spec/coordinator.md` and `sai/commands/design/coordinator.md` are not edited. Worker coexistence prose is mode-qualified so a supervised worker-loop ending does not imply iteration-0 picker presentation.

**Alternatives considered**

- Change only explore wording and leave main requirements interactive-only — rejected: archive sync would leave contradictory SHALL statements.
- Touch coordinators to pass `mode = interactive` explicitly — rejected: omission already defaults; explicit pass adds noise without behavior change.

**Rationale**: Spec/main-delta coherence and zero standalone UX drift.

**Record family**: adr

**Provenance**: derived

### D4: Structural tests co-land with the instruction sources they pin

**Choice**: Extend existing node:test structural suites (`test/explore-pipeline-selector.test.js`, `test/spec-coordinator-worker.test.js`, `test/design-coordinator-worker.test.js`) in the same step as each instruction edit they assert, so every step is a green commit boundary. No deferred broken-suite step.

**Alternatives considered**

- Install/projection-only assertions — rejected: this change does not alter install manifest destinations for these prose files in a new way; source tests already pin gate parameters.
- Behavioral LLM integration tests — rejected: out of scope and non-deterministic.
- Single trailing test-only step after instruction edits — rejected: leaves `npm test` red across intermediate commits and blocks per-step bisect/revert.

**Rationale**: Matches repository convention (SAI_LEARNINGS + existing suites), keeps harness parity via shared source files, and satisfies atomic-commit planning (every step builds and tests green).

**Record family**: adr

**Provenance**: codebase-forced

### D5: Supervised visible reports stay post-proceed (fetching-body order)

**Choice**: Keep explore item 10's existing emission order under supervised mode: after the decision summary, the shared gate auto-executes `next-action` (no picker); phase-transition / Supervised sai-1 done / Supervised sai-2 done / convergence counterparts remain **after** that proceed, exactly where item 10 already places them. Do **not** reorder to "existing supervised reports, then gate auto-proceed."

**Alternatives considered**

- Reports-first (decision summary + supervised reports, then auto-proceed) — rejected: would reorder item 10's only visible progress marks and break the established phase-transition / supervised-done sequencing relative to next-action (including design overview generation after Continue).
- Leave order unspecified in design — rejected: implementers could "fix" a misread of placement prose and invert observable marks.

**Rationale**: Matches live explore item 10 behavior and the approved delta's placement scenario `supervised placement preserves fetching-body post-proceed report order` (reports keep the body's order relative to gate proceed; example: phase-transition **after** the gate proceeds). Implementers follow this decision and Step 2; they MUST NOT invent a reports-before-auto-proceed sequence.

**Record family**: adr

**Provenance**: user

## Risks / Trade-offs

- [Instruction-only `mode` is model-interpreted, not machine-enforced] → Mitigation: closed vocabulary, invalid-mode STOP wording, and structural tests that pin parameter names and site supply strings.
- [Supervised auto-proceed could be misread as skipping failed workers] (**Verify-first**: Step 1) → Mitigation: single-source requirement that failed/cancelled never auto-proceed; explore interruption scenarios remain authoritative; tests retain failed-worker skip assertions.
- [Double review cost under Auto (worker-owned + explore in-session) remains] → Mitigation: accepted trade-off already documented in planning-artifact-review-loop; this change only mode-qualifies the post-loop gate, does not add rounds.
- [Active-interval stage enumeration drift if only one of selector/supervision specs is updated] → Mitigation: delta both explore-pipeline-selector and explore-pipeline-supervision (selector delta owns the stage list that names the supervised gate application point); Step 2 does not invent new interval enumeration prose in explore instructions.md.

## Migration Plan

1. Land each step as its own green commit (instruction + co-landed suite pins); no runtime deploy.
2. No data migration; no `.openspec.yaml` shape change from this feature (approval stamping unchanged).
3. Rollback: revert per step (each step's Files Affected) or, for full feature undo, all seven modified paths in the File Manifest; standalone interactive path is the default when `mode` is absent.
4. After archive, main specs carry the mode-qualified requirements; no dual-run period required.

## Open Questions

None

## Deferred

None

## Manual Verification

- **End-to-end smoke (interactive)**: Run standalone `/sai-1-spec` or `/sai-2-design` on a throwaway change far enough to hit the gate — confirm picker still appears at iteration 0 with `Give feedback (Recommended)` first and proceed second; no `mode` required in coordinator fetch.
- **End-to-end smoke (supervised)**: From explore, crystallize and `Auto` a change through spec→design — confirm no artifact-feedback picker at either phase end; phase-transition / supervised-done / autonomy-audit reports still appear in the fetching body's existing post-proceed order; overview generation still runs after design; failed worker still stops without auto-proceed.
- **Invalid mode (read-only)**: Confirm `sai/policies/artifact-feedback-gate.md` documents that a non-empty `mode` outside `{interactive, supervised}` STOPs and asks for a valid mode without defaulting or auto-proceeding — no working-tree edit required (structural suites already pin this wording).
