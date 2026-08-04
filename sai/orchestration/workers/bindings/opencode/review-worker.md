# Opencode Review Worker Binding

Start exactly one explicit worker with:

`task(subagent_type: "sai-5-review-worker", prompt: "<original InvocationEnvelope and review-worker instruction>")`

Capture `task_id` in coordinator state and expose it only as binding-owned `continuation_reference`. Continue with `task(task_id: "<captured task ID>", prompt: "<selected value>")` using the exact answer. If same-task continuation fails, start at most one replacement task with the original envelope and complete reconstruction fields. Never package artifacts or the prior journal.

Authorize exactly two nested branches: read-only `explore` for source, diff, and glossary research in passes 1-10; and write-capable `budget` only for Pass 11 mechanical mutation I/O. Mutation batches contain at most 5-6 assigned mutations, run sequentially, and return each mutation exactly once with an outcome from `killed`, `survived`, `pre-check-failed`, or `revert-failed`. Never normalize the Pass 11 branch to read-only exploration.
