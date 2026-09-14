# ADR 0184: Budget-explorer resolver lives behind canonical skills with per-harness bindings

<!-- adr-index: amends 0001 -->

## Status

Accepted

## Context

ADR 0001 shipped `explorer.claude.md` and `explorer.opencode.md` as independent per-harness files so neither harness loads the other's body and model identifiers never cross-contaminate the rules. That separation principle still holds, but the two filenames no longer exist anywhere in the repository: no `*explorer.claude*` or `*explorer.opencode*` file remains under `sai/`, and the resolver capability has moved twice since — first into the budget skill family, then behind the canonical behavior policies.

The current homes are: behavior contracts in `skills/claude/budget-explorer/SKILL.md` and `skills/opencode/budget-explorer/SKILL.md` (ADR 0131, ADR 0128), model and effort/variant tunables in the managed agent files (`agents/claude/budget-explorer.md`, with the opencode `explore` agent binding resolving its model from frontmatter), and the pinned capability surface in `openspec/specs/budget-explorer-*/spec.md` plus `explorer-discovery` and `explorer-research-capability`. A reader following ADR 0001's Decision literally goes looking for files that are gone.

## Decision

Amend ADR 0001 (do not rewrite it — it stays historically accurate):

1. The per-harness separation principle from ADR 0001 stays in force unchanged: each harness loads only its own resolver body.
2. The canonical homes of the cheap-research resolver are the budget-explorer skills plus the harness agent bindings named above — not the retired `explorer.claude.md` / `explorer.opencode.md` filenames.
3. The old filenames are retired vocabulary. References to them resolve to the canonical bindings in (2). Do not reintroduce files under the old names.
4. Future resolver relocations amend this record (0184), never ADR 0001.

## Alternatives Considered

- **Rewrite ADR 0001 in place with the new paths** — rejected: decision records are historical; editing 0001 would falsify what was decided when it was written.
- **Supersede ADR 0001** — rejected: supersession would move a still-valid principle into the historical section and hide it. The principle is not replaced, only its file addresses changed, so an amendment keeps it visible with corrected pointers.
- **Leave the drift** — rejected: literal readers land on missing files, and each new reader pays the same discovery cost this record exists to eliminate.

## Consequences

- ADR 0001 remains active as the separation principle; this record (0184) is the filename authority. Readers who need the why start at 0001; readers who need the where land here.
- The next resolver move touches 0184's Decision list, leaving both 0001 and this amendment intact as history.

## Related

- ADR 0001 — the amended separation principle; its Context and Alternatives stay valid, only its Decision filenames are retired.
- ADR 0131 — budget skills stay behind canonical behavior policies, which this resolver reuses.
- ADR 0132 — executor reconciliation at the canonical Fetch boundary, the sibling binding pattern.
- ADR 0128 — generic OpenCode behavior behind Fetch wrappers, same canonicalization motive.
- `openspec/specs/budget-explorer-subagent-binding/spec.md`, `openspec/specs/explorer-discovery/spec.md`, `openspec/specs/explorer-research-capability/spec.md` — the current pinned contract.
- `skills/claude/budget-explorer/SKILL.md`, `skills/opencode/budget-explorer/SKILL.md` — the canonical behavior homes.
