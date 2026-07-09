# ADR 0023: interfaces.md is an optional soft dependency, not a schema hard requirement

## Status

Accepted

## Context

Slice 1 (`design-interfaces-artifact`) registered `interfaces.md` as an artifact in `openspec/schemas/sai-workflow/schema.yaml` with `requires: [tasks]`. Slice 2 (`consume-interfaces-artifact`) now wires `sai-3-implement` and `sai-4-apply` to consume it. The `implement-respects-interfaces` spec deliberately defines an "interfaces.md is absent" scenario: when no `interfaces.md` exists, `sai-3-implement` behaves as before with no conformance gating. This means consumption is conditional.

## Decision

Keep the dependency *soft* — honored inside the instruction text via an absent-fallback — and do NOT add a hard `requires: [interfaces]` edge to the `implementation` artifact in `schema.yaml`. The `schema.yaml` `implementation` artifact (`requires: [tasks]`) is left unchanged.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Soft in-instruction fallback (chosen) | Preserves backward compatibility for changes that predate `interfaces.md`; keeps `schema.yaml` untouched; matches the spec's explicit absent path | The dependency is invisible to the artifact graph; no automated validation that a consumer change actually has `interfaces.md` |
| Hard schema edge (`requires: [interfaces]`) | Graph explicitly records the dependency; `openspec` could validate presence before running later phases | Contradicts the spec's intentional absent path; would force every change to produce `interfaces.md` even when none is needed; expands scope beyond instruction-file edits |

## Consequences

- `schema.yaml` remains unchanged; the absent-`interfaces.md` path is intentional and documented.
- Backward compatibility is preserved: changes that predate `interfaces.md` continue to work without it.
- The coordinator/human must manually ensure `interfaces.md` is present when a change requires it; the schema does not enforce this.

## Related

- `openspec/changes/consume-interfaces-artifact/design.md` — Decision D1
- `openspec/changes/consume-interfaces-artifact/specs/implement-respects-interfaces/spec.md` — "interfaces.md is absent" scenario
- `openspec/schemas/sai-workflow/schema.yaml` — `implementation` artifact `requires: [tasks]`
