# ADR 0062: Field 9's soft-degradation exemption is stated at two sites

## Status

Accepted

## Context

`subagent-attempt-instrumentation` adds a ninth field (`Attempts per phase`) to the `/sai-4-apply` Subagent Report Contract. Unlike field 8, field 9 is instrumentation: an absent or empty field 9 must never make a report malformed, because instrumentation that can halt the workflow costs more than the data it collects.

The rest of the change follows a single-definition rule — field 9's four keys, closed vocabulary, and binding to fields 3/4 live once, in `## Subagent Report Contract`, and every other site points at them. The exemption is the one rule that does not fit that shape. The coordinator's halt decision is made while reading `### Malformed subagent report`, which is a different reading position from where the field list is learned.

ADR 0026 established the stable fixed-field report shape and stated that "field 8 is required in every report kind". This ADR amends that contract's field count from 8 to 9 while preserving 0026's stability principle intact: the shape stays uniform across dispatch kinds, and field 8 stays hard-required.

## Decision

State the exemption at both sites, and phrase the malformed-report rule so it keys on **field 8 by name** rather than on a generic "missing required field" condition. The rule's own trigger — not a remote exception — is what excludes field 9.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Both sites, malformed rule keyed on field 8 by name (chosen) | The coordinator cannot re-capture field 9 by reading only the halt rule; the field list carries the softness signal where it is learned | Knowingly duplicates one rule, against the change's own single-definition principle |
| Contract section only | Honors the single-definition rule strictly | A generic "missing required field" trigger silently re-captures field 9 at the exact point the halt decision is made |
| Malformed-report rule only | Keeps the halt path correct | A reader learning a nine-item list has no signal that item nine is optional; a coordinator may treat it as mandatory |

## Consequences

- `apply.md` restates the exemption twice; a future DRY-motivated edit that removes either statement reintroduces the halt risk and must be rejected.
- The malformed-report rule's trigger condition is now specific to field 8, so any future soft field inherits the exemption for free.
- ADR 0026's "8 fields" count is superseded; its stable-shape and field-8-required decisions are not.

## Related

- `openspec/changes/subagent-attempt-instrumentation/design.md` — Decision D3
- `openspec/changes/subagent-attempt-instrumentation/specs/apply-subagent-report-contract/spec.md` — "Field 9 degrades softly and never blocks the workflow"
- `docs/adr/0026-stable-eight-field-report.md` — field count amended by this change
- `sai/instructions/apply.md` — `## Subagent Report Contract`, `### Malformed subagent report`
