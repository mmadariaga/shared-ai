# ADR 0189: The first step pointer travels with the task disclosure

<!-- adr-index: amends 0172c; refs 0188 -->

## Status

Accepted

## Context

ADR 0172c delivers each step file just-in-time: the coordinator names the active step in a pointer line on every progress-event continuation. The first step of every step machine is fileless (`follow: none`) and runs from the worker contract plus its `common.md`. Its progress event therefore carries no real progress signal. It only lets the coordinator send the second step's pointer. That relay costs about two coordinator turns per phase in each of the seven step-machine phases (spec, design, implement, review, security, performance, accessibility). In supervised mode these turns run over Explore's long context.

The coordinator already calls `sai-state reset <id> <machineId>` at segment start, and the pointer for the first filed step (the first step whose `follow` is a file) is fixed by the machine definition. It is known before the worker returns anything.

## Decision

1. `sai-state reset` on a linear step machine returns the additive fields `{stage, next: {follow, hint}}` for the machine's first filed step. Other machines keep the `{reset}` response.
2. The coordinator retains that pointer and sends it as the first line of the post-ready task-disclosure continuation, before the task (ADR 0188 keeps the two-phase handshake unchanged).
3. The worker runs the fileless first step inline, follows the disclosed pointer, and reports both step ids in one progress event. If it reports only the first id, the machine returns the same pointer again with no error.
4. Before the first progress event, the worker's `active_step_id` for replacement reconstruction is the first filed step, never the fileless step's `none`.
5. The rule is phase-neutral and stated once in `sai/orchestration/command-runner.md` § Step-gated pointer delivery, `sai/policies/stage-machine.md` § Step machines, and `sai/orchestration/worker-core.md` § Step-machine task disclosure. Step ids and step files do not change.

This amends ADR 0172c decision 2: the fileless first step still runs from the sealed initial surface, but the first pointer now arrives with the task instead of on the first progress continuation. Every other 0172c rule stands: the worker loads only the active step file, and steps are never merged.

## Alternatives Considered

- **A new `sai-state pointer` verb** — rejected: it adds one tool call per segment, while `reset` is already called at segment start.
- **The worker advances itself against `sai-state`** — rejected: the coordinator owns machine state and the panel, and the worker never talks to the store.
- **Merging the first two steps** — rejected: it breaks just-in-time delivery and renames step ids that panels and tests pin.

## Consequences

- Each step-machine phase has one fewer progress event and one fewer coordinator relay turn.
- The panel shows the first step `in_progress` while the worker already works on the second step; both are marked by the first progress event.
- A resolution or prerequisite failure still returns its terminal status before any research, with no progress event.
- In design, the first progress emit still carries `--with-overview`; `research` is the first filed step in both variants, so the disclosed pointer does not depend on the variant.

## Related

- `docs/adr/0172c-step-gated-instruction-delivery.md` — the amended decision
- `docs/adr/0188-subagents-open-with-a-ready-handshake-and-live-per-role.md` — the task-disclosure continuation that now carries the pointer
- `bin/sai-state.js` — `reset` verb
- `sai-state/machines/linear-steps.js`, `sai-state/machines/design-standalone.js` — `firstFiled()`
