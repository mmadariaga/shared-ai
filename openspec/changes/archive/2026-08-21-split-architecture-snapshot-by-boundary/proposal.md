**Complexity**: medium (1 capability, 8 requirements, 6 impacted files; no breaking change)

## Why

`design.md` currently presents externally consumed surfaces and internally public surfaces as one undifferentiated Architecture Snapshot inventory, making the uncontrolled-caller promise and its higher blast radius harder to review first. Splitting the inventory by boundary will put the outside-facing contract before the lower-risk internal public surface while preserving the existing Target State shape and derivative boundaries.

## What Changes

- Replace the undifferentiated Architecture Snapshot inventory with two ordered blocks inside the existing `### Architecture Snapshot` subsection: external surfaces first, then internal public surfaces.
- Widen the snapshot inventory rule to cover externally consumable typed commands, produced artifact formats, installed file layout, and other public surfaces, while retaining public classes, interfaces, and methods where applicable.
- Define one shared Architecture Snapshot emptiness sentence for an entirely empty inventory; define separate empty-block rendering when only one boundary has no entries, without reusing the shared sentence and without coupling it to the File Manifest sentinel.
- Default an unclear surface classification to external so the higher-blast-radius review is not hidden.
- Permit internal structure within `### Architecture Snapshot` while retaining exactly two `###` subsections under `## Target State`: Architecture Snapshot followed by File Manifest.
- Retarget live authority pointers and structure checks to the split snapshot contract while preserving the retired Endpoint Map's absence as a forward-looking authoring rule: endpoint-like promises are classified as external surfaces, and no separate Endpoint Map block or announcement is authored.
- State that derived `change-overview.md` rendering preserves the external-first/internal-second division where the architecture snapshot is projected.
- Preserve the rule that existing design documents are not rewritten by this change and that the derivative snapshot does not replace per-step contracts in `interfaces.md`.

## Capabilities

### New Capabilities

<!-- No new capability is introduced. -->

### Modified Capabilities

- `design-target-state`: refine Architecture Snapshot boundary classification, ordering, emptiness behavior, Target State subsection structure, endpoint-map non-reintroduction, derived overview rendering, and boundary terminology.

## Impact

- `sai/commands/design/instructions.md` — live Target State and Architecture Snapshot authoring rules.
- `openspec/specs/design-target-state/spec.md` — normative snapshot and Target State requirements.
- `sai/commands/design/change-overview.md` — derived architecture rendering contract.
- `test/change-overview-contract.test.js` — overview and endpoint-map contract assertions.
- `test/design-coordinator-worker.test.js` — duplicated design structure assertions.
- `GLOSSARY.md` — Architecture Snapshot and boundary terminology.

## Proposal Research Documentation

**Local files**: `sai/commands/design/instructions.md`; `sai/commands/design/change-overview.md`; `sai/commands/design/worker.md`; `openspec/specs/design-target-state/spec.md`; `openspec/specs/design-interfaces-artifact/spec.md`; `openspec/specs/change-overview-artifact/spec.md`; `openspec/specs/change-overview-synchronization/spec.md`; `openspec/specs/sai-workflow-schema/spec.md`; `openspec/schemas/sai-workflow/templates/design.md`; `openspec/schemas/sai-workflow/templates/change-overview.md`; `openspec/schemas/sai-workflow/schema.yaml`; `test/change-overview-contract.test.js`; `test/design-coordinator-worker.test.js`; `GLOSSARY.md`; `docs/adr/0167a-design-tasks-interfaces-templates-are-structural-skeletons.md`.

**External URLs**: None.

## Additional Notes

- The existing `### Architecture Snapshot` heading remains the stable anchor; the two boundary blocks are nested content, not new Target State siblings.
- The schema templates remain structural skeletons with their existing direct headings; command-owned instructions define the nested boundary blocks and derived overview rendering, so the templates are not expanded with those nested headings.
- The shared snapshot emptiness sentence remains independent from `None — no files affected`, the File Manifest sentinel.
- Existing design documents are intentionally not rewritten. The change specifies future authoring and derived rendering behavior only.
