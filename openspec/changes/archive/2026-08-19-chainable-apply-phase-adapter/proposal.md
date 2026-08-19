**Complexity**: high

## Why

The apply phase conflates a reusable phase adapter with a standalone-invocation shell across three cards that also duplicate normative rules, so no consumer can chain apply by extension. A small delta on the existing orchestration-core adapter contract is required before any multi-phase command can compose ordered phase adapters in one invocation.

## What Changes

- Split apply's reusable phase-adapter surface from the standalone-invocation shell (prerequisites, change picker, `--fast-track` parse, pinned completion / MANDATORY STOP literal).
- Keep phase-owned apply behavior (session commit-authorization flag, fast-track branch auto-stay, scratch cleanup contract, step routing, verification, recovery, report/appendices) on the adapter surface.
- Parameterize apply `terminal_navigation` so standalone invocation still prints the pinned completion literal and stops, while a chained consumer can resolve a non-final phase terminal to a transition without editing change resolution.
- Add a three-rule delta on the existing `orchestration-core` shared coordinator contract: (1) ordered multi-adapter invocation with consecutive activation, segment rebind, and a changed-files union that spans transitions; (2) non-final `terminal_navigation` resolves to the authorized transition to position `i+1` (only the final adapter closes a successful run); (3) a chained phase's Isolation Mode preamble does not reset supervisor session state.
- Treat cross-card deduplication (routing tree, progress events, plan selection, checklist, scratch ×3) as a consequence of building one unambiguous adapter surface — not a separate cleanup axis.
- Verify behavior preservation with the existing apply and shared-runner test files already in the harness; do not author a new suite solely for this refactor.

## Capabilities

### New Capabilities

- `apply-phase-adapter-extraction`: Separate apply's reusable phase adapter from the standalone-invocation shell and parameterize `terminal_navigation` so standalone `/sai-4-apply` behavior is preserved while chained consumers can suppress the standalone terminal without touching change resolution.

### Modified Capabilities

- `orchestration-core`: Extend the shared coordinator contract with three chained-phase composition rules so one invocation can run an ordered sequence of phase adapters without a new orchestration file or relocating `command-runner.md`.

## Impact

- `sai/commands/apply/coordinator.md` — phase-adapter surface; `terminal_navigation` parameterization
- `sai/commands/apply/runner.md` — phase-owned routing/progress/checklist/report/appendices (dedup as consequence)
- `sai/commands/apply/invocation.md` — standalone shell (prereqs, picker, fast-track parse, pinned completion literal); phase-owned commit-auth and branch auto-stay remain phase behavior reachable from the adapter
- `sai/orchestration/command-runner.md` — three-rule chained-phase delta only; file stays in place
- `openspec/specs/orchestration-core/spec.md` — MODIFIED shared coordinator contract
- `GLOSSARY.md` — maintained terms owned by this change: **Chained Phase Composition**, **Phase Adapter**, **Standalone Invocation Shell**; **Progress Plan** segment wording; relationships disambiguating Phase Adapter vs Harness Boot Adapter
- Existing apply and shared-runner contract tests (behavior-preservation gate):
  - `test/apply-coordinator-verification.test.js`
  - `test/apply-routed-architecture.test.js`
  - `test/apply-step-projection.test.js`
  - and the other apply-referencing and shared-runner test files already in the harness
- Explicitly not touched: `sai/commands/explore/instructions.md` (read-only validation reference); standalone `/sai-3-implement` and direct `/sai-4-apply` observable behavior; Review Engine vocabulary; no new `sai-build` command in this change

## Proposal Research Documentation

**Local files**:
- `sai/commands/apply/coordinator.md`
- `sai/commands/apply/runner.md`
- `sai/commands/apply/invocation.md`
- `sai/orchestration/command-runner.md`
- `sai/orchestration/worker-core.md`
- `openspec/specs/orchestration-core/spec.md`
- `openspec/specs/apply-completion-clarity/spec.md`
- `openspec/specs/apply-routed-card-set/spec.md` (via research summary)
- `openspec/specs/pipeline-phase-transition/spec.md` (via research summary; explore chain contrast)
- `sai/commands/explore/instructions.md` (read-only shape validation for item 10)
- `sai/commands/spec/coordinator.md`, `sai/commands/design/coordinator.md` (terminal_navigation samples)
- `test/apply-coordinator-verification.test.js`
- `test/apply-routed-architecture.test.js`
- `test/apply-step-projection.test.js`
- `GLOSSARY.md`
- `openspec/changes/archive/2026-08-18-relocate-orchestration-core-contracts/proposal.md`

**External URLs**: None

## Additional Notes

- Slice framing: enabling refactor only. Downstream `sai-build` (ordered implement→apply with unconditional apply `--fast-track`) is the motivating consumer and is out of scope for this change's artifacts.
- Deduplication is not a separate product goal: one unambiguous adapter surface collapses duplicate routing-tree, progress, plan-selection, checklist, and scratch specs without opening broader apply cleanup.
- Explore's supervised Auto chain validates the three-rule shape read-only; it keeps its inline transition and is not retrofitted onto the primitive.
- Glossary caution: `Harness Boot Adapter` already lists "phase adapter" as an avoided alias for the boot entry. Orchestration's phase-adapter concept remains the adapter field set on routed coordinators; do not collapse the two terms.
- Apply currently declares a four-field boot envelope while the neutral runner documents a two-string worker dispatch envelope; this change leaves that historical seam unchanged — transitions reuse each successor's existing `original_envelope` shape, and apply worker dispatch stays two-string inside the segment.
- Behavior-preservation gate is the existing apply source-contract tests (predominantly regex/literal pins), not a new execution suite.
- Overview language preference from the handoff (`Español`) applies to a future `change-overview.md` generation step, not to this proposal or its specs (artifacts remain English).
- `apply-completion-clarity` is not a Modified Capability: its sole requirement pins the user-facing completion message string for `/sai-4-apply`, which this change preserves verbatim on the shell-owned standalone completion action. Re-homing that literal into the named standalone shell does not change the requirement's wording or the observable message, so no delta spec is required.
