**Complexity**: medium

## Why

Twenty-one active capability specs describe model routing, prompt tooling, and agent bindings for the retired Copilot harness, including scenarios that assert behavior of wrappers that no longer exist. The active spec tree must reflect only contracts that the supported harnesses can satisfy, while any still-live rule must remain in its canonical active home.

## What Changes

- Review each of the twenty-one Copilot-scoped capability specs individually rather than moving them by filename pattern alone.
- Move the retired-only specs from `openspec/specs/` to the canonical `openspec/specs/_archived/` landing zone, preserving their historical contents and leaving existing archived specs untouched.
- Relocate or confirm the relocation of any normative rule that remains in force before archiving its former host; in particular, preserve the checkbox-discipline rule in `sai/policies/remember.md`.
- Verify that no candidate remains in the active spec tree and that no live contract is supported only by an archived candidate.

## Capabilities

### New Capabilities

- `copilot-capability-archival`: Retired Copilot-only capability specs leave the active tree and land in the canonical archive.
- `surviving-rule-preservation`: Normative content that remains in force is relocated to, or confirmed in, its live canonical home before the host spec is archived.

### Modified Capabilities

- None.

## Impact

- `openspec/specs/copilot-*/spec.md`
- `openspec/specs/*-copilot-model/spec.md`
- `openspec/specs/skill-copilot-compatibility/spec.md`
- `openspec/specs/_archived/`
- `sai/policies/remember.md` (confirm-only: its existing checkbox-discipline wording remains authoritative) and other canonical active homes identified during per-spec review

## Proposal Research Documentation

**Local files**: `openspec/specs/archive-completed-specs/spec.md`; all twenty-one candidate specs named in the request; `openspec/specs/_archived/copilot-harness-instructions/spec.md`; `sai/policies/remember.md`; `sai/policies/prereqs-paths.md`; `openspec/specs/routed-harness-support/spec.md`; `openspec/specs/orchestration-source-layout/spec.md`; `docs/adr/0103-retire-inline-harness-model-in-favor-of-routed-harnesses.md`; `docs/adr/0104-remove-copilot-from-active-installer-inventory.md`; `README.md`; `AGENTS.md`; `sai/install-manifest.json`.

**External URLs**: None.

## Additional Notes

- The twenty-one candidates are the `copilot-*` specs currently present plus `accessibility-copilot-model`, `design-copilot-model`, `performance-copilot-model`, `review-copilot-model`, `security-copilot-model`, `spec-copilot-model`, and `skill-copilot-compatibility`.
- `openspec/specs/archive-completed-specs/spec.md` establishes `openspec/specs/_archived/` as the canonical landing zone. Archival is terminal; existing `_archived/` contents must not be touched, reorganized, or corrected.
- `copilot-harness-removal/spec.md` is the concrete check that a historical host may contain a rule still in force elsewhere: its checkbox-discipline rule was redistributed to `sai/policies/remember.md`. The review must preserve that live home rather than recreate or bury the rule.
- Deleting the specs outright is rejected because the repository convention preserves retired specs under `_archived/`; a bulk pattern move is rejected because filename matching cannot detect surviving normative content.
