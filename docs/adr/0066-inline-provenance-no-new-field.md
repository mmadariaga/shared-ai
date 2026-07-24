# ADR 0066: Provenance as inline citations on existing Why / Decisions & Rationale fields — no new field

## Status

Accepted

## Context

`sai-explore` crystallizes a hypothesis into a `Ready to Propose` block consumed by `sai-1-spec`. The block's **Why** and **Decisions & Rationale** fields carry intent, but when the hypothesis was grounded in specific files during the explore conversation, that grounding is lost at the context boundary.

## Decision

Record provenance as optional inline `file:line` or `path:startLine-endLine` citations attached to the **Why** and **Decisions & Rationale** fields, not as a new dedicated block field.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Inline citations on existing fields (chosen) | Preserves the block's intent-only invariant; no fixed-field churn; a citation for WHY is still WHY | Slightly more free-form within field values; no single labeled provenance surface |
| New `**Provenance**`/`**Evidence**` block field | A dedicated, discoverable surface | Blurs the intent-only boundary; risks being read as an implementation-target list; expands the fixed field set that item 6 and item 8 depend on |

## Consequences

- The block's 9-field shape is unchanged; item 6 per-slice blocks and item 8 language-gate scaffolding stay stable.
- Provenance is genuinely optional: fields render exactly as today when there is nothing to cite.

## Related

- `openspec/changes/explore-handoff-evidence-provenance/design.md` — Decision D1
- `openspec/changes/explore-handoff-evidence-provenance/specs/explore-crystallization-block/spec.md`
- `sai/instructions/explore.md` — item 5, item 8
