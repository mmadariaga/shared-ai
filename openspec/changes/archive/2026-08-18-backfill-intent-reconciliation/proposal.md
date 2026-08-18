**Complexity**: medium (1 new capability, 10 requirements, 2 affected project files)

## Why

`/sai-backfill` currently reconstructs intent from verified diff evidence alone, so deliberate non-implementation, preserved boundaries, and rejected alternatives disappear. An optional statement of intent lets backfill reconcile what was wanted against what the code proves, turning unmet intent into focused questions without weakening evidence-based artifacts.

## What Changes

- Offer an optional intent-capture phase after the diff is selected and loaded, using the existing two-option picker plus free-text paste channel.
- Reconcile the statement against the diff into matched, stated-but-unevidenced, and evidenced-but-unstated items.
- Ask bounded, targeted follow-up questions for stated-but-unevidenced items; accept only explicit confirmation of deliberate preservation as additional evidence.
- Report evidenced-but-unstated work as scope drift while still describing that work in the generated specs.
- Pass intent capabilities and constraints to the existing conflict-scan subagent when intent is present.
- Record prior-intent provenance and qualify the post-hoc proposal marker only when at least one intent item or rejected-alternative context entry is identified, while preserving the current no-intent path.

## Capabilities

### New Capabilities

- `backfill-intent-reconciliation`: Reconstruct backfill artifacts by reconciling an optional user statement of intent with verified diff evidence while preserving evidence-only normative specs.

### Modified Capabilities

<!-- No existing current capability spec is modified; this change adds the reconciliation capability around the existing backfill flow. -->

## Impact

- `sai/commands/backfill/instructions.md`: intent capture, reconciliation, gap questions, conflict context, evidence rules, and provenance metadata.
- `openspec/changes/backfill-intent-reconciliation/proposal.md`: this change proposal.
- `openspec/changes/backfill-intent-reconciliation/specs/backfill-intent-reconciliation/spec.md`: capability delta requirements.
- **Out of scope**: `design.md`, `tasks.md`, `implementation.md`; `/sai-backfill` remains a spec-and-proposal-only command.

## Proposal Research Documentation

**Local files**:

- `sai/commands/backfill/instructions.md`
- `sai/commands/backfill/body.md`
- `sai/commands/spec/instructions.md`
- `sai/policies/artifact-feedback-gate.md`
- `sai/policies/remember.md`
- `sai/policies/glossary-format.md`
- `openspec/changes/archive/2026-07-08-backfill-conflict-closed-choice/specs/backfill-conflict-detection/spec.md`
- `openspec/changes/archive/2026-05-21-sai-backfill/proposal.md`
- `docs/adr/0007-backfill-diff-source-interactive-selection.md`
- `docs/ddr/0008-backfill-prohibited-design-artifacts.md`
- `GLOSSARY.md`

**External URLs**: None.

## Additional Notes

- The diff remains the verified source of implementation evidence; the statement of intent is context for reconciliation, not interchangeable evidence.
- Intent is accepted as explanatory text only, is never schema-validated or persisted, and does not introduce a file-path input flow.
- The generated-question bound is five individually targeted questions, with any remaining gaps grouped into one overflow question.
- Intent capture uses `Provide intent (Recommended)` and `Continue without intent` as its two declared options; the free-text slot remains the only paste channel.
- With no intent, the existing fixed interview, diff-only conflict scan, metadata, banner, and artifact behavior remain unchanged.
- A run with at least one intent item or rejected-alternative context entry adds `prior_intent: true` to the existing backfill metadata and qualifies the post-hoc proposal marker; candidate text yielding no usable intent context follows the no-intent provenance path and is not stored.
