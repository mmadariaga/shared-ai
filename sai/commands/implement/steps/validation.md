# Implement Step — Validation

Active step: validation. Verify the written `implementation.md` artifact and confirm the audit-append invariant, then report the `validation` progress event per the worker contract. A failed verification does not emit `validation`; return `failed` with a concise blocking summary instead.

## Pre-Delivery Verification

Verify the written `openspec/changes/{change-name}/implementation.md`; repair any failed item in place and re-verify:
- Every code block is complete and directly executable (no placeholders, no TODOs).
- Every step has a Verification Checklist with an Automated section.
- The plan's verification commands follow the common Hard Rules **Verification commands** bullet: one `{step-test-command}` per RED block, reused verbatim by its GREEN phase and checklist; a `## Verification commands` section holding `{full-suite-command}`; and no Step checklist item running that full-suite command.
- Every step has a STOP & COMMIT marker.
- Every Functional check that cannot be performed at its step is explicitly deferred — not omitted — to the correct integration step, grouped in a labeled block matching its origin step, and appears exactly once in the plan.
- No integration step is missing deferred checks from any prior step.
- **Functional-check encoding:** every step's Functional section is either (a) a `**Functional (...)**` header with ≥1 `- [ ]` checkbox, or (b) a single italic parenthetical note (not-yet-rendered, deferred-away, or service-side) with no header and no checkbox. The legacy `**Human (...)**` header is never emitted. No step contains an invented `- [ ] No functional check required` (or equivalent placeholder) checkbox. The audit `- [ ] No code changes from this audit` checkbox and `*Deferred from Step N (...)*` blocks are genuine actions and are exempt from this rule.
- All code strictly follows the Expertise Profile from `tasks.md`.
- **Interface conformance:** when `interfaces.md` exists, every public signature in Step N matches the one declared under its `## Step N`.
- **Planning only:** no project file outside `openspec/changes/{change-name}/` was modified, and no plan checkbox is `[x]` except inside steps collapsed to `*(already applied)*`.
- **RED → GREEN check:** Every step that introduces testable code has a RED block (test that fails against current codebase) and a GREEN block (minimal implementation that passes). Non-testable steps skip RED/GREEN. Every Step whose RED block lists retired files carries exactly one Verification Checklist item per retired file asserting the file's absence; no retirement entry appears outside a RED block, and no green-direct Step carries one.
- **Audit-append invariant:** THIS invocation appended exactly one step per audit artifact present at the start of the run (among `review.md`, `security.md`, `performance.md`, and `accessibility.md`), keyed on the run-path baseline — the highest `#### Step N:` number in the generated plan on the first-run path, or the highest `#### Step N:` number present in `implementation.md` at the start of the invocation and captured before any write on the re-run path. Each appended step is numbered strictly after that baseline; a step appended by an earlier invocation does NOT satisfy the check. Repair a missing append by appending the missing step, which carries the same Discarded-findings `summary` obligation as a first append.
- **RED block contract invariant (audit-derived steps):** For every audit-derived step that carries a RED block in `implementation.md`, an exact, unambiguous matching `## Step N:` contract section exists in `interfaces.md`. If `interfaces.md` does not exist, or its only content is the `None — no step contracts` sentinel, no audit-derived step may carry a RED block. Repair a missing contract by adding the missing `## Step N:` contract to `interfaces.md`. Without it, case 3 of the Step Routing Tree is unreachable and `sai-4-apply` stops before dispatch.
- **Fast-track corrections:** every fast-track auto-correction has its correction note in `implementation.md`.
