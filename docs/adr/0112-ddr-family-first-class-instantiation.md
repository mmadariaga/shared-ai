# ADR 0112: DDR is instantiated as a first-class family with the five per-index bindings

## Status

Accepted

## Context

The abstract decision-record-index surface (`decision-record-index-machinery`, ADR 0110) parameterizes every concrete index along three per-index axes (storage directory, index filename, index H1) plus two type-specific section headings, and explicitly deferred the DDR family as the next slice. The corpus already contained 20 hand-produced DDRs under `docs/ddr/` with a hand-produced `0000-INDEX.md`, so the family existed without a first-class instantiation of the abstract surface.

## Decision

The DDR family binds the abstract surface exactly as the ADR family does: storage directory `docs/ddr/`, index filename `0000-INDEX.md`, index H1 `# DDR Index`, correction-table heading `## DDRs that extend or correct prior ones`, historical-section heading `## Superseded DDRs (historical)`. The `<domain unit>` noun is NOT a binding: the cold build derives it from the abstract surface's mapping list (in this repository: `command`, matching the live hand-produced DDR index's `## By command`).

## Alternatives Considered

- **Alternative DDR headings** (e.g. "DDR corrections") — rejected: would break the abstract surface's canonical skeleton positions and the parity-guard contract with the ADR instance.
- **A single parameterized template** — rejected: sibling instances with an automated parity guard (this change's `test/index-template-parity.test.js`) keep each family explicit and divergence detection deterministic.

## Consequences

Once DDRs and their index exist under the bound names, rebinding the directory, filename, or headings means corpus-wide rewrites — hard to reverse. The instantiation mirrors the ADR bindings per the abstract surface's instantiation pattern; it is an instantiation/mechanism choice about layout and vocabulary, not a domain invariant, which is why this record is an ADR.

## Provenance

Derived — the bindings were derived from the abstract surface's instantiation pattern (mirror the ADR bindings); the proposal records the result, the user did not state the bindings.
