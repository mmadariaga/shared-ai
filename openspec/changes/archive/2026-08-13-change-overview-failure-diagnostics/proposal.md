**Complexity**: high

## Why

Overview generation failures currently close with an empty `contradiction_details` field for non-contradiction failures, and a failed first materialization writes no durable diagnostic record. This change makes every generator- and parent-owned failure explainable, persistently recorded, and surfaced to the user without weakening the closed five-field contract.

## What Changes

- **BREAKING** Rename the fifth generator result-envelope field from `contradiction_details` to `failure_details` while retaining exactly five mandatory fields.
- Require non-empty `failure_details` on every `status: failed` result, including validation, generation, dispatch, malformed-envelope, and empty-envelope paths; keep it empty only on success.
- Require the parent design worker to author diagnostics for dispatch and malformed/empty-envelope failures, including the offending value or missing field where applicable.
- Extend durable failure-record writing to failed first materialization and carry `failure_details` for every failure kind, while preserving generator-only ownership of `change-overview.md`.
- Persist parent-authored diagnostics in the explicitly scoped `overview.failure_details` key alongside `overview.state`, so dispatch, process-loss, and malformed-envelope failures survive the chat session.
- Persist the corresponding failure classification in `overview.failure_kind` so read-only consumers can report parent-owned failures without inspecting conversation history.
- Update the workflow schema's embedded generation-contract enumeration from `contradiction_details` to `failure_details`.
- Surface the persisted diagnostic to the user at the point of design-worker failure and name it in read-only overview availability/integrity reports.
- Keep Claude Code and opencode behavior and installation projections mirrored.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `change-overview-generation-routing`: replace the contradiction-specific envelope field with the mandatory, non-empty-on-failure `failure_details` field and define parent-authored diagnostics.
- `change-overview-synchronization`: persist diagnostics for every failure, including failed first materialization, and surface them through the design worker.
- `explore-post-crystallization-review-loop`: include persisted failure diagnostics in non-current overview availability/integrity reports without turning them into findings.

## Impact

The delta capability specs under `openspec/changes/change-overview-failure-diagnostics/specs/` define the contract changes for generation routing, synchronization, and post-crystallization review. Implementation targets are `sai/change-overview.md`, `sai/commands/design/worker.md`, `sai/commands/explore/instructions.md`, the embedded envelope enumeration in `openspec/schemas/sai-workflow/schema.yaml`, and `test/change-overview-contract.test.js`. The corresponding main specs under `openspec/specs/` are synchronized from the delta specs at archive rather than modified by this implementation. The shared instruction remains projected to both harnesses through `sai/install-manifest.json` without a new projection or dependency.

## Proposal Research Documentation

**Local files**: baseline references `openspec/specs/change-overview-generation-routing/spec.md`, `openspec/specs/change-overview-synchronization/spec.md`, and `openspec/specs/explore-post-crystallization-review-loop/spec.md` (synchronized from delta specs at archive, not implementation targets); implementation references `openspec/schemas/sai-workflow/schema.yaml`, `sai/change-overview.md`, `sai/commands/design/worker.md`, `sai/commands/design/coordinator.md`, `sai/commands/explore/instructions.md`, `test/change-overview-contract.test.js`, `sai/install-manifest.json`, and `GLOSSARY.md`

**External URLs**: None

## Additional Notes

- The envelope remains closed at exactly five fields; no sixth field is introduced.
- The generator still writes only `openspec/changes/{change-name}/change-overview.md`; the parent never writes that file.
- A failed first materialization now writes a failure record through the generator, reports the overview path in `changed_files`, and persists `overview.state: failed`.
- Parent-owned failures persist their exact diagnostic and classification in `.openspec.yaml` as `overview.failure_details` and `overview.failure_kind`; both keys are cleared at the start of every new generation attempt and on successful materialization, so a stale or materializing state never reuses an older attempt's diagnostic.
- `failure_details` is diagnostic output and remains English regardless of `overview_language`.
- Source-coherence pre-gate verification, overview section structure, new phases, and worker lifecycle behavior are out of scope.
