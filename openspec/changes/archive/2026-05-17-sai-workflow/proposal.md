## Why

The shared-AI pipeline uses the generic `spec-driven` OpenSpec schema, which has no knowledge of the pipeline's specific artifact types, templates, or dependencies. As a result: there is no gate between the specs phase and design (the agent can continue straight through without user review), there are no custom templates for `design.md`, `implementation.md`, or the audit artifacts, and the command numbering is inconsistent with the new two-phase spec/design split. The pipeline needs a first-class schema that encodes its structure.

## What Changes

- **BREAKING**: New `sai-workflow` OpenSpec schema created at `openspec/schemas/sai-workflow/` with custom templates for all 9 artifact types.
- **BREAKING**: `openspec/config.yaml` schema changed from `spec-driven` to `sai-workflow`.
- **BREAKING**: Commands renumbered — new `sai-2-design` inserted; previous `sai-2-implement` through `sai-7-accessibility` shift up by one (become `sai-3` through `sai-8`).
- `sai-1-spec` scope narrowed to proposal + specs only (stops before design; prints explicit hand-off message).
- New `sai-2-design` command generates `design.md` + `tasks.md` after verifying specs approval in `.openspec.yaml`.
- Approval gate added between specs and design: `sai-1-spec` stops after specs, records `approval.specs.*` in `.openspec.yaml`; `sai-2-design` checks the gate before proceeding.
- `security.md`, `performance.md`, `accessibility.md` made always-required in the schema (templates include mandatory "Not applicable" section with justification).
- `AGENTS.md` and `README.md` updated for new pipeline diagram, artifact table, and command numbers.
- `opencode/commands/` mirrored for all changes.

## Capabilities

### New Capabilities

- `sai-workflow-schema`: Custom OpenSpec schema encoding the full shared-AI artifact graph — artifact IDs, file paths, dependency edges, apply requirements, specs-approval gate, and templates for all 9 artifact types (proposal, specs, design, tasks, implementation, review, security, performance, accessibility).
- `sai-design-command`: New `sai-2-design` command that generates `design.md` + `tasks.md`, gated on specs approval recorded in `.openspec.yaml`.
- `specs-approval-gate`: Mechanism by which `sai-1-spec` stops after specs are complete and records `approval.specs.approved_at` + `approval.specs.notes` in `.openspec.yaml`; `sai-2-design` verifies this gate before proceeding.

### Modified Capabilities

- `command-wrappers`: All sai-* wrappers updated — `sai-1-spec` narrowed (no longer calls full opsx:propose), new `sai-2-design` added, commands `sai-3` through `sai-8` renumbered from previous `sai-2` through `sai-7`.
- `sai-command-naming`: Command numbering scheme changes to accommodate the new two-phase spec/design split; `sai-commit`, `sai-pr`, `sai-archive`, `sai-explore` unchanged.

## Impact

- `openspec/schemas/sai-workflow/` — new directory (schema.yaml + 9 templates)
- `openspec/config.yaml` — schema field updated
- `claude/commands/sai-1-spec.md` — modified (narrowed scope)
- `claude/commands/sai-2-design.md` — new file
- `claude/commands/sai-3-implement.md` through `sai-8-accessibility.md` — renamed/renumbered from current `sai-2` through `sai-7`
- `opencode/commands/` — mirror of all above
- `AGENTS.md`, `README.md` — pipeline diagram and artifact table updated
- No application code affected; pure prompt/config infrastructure
