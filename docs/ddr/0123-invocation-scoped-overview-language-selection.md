# DDR 0123: Overview language selection is invocation-scoped and never persisted

## Status

Accepted

## Context

The `--overview-lang <language>` option lets one design or supervised explore invocation request localized prose in the Change Overview. Persisting that selection would make later unflagged invocations unexpectedly localized and would add durable lifecycle state for an ephemeral rendering request.

## Decision

The effective overview language belongs only to the current invocation. It is parsed before change resolution, carried through supervised and design-worker envelopes, and defaults to English when absent. It is never written to `.openspec.yaml`, a normative artifact, or a later isolated chat.

## Alternatives Considered

- **Persist the selected language in change metadata** — rejected: a later unflagged invocation would inherit an unexpected preference and every consumer would need to reconcile another durable state field.
- **Keep the language only in the coordinator** — rejected: supervised forwarding and worker-owned generation would lose the value at envelope boundaries.

## Consequences

Each localized generation must receive the flag again after an isolated-chat transition or failed/cancelled retry, while the transport remains explicit and the normative artifact set stays language-neutral. This is a DDR because invocation-scoped language is a property of the pipeline's rendering domain, not merely an implementation detail.

## Provenance

Derived — the design selected the non-persistent transport to avoid durable preference state and preserve isolated invocation semantics.
