# ADR 0215: opencode dispose sends the dispose message after a none listing of a warming worker

<!-- adr-index: amends 0213 -->

## Status

Accepted. Amends ADR 0213: its decision 4, which sends the `dispose` message only on a `failed` or `unavailable` status, no longer holds as written. The `dispose` message also follows a `none` status when the worker was warming. The rest of ADR 0213 stays in force.

## Context

ADR 0213 ends a worker's armed cache-warm wait on opencode by removing every running shell of the worker's session with `sai/tools/dispose-shells.js`, and counts a `none` status (no running shell) as a complete dispose. A warming worker can be between the exit of one wait and its re-arm, because each wake re-arms in a new background shell. A listing taken in that gap shows no running shell and returns `none`, so the dispose ends nothing and the worker re-arms afterwards, and keeps warming until `max` minutes pass. The gap was not part of the ADR 0213 checks.

## Decision

1. **A `none` listing of a warming worker is followed by the `dispose` message.** On opencode, when `dispose-shells.js` returns `none`, the coordinator sends the `dispose` message only if the `warming:` line of the worker's last real message was `true`. From then on the worker answers each wake with `ok` and arms nothing. A worker whose last diagnostic was `warming: false`, or that never sent one (for example one that only answered the ready handshake), receives no message.
2. **The coordinator keeps the last diagnostic with the handle.** Each worker's handle carries the `warming:` line of its last real message, in conversation state only, never in the `sai-state` store. A handle lost to a compaction is skipped as before. The dispatcher otherwise keeps no state about the agent's warming (`sai/policies/cache-warming.md`, `sai/policies/worker-lifecycle.md` § Stop call).
3. **Nothing else of the stop changes.** The `removed` status prints no notice and needs no message. A `failed` or `unavailable` status keeps its one-line notice and the `dispose` message. Dispose stays unconditional and the diagnostic gates no stop call. Claude Code keeps `TaskStop` and keeps no diagnostic.

## Alternatives Considered

- **Sending the `dispose` message after every `none` listing** — rejected: the message adds one worker turn to every dispose, and `none` is the common result when warming is off.
- **Keeping ADR 0213 as written and accepting the gap** — rejected: a warming worker would keep arming after its dispose until `max`.

## Consequences

- The coordinator keeps the last `warming:` line per worker handle on opencode.
- A dispose of a worker that is not warming adds no turn.
- A warming worker disposed in the gap costs one reply to the message, and one `ok` for each wake of a wait it armed before, until `max`.
- ADR 0213 is not edited: existing records are never edited in place, so this record carries the amendment.

## Provenance

Change `close-warming-dispose-gaps`, decision "On opencode the dispose message after a none listing is sent only when the last diagnostic was warming: true".
