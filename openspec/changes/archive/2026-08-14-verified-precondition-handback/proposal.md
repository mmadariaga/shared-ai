**Complexity**: medium

## Why

An improvised hand-back can send a user to a command that neither owns nor writes the cited precondition key, wasting the active session while leaving the actual decision unresolved. This change makes such hand-backs evidence-based and escalates uncertainty to the user instead of guessing.

## What Changes

- Add a canonical verified-precondition hand-back policy for conversational, off-contract precondition claims.
- Require a hand-back to name the concrete file and key, with the authoring surface having read both and confirmed that the destination command actually writes the cited key.
- Escalate to the user with a question when any verification check cannot be satisfied, using the existing question-content contract.
- Reference the policy unconditionally from every routed command card (`coordinator.md`, `worker.md`, and `invocation.md`) and every utility command card (`body.md`) under `sai/commands/`.
- Preserve every existing written STOP literal and its current behavior; do not add a happy-path gate, alter an approval gate, or implement bounded worker recovery.

## Capabilities

### New Capabilities

- `verified-precondition-handback`: Prevents unsupported precondition redirects and provides a user-question fallback when their evidence is incomplete.

### Modified Capabilities

- None.

## Impact

- `sai/policies/verified-precondition-handback.md` — new canonical conversational-behavior policy.
- Every routed command card (`coordinator.md`, `worker.md`, and `invocation.md`) and every utility command card (`body.md`) under `sai/commands/` — each carries the policy reference unconditionally; non-card policy files, templates, and project-local skill files are excluded from the reference location, while command-local `instructions.md` content loaded by a referencing card remains governed by the policy, and existing fixed STOP text remains unchanged.
- `GLOSSARY.md` — documents the resolved Verified Precondition Hand-back term.

No application source, dependency, OpenSpec artifact schema, worker lifecycle payload, approval workflow, or bounded recovery behavior changes.

## Proposal Research Documentation

**Local files**: `sai/commands/design/instructions.md:1-18,38`; `sai/commands/apply/body.md:9-17`; `sai/commands/accessibility/instructions.md:15-35`; `sai/policies/remember.md:1-13`; `sai/policies/question-context.md:1-33`; `sai/policies/change-picker.md:1-31`; `sai/command-runner.md:1-107`; `sai/worker-core.md:1-113`; `sai/change-overview.md:1-90`; `openspec/specs/orchestration-core/spec.md`; `openspec/specs/worker-lifecycle-protocol/spec.md`; `openspec/specs/question-context-policy/spec.md`; `openspec/specs/halt-message-fidelity/spec.md`; `openspec/changes/archive/2026-08-14-bounded-worker-recovery/proposal.md`; `openspec/changes/archive/2026-08-14-bounded-worker-recovery/design.md:157-160`; `GLOSSARY.md`.

**External URLs**: None.


## Additional Notes

The existing design approval gate owns and writes `approval.specs.approved_at`; `/sai-1-spec` does not. The existing design hand-back at `sai/commands/design/instructions.md:38` is contract-authored and is outside this policy's improvised-hand-back scope. The requested Spanish overview language belongs to the later design-owned Change Overview generation and does not change the English language of this proposal or its specs.
