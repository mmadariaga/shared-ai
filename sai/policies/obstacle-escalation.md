# Obstacle and Escalation

Single source for the two meanings that goal-driven command cards share: stopping on an obstacle with recovery options, and escalating to the user. A card names its own obstacles, its own force majeure, and where it keeps its counters. It restates none of the rules below.

## Obstacle

An obstacle is anything that prevents the card from closing the step or run it is working on: a failing tool, a worker whose result cannot be read, a worker that stays silent or drifts from its instruction, or a check that fails. The goal is to close the step, so respond and keep moving.

Name each obstacle with an identifier and give it a budget of 3 attempts. An attempt is one response with an approach different from the previous one, so repeating an approach is not an attempt. The approaches are:

- a corrected instruction, which includes asking the same worker again when its result is unreadable, it is silent, or it drifted;
- a different correction of the work or a different way to run the failing tool, such as a mechanical repair of a defect that is only mechanical (a repair never adds, removes, or rewrites content);
- a new worker, created when asking the same worker again did not help. It replaces the old one, gets the ready handshake like any new worker, and receives a hand-over summary the card writes itself. Never forward the old worker's history.

A card that keeps run state records each attempt there before it makes it (emitting `attempt` to its run machine), and the state reports what is spent and rejects an attempt as `exhaustion` when the budget is gone. A card without run state keeps the count in the conversation. When the budget is gone, escalate at once. Do not advance to another task first, because a skipped step can break the order the card depends on.

A card names its own obstacles, its identifiers, the approaches that suit it, and where it writes the hand-over of a new worker; the rules of this policy hold for all of them.

## Planned stops

A stop that the card's contract defines is not an obstacle: a literal stop text, an approval or authorization gate, and a stop the user chose, such as a declined confirmation. Each keeps its own text and gets no options and no escalation.

## Force majeure

Force majeure escalates at once, without spending an attempt:

- a change of intent for the request the user made;
- an operation that needs human authorization: push, deletion, shared-system change, a missing credential, or an unavailable external service;
- an exhausted budget;
- any further case the card names.

## Escalate to the user

Escalating is a stop with recovery options. Give both parts in this order.

1. **Stop report.** In plain words, say what happened, what is done and its exact state (files written, staged, or committed), what was tried, and what is pending.
2. **Options.** Ask through the native picker, with options you write, per `@sai/policies/question-context.md`: context before the picker and a short picker. Keep the option count within the picker's capacity. Offer one or more ways to continue, each naming a different approach, and one option that stops the run and leaves everything as it is. Each option names one concrete action, its cost, its effect, and what work or decision stays with the user. Prefer an option the agent carries out over a manual correction. When the evidence favors one option, put it first as the recommended one, with a one-line reason: the safe, viable one that needs the least further human intervention. When the evidence supports only one viable path, state it as the next step with no picker and no filler options.

Base the options on the evidence the card already holds. Offering them widens no read or write scope.

## Answer

A free-text reply is the user's own instruction, not an invalid option. Choosing a way to continue resets that obstacle's counter, and the card carries out the chosen approach. Choosing to stop closes the run. A dismissed question closes the run as escalated and leaves the state as it is; the card says what its closing report holds and whether a closing line prints. A card that keeps run state records the escalation (`escalate`) and the answer (`answer`, with `continue` or `stop`) there.

## Authority

Options are proposals. Choosing one authorizes only that action, inside the gates it already carries: safe-operations confirmations, commit gates, and the card's own authority line stay in force. An option that involves a destructive operation names it so its confirmation fires. This policy grants no new retry, read, or write authority.
