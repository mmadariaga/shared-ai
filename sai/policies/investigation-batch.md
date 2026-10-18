# Investigation Batch

Rule for how pre-crystallization Explore plans, groups, caps, and closes
executor dispatches. It applies only to executor dispatches that settle an
**investigation question** before crystallization. Every other executor use
(Direct Build gates, the POC lane, other commands) keeps its current behavior,
and `@sai/policies/executor-agent.md` is unchanged.

## Terms

- **Investigation question**: one open uncertainty that Explore tries to settle
  by running commands through an executor before crystallization.
- **Investigation batch**: one executor dispatch that carries every independent
  command an investigation question needs, plus its pre-planned fallbacks.
- **Dispatch cap**: the maximum number of executor dispatches allowed per
  investigation question.

## Plan before dispatching

1. Name the investigation question and list every command it needs.
2. Put every independent command in one investigation batch. Never chain
   independent reads one per dispatch.
3. Plan the fallback for each command that can plausibly fail. A fallback
   travels inside the same batch as a single shell command with its own
   condition (`primary || fallback`), so the executor still runs exactly the
   commands it is given and its no-retry, no-workaround rule holds.
4. Use only known access data. When a credential, tenant, or base URL is
   unknown, take it from project configuration or seed data through a command in
   the batch, or ask the user for it. Never guess a value.

## Dispatch cap

The dispatch cap is 2 executor dispatches per investigation question.

- A dispatch that needs the result of an earlier dispatch is allowed and counts
  toward the cap.
- A retry of an identical prompt after a transport failure
  (`@sai/policies/bounded-dispatch-retry.md`) does not count toward the cap.
- A failed fallback command is reported like any other failure. The executor
  adds no retries beyond those written in the batch.

## Close as soon as a result settles the question

When a result settles the investigation question, report the answer in the next
reply and send no further dispatch for that question.

## When the cap is reached without an answer

Stop dispatching. Report what is established and what is missing, then ask
through the native picker whether to continue, following
`@sai/policies/question-context.md`. When the user approves continuing, that
continuation starts with a fresh dispatch cap.
