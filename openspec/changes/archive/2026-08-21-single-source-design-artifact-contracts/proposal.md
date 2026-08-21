**Complexity**: medium (6 affected source paths, no generated-artifact behavior changes)

## Why

The sai-workflow schema repeats the generation contract for `design.md`, `tasks.md`, and `interfaces.md` even though `sai/commands/design/instructions.md` is the only surface used during generation. The duplicated schema prose and templates have drifted, including a dead `Endpoint Map` promise that no generated design artifact contains, so the unused copies should become informative pointers and structural skeletons.

## What Changes

- Replace the schema `instruction:` blocks for the design, tasks, and interfaces artifacts with non-empty pointers to the corresponding sections of `sai/commands/design/instructions.md`.
- Reduce the three schema templates to heading-preserving skeletons, retaining concise non-normative field comments and a write-time-authority pointer without duplicating generation rules.
- Remove the dead `## Endpoint Map` block from the design template and remove the schema description text that still advertises it.
- Retarget the no-step-contracts, Target State, snapshot, and file-manifest test assertions from the reduced schema/template copies to the existing command-owned source, without changing normative ownership or generated-artifact behavior.
- Leave proposal/spec artifacts, consumed schema fields, the unsplit command instruction's document structure, and deferred instruction loading unchanged.

## Capabilities

### New Capabilities

<!-- No new capability is introduced. -->

### Modified Capabilities

- **sai-workflow-schema**: make the command-owned design instruction the sole write-time authority for the design, tasks, and interfaces formatting contracts while keeping the schema and templates as informative projections.

## Impact

- `openspec/schemas/sai-workflow/schema.yaml` — reduce the three instruction blocks and correct the stale design description.
- `openspec/schemas/sai-workflow/templates/design.md` — retain the live headings as a skeleton and remove the dead Endpoint Map block.
- `openspec/schemas/sai-workflow/templates/tasks.md` — retain headings as a skeleton.
- `openspec/schemas/sai-workflow/templates/interfaces.md` — retain headings as a skeleton.
- `test/change-overview-contract.test.js` — assert the relevant contract on the command-owned instruction.
- `test/design-coordinator-worker.test.js` — assert the relevant contract on the command-owned instruction.

## Proposal Research Documentation

**Local files**: `openspec/schemas/sai-workflow/schema.yaml`; `openspec/schemas/sai-workflow/templates/design.md`; `openspec/schemas/sai-workflow/templates/tasks.md`; `openspec/schemas/sai-workflow/templates/interfaces.md`; `openspec/schemas/sai-workflow/templates/change-overview.md`; `sai/commands/design/instructions.md`; `sai/commands/design/change-overview.md`; `openspec/specs/sai-workflow-schema/spec.md`; `openspec/specs/design-target-state/spec.md`; `test/change-overview-contract.test.js`; `test/design-coordinator-worker.test.js`; `openspec/config.yaml`; `GLOSSARY.md`.

**External URLs**: None.

## Additional Notes

- The pointer names the existing command file and its specific authoring section; the command instruction is not split, restructured, or edited by this change.
- Template reductions are structural only. Concise comments may identify retained fields, but the command instruction remains the live write-time authority for generation details.
- Target State semantics remain owned by the existing design-target-state capability; this change preserves the corresponding template headings without amending that contract.
- The change is documentation/schema/test maintenance, not deferred or lazy loading. It does not modify `proposal.md`, `specs/**`, consumed schema fields (`generates`, `requires`, `apply.requires`, or `apply.tracks`), or production code.
