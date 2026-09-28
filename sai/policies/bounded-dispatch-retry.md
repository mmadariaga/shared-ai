# Bounded Dispatch Retry

Retry rule for a harness-native subagent dispatch (`budget-explorer`,
`budget-subagent`, `budget-executor`, or a generator or audit subagent) that
fails in transport.

## Retryable: transport failures only

A **transport failure** is a dispatch that never started, or was lost before
the subagent did any work:

- a harness-native transport error class, such as `network_error`;
- a transient infrastructure-side rejection of the dispatch call (service
  unavailable, rate-limit shutdown of the transport);
- a dispatch timeout with zero observable agent activity.

Anything a started subagent returns follows the calling surface's own handling,
never this policy: a `failed` or `cancelled` envelope, a verdict or partial
report, a relayed precondition halt, or malformed but delivered output.
Worker-result failures belong to `@sai/policies/bounded-recovery.md` and the
command runner's replacement fallback.

## Retry budget

1. Three attempts per logical dispatch: the first plus two retries.
2. Each retry re-issues the identical prompt through the identical binding and
   output contract. The failure was transport, so the prompt stays exactly as
   written.
3. A main session or coordinator announces each retry in one line naming the
   failure class and the ordinal (`retry 1 of 2`, `retry 2 of 2`). A worker's
   text reaches no one, so a worker retries without announcing.
4. When the third attempt fails, hand over to the calling surface's own failure
   handling and name the failure class and that all three attempts failed. The
   dispatch produced no result: never fabricate, synthesize, or assume one.
5. Retry counts are conversation state only: never persisted to artifacts,
   `.openspec.yaml`, configuration, or worker payloads, and never entered into
   a worker journal or changed-files union.
