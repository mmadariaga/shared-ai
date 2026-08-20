# DDR 0150: Gate mode is parameterized at the fetch site, never detected from invocation context

<!-- adr-index: amends adr:0028 -->

## Status

Accepted

## Context

The shared artifact feedback gate is the single sequencer for standalone `/sai-1-spec` / `/sai-2-design` and explore Auto item 10. Supervised Auto needs a different proceed path (no picker) while standalone must keep interactive presentation. Choosing how to select that path is a domain constraint: Isolation Mode and declared-not-detected discipline forbid runtime caller detection, so mode cannot be inferred from conversation or harness identity.

This is change `supervised-artifact-gate-suppression`, Decision D1.

## Decision

Add an optional fourth parameter `mode` on the shared gate with closed vocabulary `interactive` | `supervised`. Omission defaults to `interactive` as a bounded exception to the missing-parameter STOP rule; required parameters and invalid non-empty mode values still STOP. Explore item 10 is the only supplier of `supervised`; standalone coordinators omit `mode`.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Parameterize `mode` at the fetch site (chosen) | Explicit, testable in prose, aligned with ADR 0028's three-parameter supply pattern | Parameter contract grows; every fetch site must stay correct |
| Detect explore/Auto from conversation or caller identity | No fetch-site changes | Violates Isolation Mode and declared-not-detected discipline |
| Separate supervised-only gate file | Clear separation | Duplicates sequencer logic; drifts from interactive proceed semantics |
| Remove gate calls under Auto | No picker under Auto | Loses phase sequencing (spec→design; design→overview) |

## Consequences

- Mode is a declared fetch-site fact, never a runtime probe — a permanent pipeline invariant for this gate.
- Standalone coordinators stay interactive by omission; no coordinator edits required for the default path.
- Invalid mode is an authoring-fault STOP, not a normal supervised runtime interruption.

## Related

- `openspec/changes/supervised-artifact-gate-suppression/design.md` — Decision D1
- `openspec/changes/supervised-artifact-gate-suppression/specs/artifact-feedback-gate/spec.md`
- ADR 0028 — three named parameters inline at the fetch site (amended by this fourth optional parameter)
- `sai/policies/artifact-feedback-gate.md`
