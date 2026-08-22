# ADR 0172b: Backfill inputs always ask when data is absent; fast-track only omits gates

## Status

Accepted

## Context

Designing the unattended backfill initially conflated two axes: what the `--fast-track` flag skips and what an agent supplies as data. A first draft halted fast-track runs whose envelope lacked a diff-source token, reasoning that unattended automation must never hang on a picker. That punished human fast-track users by forcing them to rewrite the whole invocation over one forgotten token.

## Decision

Missing invocation inputs always restore their normal ask channel — diff source, intent, and any interview question left unresolved by the crystallized-block chain — identically with and without `--fast-track`, because a human may be present. The flag governs only its fixed gate set: reconciliation questions, the spec-conflict decision, and name confirmation. An orchestrating agent avoids asks by supplying complete data, not by demanding halt semantics; if it forgets, the question returns through `needs_input` to its dispatcher, failing loudly exactly one layer up where the contract violation belongs.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Halt under fast-track on any missing input | Strictly non-interactive runs | Humans pay the halt price; agents get an opaque stop instead of an actionable question |
| Skip questions whenever the prompt looks machine-composed | Zero-config automation | Implicit magic keyed on caller identity; unauditable and surprising |
| Inputs ask when absent; flag omits only named gates (chosen) | One uniform rule, human-friendly, auditable opt-out set | Agent misuse surfaces one round-trip later, at the dispatcher |

## Consequences

- Fast-track remains usable interactively; scenario parity holds because data presence, not flags, eliminates input asks.
- The unattended goal stays framed as branched-by-data completeness: a complete envelope yields zero `needs_input` results.
- Every retained or restored ask keeps its existing channel and wording; nothing new is invented for the missing-data path.
- Future commands adding fast-track should reuse this input/gate separation instead of inventing per-flag halts.

## Provenance

user — the reviewer rejected the halt-based draft twice ("le tiene que preguntar"), fixing both the diff-source rule and the missing-field chain as ask-first.
