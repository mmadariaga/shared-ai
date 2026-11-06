# ADR 0210: Workers are disposed unconditionally by the worker lifecycle

<!-- adr-index: amends 0202 -->

## Status

Accepted. Amends ADR 0202: its rule that a dispatcher disposes only an agent whose latest message declared `warming: true` is retired. ADR 0202, ADR 0188, and archived changes stay unedited.

## Context

ADR 0202 made disposal a part of cache warming. `sai/policies/cache-warming.md` told a dispatcher to dispose only a handle whose latest real message declared `warming: true`, and to do nothing for any other handle. With the `warming` setting off, which is the default, nothing was ever armed, so no coordinator ever stopped a worker, a helper, or a live explorer.

The effect was observed: a Direct Build worker stayed alive for more than 50 minutes on a shell command that never ended. The coordinators also disagreed with each other. The Direct Build coordinator disposed the implementer after Step 2b although Step 5 continues the same implementer. The review coordinator carried a gated rule in its warm-and-dispose section and an ungated rule at its close. The explore route disposed a parked worker unconditionally through its own `TaskStop` wording. The POC implementer had no end rule at all. No worker had a rule against sending a message while a command it launched was still running; only the executor policy had one.

## Decision

1. **Dispose is unconditional.** Every coordinator disposes every worker and helper it creates, whatever the warming setting and whatever the worker's latest `warming` declaration, at four points: the worker's last use, its replacement (before the replacement receives its first message), an abandon or stop (including a question the user dismisses), and the close of the run or segment. A worker with a pending `needs_input` question has not reached its last use and stays alive until the answer arrives. A one-shot helper is disposed after its result. A live explorer is reused between searches and disposed at the route end, on abandon or stop, and at run close. Claude Code and opencode dispose at the same points; only the stop call differs (`TaskStop`; `shell.remove` then `session.interrupt`, with the `dispose` message as fallback).
2. **A new policy, `sai/policies/worker-lifecycle.md`, is the single source of disposal.** Ending a worker no longer depends on loading the warming policy. `cache-warming.md` keeps arming, waking, the window, the warming declaration, `warm-up`, and the hand-off wait, and its Dispose section points to the new policy. A dispose also ends an armed wait, so no second stop follows.
3. **Disposing an already-ended worker is a success; a lost handle is skipped.** An already-ended worker spends no attempt and triggers no retry. Handles stay in conversation state, so a handle lost to a context compaction is skipped and the run outcome does not change. Any other dispose failure prints one notice naming the worker role and the error, and the run continues to its close.
4. **Workers follow a shell rule, kept in the "Worker side" section of `worker-lifecycle.md`.** A worker sends no result, step report, or question while a command it launched is still running: it awaits each background command or ends it first, and reports a command that does not terminate as failed in that same message. The cache-warm wait that an agent arms after its response is exempt. The section lives in the new policy because no existing policy is loaded by every worker, while the agent worker template and the `budget-subagent` agent file reach them all. The executor policy points to the section instead of restating it.
5. **Each coordinator states its own dispose points.** Direct Build disposes the implementer after Step 5, the backfill worker after Step 6, and the archive worker after Step 8, and closes with every worker still alive disposed. The POC implementer is disposed when its Step 2 ends. The audit coordinator disposes its worker at the `completed` result, before the report is verified, so a defect found in that report goes to a new worker or a mechanical repair. The review, implement, plan, spec, design, build, deep-review, commit, merge, archive, and backfill coordinators dispose at their last-use and close points, and a new `/sai-explore` invocation that discards a parked Direct Build slice disposes its live workers before it resets the slice state.
6. **The action keeps the name `dispose`.** The working name `release` of the plan, meant to find leftover gated wording by search, was not used: every dispose wording was edited in place and a final search found no leftover wording that gates a stop on `warming: true`.

## Alternatives Considered

- **Keep the warming-gated dispose and add a separate close-only action** — rejected: two actions with two conditions keep the contradiction between coordinators and leave the default configuration without a stop.
- **Also record live worker handles in the `sai-state` run store** — rejected: it would let disposal survive a context compaction, but it adds store state and events to every coordinator for a case that is rare.
- **Keep the disposal rule inside `cache-warming.md`, rewritten as unconditional** — rejected: ending a worker would still depend on loading the warming policy, and warming is a different concern from the worker's life.
- **Host the shell rule in `remember.md`** — rejected: four worker contracts and the budget helpers do not load it today.

## Consequences

- Handles lost to a context compaction are not disposed, because handles stay in conversation state.
- Every coordinator and worker template loads one more policy file.
- The opencode stop sequence is unchanged. Whether an idle child session with an open background shell ends by itself stays unverified.
- Warming only decides whether a worker's prompt cache stays warm; the lifecycle decides when the worker ends.
- A report defect found after the audit worker was disposed costs a new worker instead of a corrected instruction to the same one.

## Related

- ADR 0202 — amended: disposal no longer depends on a `warming: true` declaration.
- ADR 0188 — ready handshake and live subagents per role, unchanged.
- ADR 0206 — opencode stop sequence, unchanged.
- `sai/policies/worker-lifecycle.md`
- `sai/policies/cache-warming.md`

## Provenance

Change `dispose-workers-unconditionally`, decision "Approach A: unconditional dispose at last use, replacement, abandon or stop, and close, plus worker shell hygiene".
