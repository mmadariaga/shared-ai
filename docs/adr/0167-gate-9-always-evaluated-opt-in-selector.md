# ADR 0167: Gate 9 is an always-evaluated opt-in selector with explicit None

## Status

Accepted

## Context

The overview-language decision belongs to the explore crystallization handoff when the user has not supplied an explicit `--overview-lang` value. The former gate could recommend the ambient language, skip for English, or fall back to ambient-language memory, which made omission behave like an implicit generation request. The handoff must instead record whether the user chose a language or explicitly chose not to create an overview, while preserving the existing crystallization language gate and its ordering.

## Decision

Gate 9 runs on every explicit crystallization request after gate 8 and before any `Ready to Propose` block, unless an explicit `--overview-lang <language>` already supplies the answer. It is an opt-in selector with do-not-create first and no `Recommended` marker. For English or undetermined ambient language it presents two options: do not create, then the literal `English`. For a non-English ambient language it presents three options: do not create, `English`, then the ambient-language endonym. A decline or non-committal answer resolves to the literal `None`, never to an ambient-language fallback. Fast-track asks no gate-9 question: an explicit flag remains the selected language, while omission resolves to `None`. Every crystallization block records `**Overview language**: <language|None>` without localizing the scaffold label or the `None` marker.

## Alternatives Considered

- **Keep the ambient language first and recommended** — rejected; recommendation makes omission look like consent to create.
- **Skip gate 9 for English crystallization turns** — rejected; the opt-in selector must be consistently evaluated whenever the flag is absent.
- **Use the remember-policy ambient fallback for decline or uncertainty** — rejected; a decline means do not create and uncertainty must still present the two-option selector.
- **Hide the decision from the crystallization block** — rejected; the Auto handoff needs an explicit conversation-only record of language or `None`.

## Consequences

- Gate 9 is deterministic, explicit, and separate from gate 8 while retaining gate 8's ordering and fast-track boundaries.
- A user can select `None` without creating a later generation request; a language selection is repeated exactly in each block and can be forwarded only by the active supervised Auto chain.
- Explicit language flags suppress the question and preserve their exact value.
- The explore flow gains no persistent preference and no new lifecycle payload field.

## Related content

- `openspec/changes/opt-in-change-overview/specs/explore-overview-language-gate/spec.md`
- `openspec/changes/opt-in-change-overview/specs/explore-crystallization-block/spec.md`
- `openspec/changes/opt-in-change-overview/specs/supervised-pipeline-forwarding/spec.md`
- `sai/commands/explore/instructions.md`
- ADR 0146 — A two-option crystallization-close selector replaces the literal `start-pipeline` token
