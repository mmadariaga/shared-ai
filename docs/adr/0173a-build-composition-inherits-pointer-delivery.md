# ADR 0173a: Build composition inherits pointer delivery with no opt-out special case

<!-- adr-index: refs 0172; refs 0163; refs 0156 -->

## Status

Accepted

## Context

`/sai-build` runs the existing implementation phase adapter as its chained implement segment. The implement coordinator now declares the static optional `step_pointer_map` for its phase, and the map is an adapter field: fully known at dispatch, immutable for the invocation, and carried only in the adapter's continuation behavior. Because build reuses the existing implementation adapter rather than a build-specific card, its chained implement segment inherits pointer delivery unless the composition explicitly special-cases it off.

## Decision

Accept the inheritance with no opt-out special case. `/sai-build`'s chained implement segment rebinds the implement adapter's declared `step_pointer_map` through per-segment adapter-field rebinding and therefore inherits pointer delivery; the inheritance is documented in AGENTS.md's Active experiment note. The existing composition rebinding mechanics are deliberately left untouched.

## Alternatives Considered

- **Special-casing build off the map (opt-out)** — rejected: adds a phase fork and contradicts the composition principle that build reuses existing phase adapters unchanged.
- **Leaving the inheritance undocumented** — rejected: build-composition behavior changes implicitly in its implement segment, so the acceptance and its no-special-case rule are documented in AGENTS.md.

## Consequences

- Build-composition behavior changes implicitly in its implement segment: the `Active step:` pointer travels in the chained segment's progress-event continuations.
- No build-card edit is required; the inheritance is a consequence of the existing per-segment adapter-field rebinding, which this change deliberately leaves untouched (confirmed preservation).
- Refs ADR 0172 (the step-gated mechanism), ADR 0163 (build inherits shared recovery only through the apply phase adapter — the closest build-inheritance precedent), ADR 0156 (build composition owns its segment behavior).

## Related

- ADR 0172 — Step-gated instruction delivery hands each spec step its instructions just-in-time
- ADR 0163 — Build inherits shared recovery only through the apply phase adapter
- ADR 0156 — Build injects apply fast-track unconditionally; composition owns the banner
- `AGENTS.md` — Active experiment note documenting the inheritance
