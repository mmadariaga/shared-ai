# Implement Step — Validation

Active step: validation. Verify the durable `implementation.md` artifact and confirm the audit-append invariant, then report the `validation` progress event per the worker contract. A failed verification does not emit `validation`; return `failed` with a concise blocking summary instead.

## Pre-Delivery Verification

Before saving the plan file, verify:
- Every code block is complete and directly executable (no placeholders, no TODOs).
- Every step has a Verification Checklist with an Automated section.
- Every step has a STOP & COMMIT marker.
- Every Human check that cannot be performed at its step is explicitly deferred — not omitted — to the correct integration step, grouped in a labeled block matching its origin step.
- No integration step is missing deferred checks from any prior step.
- **Human-check encoding:** every step's Human section is either (a) a `**Human (...)**` header with ≥1 `- [ ]` checkbox, or (b) a single italic parenthetical note (not-yet-rendered, deferred-away, or service-side) with no header and no checkbox. No step contains an invented `- [ ] No human check required` (or equivalent placeholder) checkbox. The audit `- [ ] No code changes from this audit` checkbox and `*Deferred from Step N (...)*` blocks are genuine actions and are exempt from this rule.
- All code strictly follows the Expertise Profile from `tasks.md`.
- **RED → GREEN check:** Every step that introduces testable code has a RED block (test that fails against current codebase) and a GREEN block (minimal implementation that passes). Non-testable steps skip RED/GREEN. Every Step whose RED block lists retired files carries exactly one Verification Checklist item per retired file asserting the file's absence; no retirement entry appears outside a RED block, and no green-direct Step carries one.
- [ ] **Audit-append invariant:** verify that THIS invocation appended exactly one step per audit artifact present at the start of the run (among `review.md`, `security.md`, `performance.md`, and `accessibility.md`), keyed on the run-path baseline — the highest `#### Step N:` number in the generated plan on the first-run path, or the highest `#### Step N:` number present in `implementation.md` at the start of the invocation and captured before any write on the re-run path. Each appended step must be numbered strictly after that baseline: a step appended by an earlier invocation does NOT satisfy the check (the re-run contract appends one new step per artifact on every re-run with no dedup). When the check finds a missing append, repair it before delivery by appending the missing step — the repair append fires the same chat-confirmation obligation as a first-run append. This self-check is the first stage of a two-stage design; the implementation-planning worker's Durable artifact verification gate is the second stage and the last resort, failing only if a required append is still missing at completion time. This bullet does NOT verify the chat confirmation of the existing "Discarded findings SHALL be surfaced in chat for conversational confirmation" requirement — that requirement remains the plain conversational obligation it already is (no approval key is written, and `implementation.md` carries no trace of a chat emission).
- [ ] **RED block contract invariant (audit-derived steps):** For every audit-derived step that carries a RED block in `implementation.md`, verify that an exact, unambiguous matching `## Step N:` contract section exists in `interfaces.md`. If `interfaces.md` does not exist, or if the only content is the `None — no step contracts` sentinel, then no audit-derived step in `implementation.md` may carry a RED block. When the check finds an audit RED block without a matching contract, repair it before delivery by adding the missing `## Step N:` contract to `interfaces.md` (since the step carries a RED block, it must introduce testable code). A missing `## Step N:` contract for an audit RED block makes case 3 of the Step Routing Tree unreachable and would cause `sai-4-apply` to STOP before dispatch; this check prevents the plan from reaching apply unexecutable.

## Output File

MANDATORY: Save the implementation file to path:
`openspec/changes/{change-name}/implementation.md`
