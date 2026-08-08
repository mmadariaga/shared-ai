**Complexity**: medium (2 modified capabilities, 3 requirements, 4 affected paths)

## Why

A test-only Step — one whose entire plan-level file scope is test files (a probe or smoke-test deliverable) — satisfies the first two parts of the split-routing condition (RED block + available Step Contract), but its implementation-dispatch allowed-files list derives empty, so the implementation worker has nothing it may touch and the run dead-ends in the GREEN-conflict STOP. Observed in change `2026-08-06-deterministic-worker-contract-delivery` Step 1 (probe `test/manual-opencode-contract-smoke.js`), which had to be landed by hand in commit `413e474`. The gap is one of specification, not just prose: `openspec/specs/apply-test-impl-split/spec.md` defines "testable" solely as "a Step that contains a RED block", with no notion of production surface.

## What Changes

- The split-routing condition in `sai/instructions/apply.md` gains a **third part**: the two-dispatch flow is selected only when the Step's plan-level file scope contains at least one production file (a plan-authorized file that the coordinator's existing allowed-files derivation classifies as production — neither a test nor a declared interface).
- A testable Step whose plan-level file scope contains no production file (test-only, interfaces-only, or any other production-free scope) routes to a single dispatch, announced by a non-blocking trace line that reuses the Contract-absent fall-back form.
- The single-dispatch fall-back for RED-carrying Steps covers a **second absence shape** — no-production-surface; the two shapes are independent, and a Step that triggers both emits both trace lines in a pinned order (contract-absent first).
- The `apply-test-impl-split` guard requirement "Coordinator guards interfaces.md ↔ implementation.md Step-N key integrity" is narrowed to its real scope: STOP only on an ambiguous `## Step N` match; a clean absence falls through to the traced single-dispatch fall-back, matching the behavior `sai/instructions/apply.md:130-136` already ships.
- The vocabulary separates "testable" (has a RED block) from "divisible" (has production surface): the **Split-Routed Step** glossary term gains the third condition, a new **Divisible Step** term is added, and the flagged ambiguity is extended.
- No change to the allowed-files derivation, the GREEN-conflict STOP, or the scratch sweep machinery.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `apply-test-impl-split`: the two-dispatch routing condition gains a third part (at least one production file in the Step's plan-level file scope); "testable" and "divisible" become distinct properties, a testable-but-not-divisible Step keeps the single-dispatch flow, the Step-N key-integrity guard is narrowed to ambiguous matches only, and the glossary contract for the routing vocabulary is specified.
- `apply-step-delegation`: the single-dispatch fall-back for RED-carrying Steps covers a second absence shape (no-production-surface) with its own non-blocking trace line, formalising alongside the existing contract-absent shape.

## Impact

- `sai/instructions/apply.md` — the two-part routing condition (lines 121-126), the Contract-absent fall-back (lines 130-136), the single-dispatch Step shapes (lines 172-174), and the Step-N key-integrity guard (line 213) narrowed to ambiguity-only.
- `GLOSSARY.md` — **Split-Routed Step** definition, new **Divisible Step** term, the "Testable Step" flagged ambiguity, and the Step Contract / split relationships.
- `openspec/specs/apply-test-impl-split/spec.md` — MODIFIED "Testable steps split into a test-writer then an implementation dispatch" and "Coordinator guards interfaces.md ↔ implementation.md Step-N key integrity"; ADDED glossary vocabulary requirement.
- `openspec/specs/apply-step-delegation/spec.md` — ADDED fall-back requirement covering both absence shapes.
- No new dependency, API, harness change, or runtime component.

## Proposal Research Documentation

**Local files**:

- `sai/instructions/apply.md:49-51,108,121-136,172-174,244,251-252`
- `sai/instructions/implement.md:146`
- `openspec/specs/apply-test-impl-split/spec.md:5-17,52-64,93-100`
- `openspec/specs/apply-step-delegation/spec.md`
- `openspec/specs/apply-coordinator-verification/spec.md:9`
- `openspec/specs/apply-execution-telemetry-appendix/spec.md:19`
- `openspec/specs/apply-subagent-report-contract/spec.md:24,109-116`
- `openspec/specs/apply-pre-commit-file-report/spec.md:31,42`
- `openspec/specs/design-target-state/spec.md:200-222` (in-spec glossary requirement precedent)
- `openspec/changes/archive/2026-08-06-deterministic-worker-contract-delivery/proposal.md`
- `GLOSSARY.md:127,166-167,203`
- git commit `413e474` (`test/manual-opencode-contract-smoke.js`)

**External URLs**: None

## Additional Notes

- Observed case: `2026-08-06-deterministic-worker-contract-delivery` Step 1 satisfied both routing parts; the implementation dispatch's allowed-files list derived empty from the plan-authorized production-only derivation (`apply.md:244`); bounded GREEN iteration could not progress; the GREEN-conflict STOP halted the run for a human decision; the probe landed by hand in commit `413e474`.
- Production-free Steps (test-only probes, interfaces-only scaffolding) are a legitimate plan shape; `sai-3-implement` is not constrained to avoid them.
- The third part reuses the coordinator's existing test-vs-production classification when deriving the three allowed-files lists — it introduces no new filename heuristics.
- Reconciled drift (artifact review H1): the "Coordinator guards interfaces.md ↔ implementation.md Step-N key integrity" requirement's STOP-on-missing clause conflicted with the traced fall-back in `apply.md:130-136`; this change narrows the guard to ambiguous matches only, so the "exactly as it routes a Step that fails part 2" premise is derivable. The matching instruction-level guard (`apply.md:213`) is updated in the same edit.
- Both fall-back trace lines are pinned in the spec so the coordinator's wording is deterministic across harnesses; when both fire, the contract-absent line is emitted first.
