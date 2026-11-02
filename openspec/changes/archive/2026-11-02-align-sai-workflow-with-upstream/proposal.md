> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

The proposal and specs instructions of the sai-workflow schema had diverged from OpenSpec's upstream `spec-driven` schema, and every SAI phase required at least one non-empty spec file. A change with no spec-level behavior (a pure refactor, tooling, or documentation change) could therefore only block or invent requirements.

## What Changes

- The `proposal` and `specs` instructions in `openspec/schemas/sai-workflow/schema.yaml` now copy the `spec-driven` 1.15.0 text verbatim, each followed by exactly one SAI additions block delimited by `<!-- sai-additions:begin -->` / `<!-- sai-additions:end -->`. The SAI-only proposal sections (Proposal Research Documentation, Request Additional Notes, Additional Notes) and the no-fenced-code rule moved into those blocks.
- A verbatim snapshot of the upstream schema is stored as the test fixture `test/fixtures/spec-driven-1.15.0.schema.yaml`, and `test/schema-upstream-drift.test.js` compares the non-SAI part of both instructions with it, names the first diverging section, ignores edits inside the SAI additions block, and checks that the copied text cites only `openspec` subcommands and options that exist in CLI 1.13.0. No CLI version check is added.
- The Ready to Propose block gains the optional no-specs field `**Specs**: none — <reason>`, placed right after `**Why**`. The strict and dispatchable profiles of `sai/tools/ready-to-propose.js` reject any other value and an empty reason.
- A block with the no-specs field leads to OpenSpec's `skip_specs: true` marker in `.openspec.yaml`, and every phase honors it: `/sai-1-spec` writes only `proposal.md` and lists no capability; `/sai-2-design` starts, designs from the proposal, skips the delta-header check, and writes no specs approval key; `interfaces.md` assertions anchor to proposal statements; `/sai-3-implement`, the `/sai-deep-review` fix tail, and `/sai-plan` accept the change; `/sai-archive` treats skipped specs as satisfied and syncs no delta; backfill (including Direct Build) drafts only `.openspec.yaml` with `skip_specs: true` and `proposal.md`.
- Files already under `specs/` win over the no-specs field, and without the field no phase sets `skip_specs` on its own judgment.
- `sai/tools/validate-backfill-drafts.js` accepts a draft set with no capability spec only when its `.openspec.yaml` declares `skip_specs: true`, and rejects a set that declares the marker and still carries a spec.
- `sai/tools/status.js` shows a skipped specs artifact as `skipped` in the single-change panel and the bulk table, treats it as satisfied in the `Next:` hint, and documents the cell in the bulk legend.
- Scope drift (not an implementation error): `sai/tools/status.js` identifies artifacts by the `id` field that `openspec status --json` emits in CLI 1.13.0, falling back to `name`. The selected diff evidences this behavior, but the supplied intent statement did not name it.

## Capabilities

### New Capabilities

- `no-specs-changes`: a change whose Ready to Propose block declares `**Specs**: none — <reason>` carries `skip_specs: true` and passes the spec, design, implement, deep-review, plan, archive, and backfill phases with no spec file.

### Modified Capabilities

- `sai-workflow-schema`: the proposal and specs instructions copy the upstream `spec-driven` 1.15.0 text with one delimited SAI additions block, guarded by a drift test.
- `specs-approval-gate`: `/sai-2-design` starts a change that declares `skip_specs: true` without a spec file and writes no specs approval key for it.
- `pre-write-backfill-validation`: the shared validator accepts a draft set without a capability spec only when its metadata declares `skip_specs: true`.
- `sai-status-progress-panel`: the specs cell shows `skipped` for a change that declares `skip_specs`, and the `Next:` hint treats it as satisfied.
- `bulk-status-table`: rows show the `skipped` specs cell, read artifacts by `id`, and the legend explains the cell.
- `shared-step-contract-section-format`: under `skip_specs`, test assertions anchor to `proposal.md` statements.

## Impact

New files:

- `test/fixtures/spec-driven-1.15.0.schema.yaml`
- `test/no-specs-change.test.js`
- `test/schema-upstream-drift.test.js`

Modified files:

- `openspec/schemas/sai-workflow/schema.yaml`
- `sai/commands/archive/coordinator.md`
- `sai/commands/archive/instructions.md`
- `sai/commands/backfill/coordinator.md`
- `sai/commands/backfill/instructions.md`
- `sai/commands/deep-review/coordinator.md`
- `sai/commands/design/coordinator.md`
- `sai/commands/design/steps/design.md`
- `sai/commands/design/steps/interfaces.md`
- `sai/commands/design/steps/research.md`
- `sai/commands/design/steps/tasks.md`
- `sai/commands/design/worker.md`
- `sai/commands/explore/direct-build-coordinator.md`
- `sai/commands/implement/coordinator.md`
- `sai/commands/implement/steps/red-step.md`
- `sai/commands/plan/coordinator.md`
- `sai/commands/spec/coordinator.md`
- `sai/commands/spec/steps/common.md`
- `sai/commands/spec/steps/proposal.md`
- `sai/commands/spec/steps/specs.md`
- `sai/commands/spec/worker.md`
- `sai/policies/ready-to-propose-format.md`
- `sai/policies/step-contract-format.md`
- `sai/tools/ready-to-propose.js`
- `sai/tools/status.js`
- `sai/tools/validate-backfill-drafts.js`
- `test/validate-backfill-drafts.test.js`

Known limitations: moving to a newer upstream version needs a manual snapshot update and a diff review; the block format and its validator gain a field; the change crosses several phase contracts.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill
