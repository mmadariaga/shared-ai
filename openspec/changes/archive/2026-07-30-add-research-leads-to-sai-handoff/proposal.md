**Complexity**: medium

## Why

The `Ready to Propose` handoff currently carries useful file-grounded context only as optional inline provenance in intent fields, making it easy for `/sai-1-spec` to overlook the most relevant starting points or repeat the same discovery work. An explicit, non-authoritative `Research Leads` section makes those starting points visible while preserving independent validation and broader research.

## What Changes

- Add a dedicated `Research Leads` section to single-change `sai-explore` crystallization output.
- Emit concise repository-relative paths or `path:start-end` references with short relevance notes when the explore conversation identifies useful research starting points.
- Update `sai-1-spec` research guidance to validate each lead, follow related code and documentation, and continue open-ended research beyond the listed paths.
- Treat stale, renamed, contradictory, or insufficient leads as neutral research input: continue from scratch or expand the investigation without halting.
- Keep research leads separate from implementation targeting; do not add a target-file or files-to-modify field.
- Preserve consistent behavior across Claude Code, opencode, and GitHub Copilot through the shared instruction files.

## Capabilities

### New Capabilities


### Modified Capabilities

- `explore-crystallization-block`: add a dedicated non-target `Research Leads` section to single-change handoffs.
- `spec-research-consumption`: consume research leads as validated starting points while retaining independent, open-ended research and neutral stale-lead fallback.

## Impact

- `sai/instructions/explore.md`: single-change `Ready to Propose` handoff structure and crystallization guidance.
- `sai/instructions/spec.propose.md`: `sai-1` Research Guide consumption rules.
- No wrapper, schema, production-code, configuration, or dependency changes are planned.

## Proposal Research Documentation

**Local files**:

- `sai/instructions/explore.md`
- `sai/instructions/spec.propose.md`
- `sai/commands/sai-1-spec.md`
- `commands/claude/sai-explore.md`
- `commands/opencode/sai-explore.md`
- `commands/copilot/sai-explore.prompt.md`
- `commands/claude/sai-1-spec.md`
- `commands/opencode/sai-1-spec.md`
- `commands/copilot/sai-1-spec.prompt.md`
- `openspec/changes/archive/2026-07-24-explore-handoff-evidence-provenance/proposal.md`
- `openspec/changes/archive/2026-07-24-explore-handoff-evidence-provenance/design.md`
- `openspec/changes/archive/2026-07-24-explore-handoff-evidence-provenance/tasks.md`
- `openspec/changes/archive/2026-07-24-explore-handoff-evidence-provenance/specs/explore-crystallization-block/spec.md`
- `openspec/changes/archive/2026-07-24-explore-handoff-evidence-provenance/specs/spec-research-consumption/spec.md`
- `docs/adr/0066-inline-provenance-no-new-field.md`
- `docs/adr/0067-confirm-extend-consumption-framing.md`
- `docs/adr/0068-scope-item-5-defer-sliced.md`
- `openspec/schemas/sai-workflow/schema.yaml`
- `openspec/schemas/sai-workflow/templates/proposal.md`
- `openspec/schemas/sai-workflow/templates/specs.md`
- `README.md`
- `GLOSSARY.md`

**External URLs**: None.

## Additional Notes

- Existing provenance citations remain useful intent evidence; `Research Leads` are a separate, explicit research aid rather than a replacement for provenance or a new implementation scope declaration.
- The section applies to the single-change crystallization format. Sliced-feature per-slice blocks retain their existing format unless a later change explicitly expands that scope.
- The spec phase produces only OpenSpec artifacts; implementation edits are deferred to downstream phases.
