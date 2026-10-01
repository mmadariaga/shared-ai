# DDR 0162: `received_at` is the CLI response clock; verdicts are timeless

<!-- ddr-index: amends 0140, amends 0141 -->

## Status

Accepted

## Context

DDR 0140 placed the single clock inside the validator verdict as `validated_at`,
and DDR 0141 derived the Milestone Stamp from it. The time describes when the
tool received the invocation, not a property of the validation. As a result
`sai-state reset`, `spawn`, `close`, and plain `emit` responses carry no time,
so a segment's start time is never observable, and the name is wrong wherever
nothing is validated.

## Decision

The time moves from the verdict to the response envelope and is renamed
`received_at`. Every stdout JSON response of `bin/sai-state.js` (all verbs,
machine errors and warnings included) and of `worker-report-validator.js
validate --json` carries `received_at` as its first key, read once per
invocation from one generator, `generateReceivedAt`, exported by the validator
module and loaded by `sai-state` for every verb. The verdict becomes a pure
function of its payload: `{ok, action, kind, errors}`; the `validation` block of
`emit --progress` is that verdict. The format is unchanged (local wall clock,
numeric offset, never `Z`). Usage and IO errors go to stderr with no time.
`validated_at` is removed everywhere with no alias. Worker payloads stay
timeless, the Milestone Stamp stays closure-only and reads `HH:MM` from the
`received_at` of the response that marks the step.

This amends DDR 0140 (field name and placement) and DDR 0141 (stamp source);
the single-clock intent of both and ADR 0144 are unchanged.

## Alternatives Considered

- Hoist the field only in `emit --progress`: leaves two ways to read the clock.
- Wrap the `validate` response as `{validation, at}`: breaks the flat verdict.
- Copy the generator into `sai-state.js`: rejected for a single source.
- Keep the name `validated_at`: wrong on responses that validate nothing.

## Consequences

Every `sai-state` verb now depends on the validator module; a missing validator
exits 2 on every verb, which `doctor` detects. A later change may show elapsed
time from the `reset` time, which would amend 0141's closure-only rule.
