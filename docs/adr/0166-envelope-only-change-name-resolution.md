# ADR 0166: Envelope-only change-name resolution for shared pickers and four cards

<!-- adr-index: supersedes 0033; supersedes 0034; supersedes 0035; supersedes 0049; refs 0075; refs 0136 -->

## Status

Accepted

## Context

Both harness boot adapters already forward `wrapper_echo_value` and `arguments_value` byte-for-byte in the invocation envelope. Four fetched cards (`apply`, `archive`, `pr`, `status`) and the shared pickers still recovered the change name by scanning conversation history for a trailing labelled wrapper-echo line. On opencode, `$ARGUMENTS` is not substituted inside fetched card content, so the label was a transport workaround that now conflicts with the envelope-first architecture.

## Decision

1. Shared `change-picker.md` and `status-picker.md` treat trimmed non-empty `arguments_value` as the sole supplied change-name source; retain and forward `wrapper_echo_value` as opaque transport but ignore it for resolution.
2. The four cards read `arguments_value` from the boot envelope; apply/archive parse `--fast-track` before picker invocation; archive has no post-picker strip.
3. All 16 opencode wrappers keep the three-field InvocationEnvelope and drop every trailing labelled argument line; Claude wrappers are untouched; `wrapper_echo_value` remains on the envelope.
4. Six migrated workers and boot adapters stay reference-only for this change.

## Alternatives Considered

- Keep wrapper-echo-first shared pickers — rejected (transport mismatch / flag contamination).
- Drop `wrapper_echo_value` from the envelope — rejected (workers/boot still carry the field).
- Arguments-authoritative shared pickers + label retirement — chosen.

## Consequences

- Installed wrappers may emit inert labels until reinstall.
- Pickers and four cards must land together.
- Structural tests require label absence and envelope forwarding.
- ADRs 0033, 0034, 0035, and 0049 remain immutable and are superseded via this record and the index.

## Related

- `openspec/changes/envelope-only-change-name-resolution/design.md`
- `docs/adr/0033-echo-line-format-and-placement.md` — superseded
- `docs/adr/0034-resolution-precedence-wrapper-echo-first.md` — superseded
- `docs/adr/0035-harness-specific-adapter-carve-out.md` — superseded
- `docs/adr/0049-fast-track-flag-strip-before-change-picker.md` — superseded
- `docs/adr/0075-normalized-invocation-envelope-and-lifecycle-payload.md`
- `docs/adr/0136-opaque-boot-request-and-card-selection-contract.md`
