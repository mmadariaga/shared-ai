# ADR 0166c: Overview opt-in is flag presence or gate language selection; omission never synthesizes English

## Status

Accepted

## Context

Change Overview generation previously treated an omitted `--overview-lang` value as an implicit request for English. That conflated the language value with the decision to create an overview, caused a direct design invocation to generate an artifact without an explicit opt-in, and made a later isolated invocation appear to inherit a language choice it never received. The explore crystallization flow already provides a conversation-level place to make an explicit opt-in decision, but that decision must remain invocation-scoped and must not become a persisted language preference.

## Decision

Overview generation requires an effective language selection. The selection is either an explicit `--overview-lang <language>` value on the current invocation or a language selected by explore gate 9 and forwarded as that same flag through the active supervised Auto chain. When the flag is absent, the design worker leaves `overview_language` unresolved and does not synthesize `English`, dispatch the generator, emit overview progress, or write overview lifecycle state merely because the user selected Continue. Fast-track without the flag resolves to do not create (`None`) rather than inventing a generation request. A selected language remains conversation-only and invocation-scoped; it is never read from a prior invocation or persisted as a preference.

## Alternatives Considered

- **Default every omitted language to English** — rejected; omission is not an opt-in and the default creates an artifact the user did not request.
- **Add a separate boolean overview-enable flag** — rejected; the existing language flag already provides an unambiguous selection and opt-in signal.
- **Persist the last selected language** — rejected; isolated commands must be explicit and persisted preference would make generation depend on unrelated prior conversation.
- **Let fast-track generate in English when no language is present** — rejected; fast-track removes questions but never turns an absent opt-in into a generation request.

## Consequences

- Direct design invocations without `--overview-lang` take a no-generation route and retain an unresolved language decision.
- Explore gate 9 is the explicit opt-in surface when the flag is absent; a language forwarded by Auto is equivalent to an explicit flag for the chained design invocation.
- The generator contract, transport, five-field result envelope, and single-file write scope remain unchanged.
- Existing overview files may remain stale when an unopted route makes source changes, but the workflow never claims such an overview is current without verification.

## Related content

- `openspec/changes/opt-in-change-overview/specs/overview-language-flag/spec.md`
- `openspec/changes/opt-in-change-overview/specs/localized-overview-generation/spec.md`
- `openspec/changes/opt-in-change-overview/specs/supervised-pipeline-forwarding/spec.md`
- `sai/commands/design/worker.md`
- ADR 0137c — Change Overview preserves the generation lifecycle and write boundary
