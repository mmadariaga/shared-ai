# ADR 0153b: Build mints segment envelopes without boot or wrapper re-entry

<!-- adr-index: refs 0151; refs 0152b; refs 0075 -->

## Status

Accepted

## Context

A composition supervisor must hand each phase a fresh envelope without re-entering harness boot or thin wrappers (which would re-run card selection and shell parse). Implement workers take the original two-field envelope. Apply chained activation already defines a composition-built four-field shape plus session-scoped fast-track. Residual `--fast-track` tokens on `/sai-build` arguments must not poison change-name resolution or join the four-member body-file parse set.

## Decision

Before change resolution, strip every `--fast-track` token from the selected envelope source (wrapper echo when non-empty, otherwise `arguments_value`) in any token order; the cleaned remainder is the change-name input. Stripping confers no parse membership and sets no build-local fast-track state. After one resolution of `{name}`:

- **Implement envelope**: `{wrapper_echo_value: "", arguments_value: "{name}"}`.
- **Apply envelope**: `command_name: apply` (shape compatibility only), `wrapper_echo_value: ""`, `arguments_value: "{name}"`, `continuation_reference` absent/empty at segment start. Normalized fast-track boolean true is supervisor session state injected alongside the envelope, not an additional required envelope key.

Neither segment re-enters boot/wrapper, re-runs change-picker, or re-checks prerequisites after successful phase 1.

## Alternatives Considered

- **Re-enter boot/wrapper per segment** — rejected; fights Isolation continuity and re-runs shell parse.
- **Composition-minted envelopes with pre-resolution flag strip** (chosen) — matches chained-apply extraction and keeps `/sai-build` outside the parse set.

## Consequences

- Change name is resolved once and injected into both segments.
- Explicit `--fast-track` on `/sai-build` is a behavioral no-op for phase order and injection.
- Apply fast-track remains composition-injected only when the apply segment activates.

## Provenance

Codebase-forced — `openspec/changes/sai-build-command/design.md`, Decision D2.
