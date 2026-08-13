**Complexity**: medium (5 implementation files, no breaking runtime behavior)

## Why

`change-overview.md` is read to approve a change before implementation, but its current ten-section structure projects every detail from five source artifacts and buries approval-relevant information in duplicated audit content. Reorganizing the same source-grounded material into an exact nine-section approval document makes decisions easier to review without changing any authoritative source artifact or downstream implementation input.

## What Changes

- Replace the ten-section overview structure with these exact top-level sections, in order: `Change Proposal`, `Scope`, `Capabilities`, `Target Architecture`, `Key Contracts`, `File Manifest`, `Review Scenarios`, `Implementation Approach`, and `Approval Summary`.
- Remove the overview's `## Target State` projection and its overview-specific admitted-subsection rule. Keep `design.md`'s `## Target State`, `### Architecture Snapshot`, and `### File Manifest` contract unchanged, while updating the supporting `design-target-state` capability's overview-projection wording and requirement references so that contract remains valid.
- Render the design Architecture Snapshot as an adapted, review-oriented `## Target Architecture` section rather than projecting it verbatim.
- Stop reproducing normative requirements, scenarios, and method-level assertions verbatim; retain source-grounded summaries and approval-relevant behavioral contracts sufficient for approval.
- Permit editorial grouping and condensation while continuing to forbid statements, relationships, or conclusions that are absent from the five authoritative sources.
- Move the manifest to the single top-level `## File Manifest` section, where thematic subsections may group file entries and related interface signature blocks, and preserve its tasks-fold-versus-design-manifest contradiction check and `None — no files affected` sentinel.
- Remove the traceability block and gap report from the overview without relocating either behavior.
- Update the schema template and the shared generation contract, revise the contract test to assert the new structure, and synchronize the `design-target-state` capability references.

## Capabilities

### New Capabilities

<!-- None. -->

### Modified Capabilities

- `change-overview-artifact`: redefine the derived overview as an exact approval-oriented nine-section projection while preserving its five sources, single-file write scope, source authority, manifest validation, localization anchors, and exclusion from `apply.requires`.

## Impact

- **Implementation files:** `openspec/schemas/sai-workflow/templates/change-overview.md`, `sai/change-overview.md`, `openspec/specs/change-overview-artifact/spec.md`, `openspec/specs/design-target-state/spec.md`, and `test/change-overview-contract.test.js`.
- **Unchanged contracts:** `design.md`, `tasks.md`, `interfaces.md`, the sai-3 and sai-4 inputs, status, archive, the explore review loop, schema `apply.requires`, and the five-source derivation model.
- No new dependency, API, numbered phase, lifecycle state, or source-of-truth file is introduced.

## Proposal Research Documentation

**Local files:**

- `sai/change-overview.md`
- `openspec/schemas/sai-workflow/templates/change-overview.md`
- `openspec/specs/change-overview-artifact/spec.md`
- `openspec/specs/design-target-state/spec.md`
- `openspec/specs/change-overview-generation-routing/spec.md`
- `openspec/specs/change-overview-synchronization/spec.md`
- `sai/commands/design/instructions.md`
- `test/change-overview-contract.test.js`
- `GLOSSARY.md`

**External URLs:** None.

## Additional Notes

- The overview remains a derived projection generated only from `proposal.md`, `specs/**/*.md`, `design.md`, `tasks.md`, and `interfaces.md`; it never modifies those sources.
- Under `--overview-lang`, section headings and structural literals remain English while eligible free prose may be translated.
- Existing overviews are not migrated; regeneration uses the new structure. Backfilled changes remain exempt from overview generation.
- Interface signatures for files present in the folded target-state manifest remain available in the approval surface under their related `## File Manifest` file entries; signatures for paths that net to no target-state file are not rendered. Unanchored interface assertions, verbatim normative wording, step-level testing-strategy and broken-test detail, and end-to-end traceability/gap reporting are no longer carried there. Reviewers open the authoritative source artifacts when that detail is needed.
