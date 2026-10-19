# Question Rounds

Single source for presenting several independent closed questions as one round. Direct Build's findings selection (`sai/commands/deep-review/findings-selection.md`) and Explore's post-crystallization close (`sai/commands/explore/steps/route-selector.md`) both reference this file; neither restates it.

## Round

A round is one native interaction carrying one or several independent questions. Each question follows `@sai/policies/question-context.md`: the preceding plain text carries the context of every question, and the picker carries the summary question and short options. Questions in a round are independent: no question's presentation waits on another question's answer in the same round.

A **conditional question** is included when its condition can still hold before the round. Its presentation never waits on a same-round answer. After the round, its answer takes effect only when its condition holds; otherwise the answer is recorded as not applicable and authorizes nothing. A question whose condition cannot hold before the round is left out of it.

## Presentation

- **Claude Code:** one `AskUserQuestion` call carrying every question of the round.
- **opencode:** the same questions in one `question` call when the picker accepts several questions, and one call per question, consecutively and in the same order, otherwise. Consecutive calls in the same order form one round.

## Answers

- Collect every answer of the round before acting on any of them.
- Each answer authorizes only its own action. Only an explicit answer authorizes: a missing, cancelled, or ambiguous answer leaves its action pending and never counts as consent for another question.
- Cancelling the whole round leaves every action of that round pending.
- A correction, a clarification, or a failure may add an interaction outside the round; it re-asks only the affected question.
