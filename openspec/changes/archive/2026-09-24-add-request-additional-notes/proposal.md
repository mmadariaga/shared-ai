> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

Agreements reached during `/sai-explore` that fit no official `Ready to Propose` block field were lost at crystallization. The existing `## Additional Notes` proposal section holds the spec worker's own research findings and received nothing from the block, so user-agreed context had no path into `proposal.md`. The block now carries an optional, non-normative `**Request Additional Notes**` field, and a dedicated `## Request Additional Notes` proposal section receives it verbatim.

## What Changes

- `sai/policies/ready-to-propose-format.md` adds an optional `**Request Additional Notes**` field to the block structure, placed after `**Implementation Details**` and immediately before `**Overview language**`, which stays the last line before `---`. The field is outside the five mandatory sections and is omitted entirely when empty, with no label and no `- None`.
- The same policy's Field rules define the field as free-form, non-normative Markdown (paragraphs or bullets) with these emission rules:
  - emit it only for agreements that fit no other field;
  - never duplicate another field's content, and never emit it empty or as `- None`;
  - binding obligations go to `**Edge Cases**`, `**Implementation Details**`, or `**Key constraints**`;
  - each per-slice block carries only its own slice's notes;
  - `/sai-3-implement`'s escalation block may include the field but need not.
  Consumers derive no requirement, scenario, or mandatory scope from the field. `/sai-1-spec` and backfill copy it verbatim into a dedicated proposal section, kept separate from `## Additional Notes`.
- `openspec/schemas/sai-workflow/templates/proposal.md` adds a `## Request Additional Notes` section immediately before `## Additional Notes`. Its comment states that the section is a verbatim, non-normative copy of the block field and is omitted when the field is absent. `## Additional Notes` stays the last section.
- `openspec/schemas/sai-workflow/schema.yaml` lists **Request Additional Notes** in the proposal artifact's section list as optional, verbatim, and non-normative, right before **Additional Notes**.
- `sai/commands/spec/steps/proposal.md` directs the spec worker to:
  - copy the field byte-for-byte into `## Request Additional Notes`;
  - derive no requirement, scenario, or scope from it;
  - keep its own research findings in `## Additional Notes`;
  - omit the section when the field is absent;
  - keep an existing section intact on a refinement run without a block.
- `sai/commands/backfill/instructions.md` §6b directs backfill to copy the field byte-for-byte from a detected crystallized block into a `## Request Additional Notes` section after `## Impact` and before any `## Additional Notes`. The field feeds no intent record, fixed answer, or requirement, and the section is omitted when the field or block is absent.
- `sai/commands/explore/direct-build-worker.md` directs the Direct Build implementer to read the field, when present, as non-authoritative context in the same way as **Research Leads**. The field adds no scope and no requirement.
- `sai/commands/explore/steps/crystallization-language-gates.md` adds `**Request Additional Notes**` to the bold field labels that stay in English under the crystallization language gate.
- `test/lint-tool.test.js` adds a case showing that `lint.js ready-to-propose` passes a block carrying the field, with both paragraph and bullet content, between `**Implementation Details**` and `**Overview language**`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `shared-crystallization-block-format`: the canonical block format gains the optional, non-normative `**Request Additional Notes**` field, and the "no field is added" rule now permits fields added through a policy change.
- `sai-workflow-schema`: the proposal template and schema description gain an optional `## Request Additional Notes` section before `## Additional Notes`.
- `spec-proposal-worker`: the spec worker copies the field verbatim into its dedicated proposal section and derives nothing normative from it.
- `backfill-unattended-intake`: backfill copies the field verbatim from a detected block into its proposal draft.
- `auto-fast-implement-worker`: the Direct Build implementer reads the field as non-authoritative context.
- `explore-crystallization-language-gate`: the new field label stays English scaffolding.
- `format-linting`: the ready-to-propose check accepts blocks with or without the optional field.

## Impact

Modified files:
- `sai/policies/ready-to-propose-format.md`
- `openspec/schemas/sai-workflow/templates/proposal.md`
- `openspec/schemas/sai-workflow/schema.yaml`
- `sai/commands/spec/steps/proposal.md`
- `sai/commands/backfill/instructions.md`
- `sai/commands/explore/direct-build-worker.md`
- `sai/commands/explore/steps/crystallization-language-gates.md`
- `test/lint-tool.test.js`

New files: none.

Known limitations: notes are not verified by the Direct Build review loop and do not become requirements. The proposal now has two notes sections, and readers must tell them apart: `## Additional Notes` holds what the agent found, and `## Request Additional Notes` holds what was agreed with the user.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill
