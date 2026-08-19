# ADR 0151: Composition constructs successor envelopes directly (no boot adapter)

<!-- adr-index: refs 0136; refs 0075; refs 0147 -->

## Status

Accepted

## Context

Harness boot adapters select cards and run shell parse. Re-entering boot to mint a chained apply envelope would re-run card selection and fight Isolation Mode continuity of supervisor state. Apply historically uses a four-field boot envelope while worker dispatch stays two-string; that seam is not being redesigned here.

## Decision

For chained apply, the composition mints `original_envelope` directly in runner state with exactly: `command_name` = apply identity (shape compatibility only; not card selection on the chained path), `wrapper_echo_value` = empty string, `arguments_value` = already-resolved change name, `continuation_reference` absent/empty at segment start. At segment activation the composition also sets the normalized fast-track boolean as session state (not an extra envelope key), rebinds apply adapter fields including parameterized `terminal_navigation`, and continues the shared Result Loop without invoking a harness boot adapter, wrapper, or shell parse. Worker dispatch inside the segment stays the runner's two-string envelope. Resolved change identity is supervisor-retained state, not re-derived from `wrapper_echo_value`.

## Alternatives Considered

- **Re-enter harness boot/wrapper to mint envelopes** — rejected; boot would re-run card selection and shell parse and fight Isolation continuity.
- **Composition-direct envelope mint with session signals outside envelope keys** (chosen) — matches the empty-echo composition pattern and leaves the historical boot-vs-worker envelope seam unchanged.

## Consequences

- Chained apply never re-parses prerequisites, picker, or `--fast-track` tokens.
- Successors are never inferred from worker summary text, artifact contents, or undeclared side channels.
- Standalone wrapper boots keep the existing four-field envelope path.

## Provenance

User — `openspec/changes/chainable-apply-phase-adapter/design.md`, Decision D5.
