**Complexity**: high (5 modified capabilities, no breaking change)

## Why

`/sai-4-apply` workers are evaluated against dispatch-specific file scopes that the coordinator derives but does not provide to them, making otherwise underspecified writes appear as scope violations. Workers also have no declared scratch location, so temporary scaffolding survives into coordinator verification and triggers avoidable human halts.

## What Changes

- Inject the dispatch-kind-specific allowed-file set into every Step-execution worker prompt without exposing coordinator-only baseline or recovery evidence.
- Declare `.tmp/{change-name}/` as the only worker scratch location, require clean-return self-cleanup, and add an unconditional-on-clean-return coordinator backstop sweep before post-dispatch path comparison.
- Preserve scope-drift halts and preserve scratch evidence after STOP, failure, or crash outcomes.
- Exclude scratch paths from Subagent Report field 8 so pre-commit add-lists never stage them.
- Do not add a dispatch kind, report field, installer projection, `.gitignore` entry, or plan-generation rule.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `apply-step-delegation`: provide each dispatch with its kind-specific allowed-file set and declared scratch-location rules.
- `apply-coordinator-verification`: share only the plan-derived scope list, sweep clean-return scratch before path comparison, and keep scope drift subject to human intervention.
- `apply-subagent-report-contract`: exclude declared scratch paths from field 8 (`Files modified`).
- `apply-pre-commit-file-report`: treat an explicitly present empty field 8 as a valid empty add-list while continuing to reject an omitted field 8.
- `sai-fast-track-flag`: keep the preserved-scratch acknowledgement outside `/sai-4-apply --fast-track`'s fixed opt-out set.

## Impact

- `sai/instructions/apply.md`: worker prompt assembly, per-dispatch scratch cleanup, coordinator path comparison, and field-8 reporting rules.
- `openspec/specs/apply-step-delegation/spec.md`: canonical capability delta after archival.
- `openspec/specs/apply-coordinator-verification/spec.md`: canonical capability delta after archival.
- `openspec/specs/apply-subagent-report-contract/spec.md`: canonical capability delta after archival.
- `openspec/specs/apply-pre-commit-file-report/spec.md`: canonical capability delta after archival.
- `openspec/specs/sai-fast-track-flag/spec.md`: canonical fast-track guardrail delta after archival.

No application source, installer surface, dependency, or `.gitignore` is changed.

## Proposal Research Documentation

**Local files**:

- `sai/instructions/apply.md`
- `openspec/specs/apply-step-delegation/spec.md`
- `openspec/specs/apply-coordinator-verification/spec.md`
- `openspec/specs/apply-subagent-report-contract/spec.md`
- `openspec/specs/apply-pre-commit-file-report/spec.md`
- `openspec/specs/sai-fast-track-flag/spec.md`
- `GLOSSARY.md`
- `openspec/config.yaml`
- `openspec/schemas/sai-workflow/schema.yaml`

**External URLs**: None

## Additional Notes

- The allowed-file set is plan-derived and safe to share; the pre-dispatch baseline and recovery assessment remain coordinator-only to preserve independent verification.
- `.tmp/{change-name}/` is computed from the coordinator's change-name argument, is separate from the allowed-file set, and is swept per dispatch rather than per Step so split-routed dispatches cannot communicate through surviving scratch.
- The sweep is location-based cleanup of the declared worker-owned path, not judgement over arbitrary files and not Known-False Report Recovery. It runs only after a clean return; non-clean outcomes preserve evidence for human inspection.
- Preserved evidence must be inspected or consumed by a human before another dispatch for the same change begins. A newly created empty `.tmp/` parent is removed after its per-change directory is swept; a pre-existing or non-empty parent is left untouched.
- The preserved-scratch acknowledgement is a separate safety gate, not Human Verification or commit authorization: `--fast-track` neither defers nor auto-confirms it, and one explicit acknowledgement is required per preserved-scratch episode. The worker never removes the `.tmp/` parent.
- The existing Subagent <-> git cross-check remains authoritative for scope drift. Field 8 becomes partly corroborative because the worker receives the expected list, while git status remains the ground truth.
- Field 8 remains mandatory, but an explicitly present empty list is valid when a dispatch changed no non-scratch files; only an omitted field 8 is malformed, so scratch-only clean dispatches do not halt at the pre-commit report.
